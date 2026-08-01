import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRightLeft, X, Box, MapPin, Package, BadgeDollarSign, HandCoins, User } from "lucide-react";
import { toast } from "sonner";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useItems, useLocations } from "@/hooks/useInventoryData";
import { useCreateMovement } from "@/hooks/useInventoryMutations";
import { useSalesMutations } from "@/hooks/useSalesData";
import { useManagerCollections } from "@/hooks/useManagerCollections";
import { useStaff } from "@/hooks/useStaffData";
import { MovementType, ItemStatus } from "@/types/inventory";
import type { Item } from "@/types/inventory";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";

const NAIRA = "₦";

const schema = z.object({
  itemId: z.string().min(1, "Select an item"),
  fromLocationId: z.string().min(1, "Select source location"),
  toLocationId: z.string().min(1, "Select destination location"),
  quantity: z.coerce.number().int().min(1, "Minimum 1"),
  priceMode: z.enum(["predefined", "custom"]),
  unitPrice: z.coerce.number().min(0, "Enter a valid transfer price"),
  amountReceived: z.coerce.number().min(0, "Enter the amount received"),
  receiverManagerId: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface TransferStockSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedItemId?: string;
}

export function TransferStockSheet({
  open,
  onOpenChange,
  preselectedItemId,
}: TransferStockSheetProps) {
  const { data: items } = useItems();
  const { data: locations } = useLocations();
  const createMovement = useCreateMovement();
  const { addSale } = useSalesMutations();
  const { createCollection } = useManagerCollections();
  const { data: staffMembers } = useStaff();
  const { storeId, profile } = useBusiness();
  const { user } = useAuth();

  const availableManagers = useMemo(() => {
    if (staffMembers && staffMembers.length > 0) {
      return staffMembers.map((m) => ({
        id: m.uid,
        name: m.displayName || m.email,
        role: m.role,
      }));
    }
    return [
      { id: "u2", name: "Sarah Manager", role: "manager" as const },
      { id: "u5", name: "Alice Clerk", role: "manager" as const },
      { id: "u3", name: "Dave Staff", role: "manager" as const },
    ];
  }, [staffMembers]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      itemId: preselectedItemId ?? "",
      fromLocationId: "",
      toLocationId: "",
      quantity: 1,
      priceMode: "predefined",
      unitPrice: 0,
      amountReceived: 0,
      receiverManagerId: "",
    },
  });

  const selectedItemId = form.watch("itemId");
  const fromLocationId = form.watch("fromLocationId");
  const quantity = form.watch("quantity");
  const priceMode = form.watch("priceMode");
  const amountReceived = form.watch("amountReceived");

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId),
    [items, selectedItemId],
  );

  const predefinedPrice = useMemo(() => {
    if (!selectedItem) return 0;
    return Number(
      selectedItem.sellingPrice ?? selectedItem.wholesalePrice ?? selectedItem.costPrice ?? 0,
    );
  }, [selectedItem]);

  const effectiveUnitPrice =
    priceMode === "predefined" ? predefinedPrice : Number(form.watch("unitPrice")) || 0;
  const totalValue = effectiveUnitPrice * Number(quantity || 0);

  const receivedAmount = Number(amountReceived) || 0;
  const paidAmount = Math.min(Math.max(receivedAmount, 0), totalValue);
  const remainingDebt = Math.max(0, totalValue - paidAmount);
  const isIncompletePayment = totalValue > 0 && remainingDebt > 0;

  // Items that have a location assigned
  const assignedItems = useMemo(
    () => items.filter((i) => i.locationId),
    [items],
  );

  const maxQty = selectedItem?.currentStock ?? 0;

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(values: FormValues) {
    if (values.fromLocationId === values.toLocationId) {
      form.setError("toLocationId", {
        message: "Destination must differ from source",
      });
      return;
    }

    if (values.quantity > maxQty) {
      form.setError("quantity", {
        message: `Only ${maxQty} available`,
      });
      return;
    }

    const unitPriceValue =
      values.priceMode === "predefined" ? predefinedPrice : Number(values.unitPrice) || 0;
    const transferValue = unitPriceValue * values.quantity;
    const received = Math.min(Math.max(Number(values.amountReceived) || 0, 0), transferValue);
    const debt = Math.max(0, transferValue - received);
    const isIncomplete = transferValue > 0 && debt > 0;

    if (isIncomplete && !values.receiverManagerId) {
      form.setError("receiverManagerId", {
        message: "Select the receiving manager for the outstanding debt",
      });
      return;
    }

    const fromLoc = locations.find((l) => l.id === values.fromLocationId);
    const toLoc = locations.find((l) => l.id === values.toLocationId);
    if (!selectedItem || !fromLoc || !toLoc) return;

    setIsSubmitting(true);

    try {
      // 1. Record the transfer as a manager-to-manager sale: the source manager
      // sells the goods to the destination manager's branch. If the amount
      // received is less than the total value, the shortfall is flagged as an
      // incomplete payment (credit sale) and becomes manager debt.
      await addSale({
        customerName: `${toLoc.name} (Manager Transfer)`,
        customerPhone: "",
        items: [
          {
            itemId: values.itemId,
            itemName: selectedItem.name,
            sku: selectedItem.sku || "",
            quantity: values.quantity,
            unitPriceNgn: unitPriceValue,
            selectedUnit: "unit",
          },
        ],
        totalNgn: transferValue,
        subtotalNgn: transferValue,
        paymentMethod: "transfer",
        saleType: "wholesale",
        isCreditSale: isIncomplete,
        paymentStatus: isIncomplete ? "incomplete" : "paid",
        amountPaidNgn: received,
        createdAt: new Date().toISOString(),
      });

      // 2. When the payment is incomplete, log the destination manager's
      // collection so the outstanding value shows up in the manager debt
      // tracking system.
      if (isIncomplete) {
        const receiver = availableManagers.find((m) => m.id === values.receiverManagerId);
        if (receiver) {
          await createCollection({
            managerId: receiver.id,
            managerName: receiver.name,
            storeId: storeId ?? "",
            storeName: profile?.storeDetails?.name,
            items: [
              {
                itemId: values.itemId,
                itemName: selectedItem.name,
                sku: selectedItem.sku || "",
                quantityCollected: values.quantity,
                unitPriceNgn: unitPriceValue,
              },
            ],
            collectionDate: new Date().toISOString(),
            notes: `Stock transfer: ${fromLoc.name} → ${toLoc.name}`,
            debtPayments: [],
            initialCashRemittedNgn: received,
          });
        }
      }

      // 3. Log the inter-location transfer movement with its price.
      createMovement.mutate(
        {
          itemId: values.itemId,
          type: MovementType.Transferred,
          quantity: values.quantity,
          fromLocationId: values.fromLocationId,
          toLocationId: values.toLocationId,
          unitPrice: unitPriceValue,
          value: transferValue,
          reference: `Transfer: ${fromLoc.name ?? ""} → ${toLoc.name ?? ""}`,
          notes: `Manager-to-manager sale · ${values.quantity} × ${NAIRA}${unitPriceValue.toLocaleString("en-NG")} · received ${NAIRA}${received.toLocaleString("en-NG")}${isIncomplete ? ` · debt ${NAIRA}${debt.toLocaleString("en-NG")}` : ""}`,
          performedBy: user?.email || "System",
          createdAt: new Date().toISOString(),
        },
        {
          onSuccess: async () => {
            // 4. Sync catalog: deduct stock from source, add to destination.
            try {
              // Deduct from source item
              const sourceRef = doc(db, "products", values.itemId);
              await updateDoc(sourceRef, {
                currentStock: increment(-values.quantity),
                updatedAt: new Date().toISOString(),
              });

              // Check if the item already exists at the destination location
              const destQuery = query(
                collection(db, "products"),
                where("storeId", "==", storeId ?? ""),
                where("locationId", "==", values.toLocationId),
                where("sku", "==", selectedItem!.sku),
              );
              const destSnap = await getDocs(destQuery);

              if (!destSnap.empty) {
                // Item exists at destination — just increment stock
                const existingRef = destSnap.docs[0].ref;
                await updateDoc(existingRef, {
                  currentStock: increment(values.quantity),
                  updatedAt: new Date().toISOString(),
                });
              } else {
                // Item doesn't exist at destination — clone it with destination locationId
                const newItemRef = doc(collection(db, "products"));
                const now = new Date().toISOString();
                const cloned: Record<string, unknown> = {
                  ...selectedItem,
                  id: newItemRef.id,
                  locationId: values.toLocationId,
                  branchId: toLoc.branchId ?? null,
                  currentStock: values.quantity,
                  storeId: storeId ?? "",
                  ownerId: user?.uid ?? "",
                  createdAt: now,
                  updatedAt: now,
                };
                // Remove undefined values to keep Firestore happy
                Object.keys(cloned).forEach((k) => {
                  if (cloned[k] === undefined) delete cloned[k];
                });
                await setDoc(newItemRef, cloned);
              }
            } catch (syncErr) {
              console.error("Catalog sync failed:", syncErr);
              toast.warning("Stock moved but catalog sync failed — please check manually.");
            }

            setIsSubmitting(false);
            toast.success(
              isIncomplete
                ? `Stock transferred · ${NAIRA}${received.toLocaleString("en-NG")} received, ${NAIRA}${debt.toLocaleString("en-NG")} recorded as manager debt`
                : "Stock transferred and fully paid",
            );
            form.reset();
            onOpenChange(false);
          },
          onError: (e) => {
            setIsSubmitting(false);
            toast.error(e.message || "Transfer recorded, but movement log failed");
          },
        },
      );
    } catch (err) {
      setIsSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Failed to record transfer");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden">
        <div className="nexa-card bg-card p-6 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ArrowRightLeft className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">Stock Transfer</DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Internal Logistics</span>
                </div>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="rounded-full p-2 hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Item */}
                <FormField
                  control={form.control}
                  name="itemId"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5 px-1">
                      <div className="flex items-center gap-2 ml-1">
                        <Box className="h-3 w-3 text-muted-foreground" />
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Product to Move</FormLabel>
                      </div>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
                          // Auto-fill from location
                          const item = items.find((i) => i.id === v);
                          if (item?.locationId) {
                            form.setValue("fromLocationId", item.locationId);
                          }
                          // Default the transfer price to the product's predefined price
                          const predefined = Number(
                            item?.sellingPrice ?? item?.wholesalePrice ?? item?.costPrice ?? 0,
                          );
                          form.setValue("unitPrice", predefined);
                          form.setValue("priceMode", "predefined");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-2 font-bold">
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {assignedItems.map((item) => (
                            <SelectItem key={item.id} value={item.id} className="font-bold">
                              {item.name} <span className="ml-2 font-mono text-[10px] opacity-60">({item.sku})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 px-1">
                  {/* From Location */}
                  <FormField
                    control={form.control}
                    name="fromLocationId"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <div className="flex items-center gap-2 ml-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source</FormLabel>
                        </div>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl border-2 font-bold">
                              <SelectValue placeholder="Origin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            {locations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id} className="font-bold">
                                {loc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* To Location */}
                  <FormField
                    control={form.control}
                    name="toLocationId"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <div className="flex items-center gap-2 ml-1">
                          <MapPin className="h-3 w-3 text-primary" />
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destination</FormLabel>
                        </div>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl border-2 font-bold border-primary/20">
                              <SelectValue placeholder="Target" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            {locations
                              .filter((l) => l.id !== fromLocationId)
                              .map((loc) => (
                                <SelectItem key={loc.id} value={loc.id} className="font-bold">
                                  {loc.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Quantity */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5 px-1">
                      <div className="flex items-center justify-between ml-1">
                        <div className="flex items-center gap-2">
                           <Package className="h-3 w-3 text-muted-foreground" />
                           <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Transfer Quantity</FormLabel>
                        </div>
                        {selectedItem && (
                          <span className="text-[10px] font-bold text-muted-foreground">Max Avail: {maxQty}</span>
                        )}
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={maxQty}
                          {...field}
                          className="h-11 rounded-xl border-2 font-mono font-black"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Prices — transfers are sales between managers */}
                <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <BadgeDollarSign className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Transfer Price
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground">Use predefined price</p>
                      <p className="text-[10px] text-muted-foreground/70">
                        {selectedItem ? `${NAIRA}${predefinedPrice.toLocaleString("en-NG")} per unit` : "Select a product first"}
                      </p>
                    </div>
                    <Switch
                      checked={priceMode === "predefined"}
                      onCheckedChange={(checked) => {
                        form.setValue("priceMode", checked ? "predefined" : "custom");
                        if (checked) form.setValue("unitPrice", predefinedPrice);
                      }}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="unitPrice"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold text-muted-foreground">
                          Unit Price ({NAIRA})
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            disabled={priceMode === "predefined"}
                            {...field}
                            className="h-11 rounded-xl border-2 font-mono font-black disabled:opacity-60"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3 border-2 border-dashed border-primary/20">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Total Transfer Value
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">
                        Auto-calculated as quantity changes
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono font-black text-lg text-primary">
                        {NAIRA}{totalValue.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                      </span>
                      {isIncompletePayment && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600">
                          <HandCoins className="h-2.5 w-2.5" />
                          Incomplete payment · {NAIRA}{remainingDebt.toLocaleString("en-NG", { minimumFractionDigits: 2 })} outstanding
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment — editable amount received, shortfall becomes debt */}
                <div className="rounded-2xl border-2 border-muted bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <HandCoins className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Amount Received
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Enter the final amount actually received from the destination
                    manager. Any shortfall is marked as an incomplete payment and
                    recorded automatically as manager debt.
                  </p>
                  <FormField
                    control={form.control}
                    name="amountReceived"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold text-muted-foreground">
                          Amount Received ({NAIRA})
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={totalValue}
                            step={0.01}
                            {...field}
                            className="h-11 rounded-xl border-2 font-mono font-black"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3 border-2 border-dashed border-muted">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {isIncompletePayment ? "Remaining Debt" : "Payment Status"}
                    </span>
                    {isIncompletePayment ? (
                      <span className="font-mono font-black text-base text-amber-600">
                        {NAIRA}{remainingDebt.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600">
                        Fully Paid
                      </span>
                    )}
                  </div>
                  {isIncompletePayment && (
                    <FormField
                      control={form.control}
                      name="receiverManagerId"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <div className="flex items-center gap-2 ml-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Receiving Manager (for the debt)
                            </FormLabel>
                          </div>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl border-2 font-bold">
                                <SelectValue placeholder="Select manager" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              {availableManagers.map((m) => (
                                <SelectItem key={m.id} value={m.id} className="font-bold">
                                  {m.name} <span className="ml-2 text-[10px] opacity-60 uppercase">({m.role})</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="flex flex-col gap-3 pt-4 px-1">
                  <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20" disabled={createMovement.isLoading || isSubmitting}>
                    {createMovement.isLoading || isSubmitting ? "Processing..." : "Confirm Stock Transfer"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full h-11 rounded-xl font-bold text-muted-foreground">
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
