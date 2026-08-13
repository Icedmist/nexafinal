import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useCreatePurchaseOrder, useUpdatePurchaseOrder } from "@/hooks/useInventoryMutations";
import { OrderStatus } from "@/types/inventory";
import type { PurchaseOrder, Supplier, PurchaseOrderItem, Item } from "@/types/inventory";
import { LineItemsEditor, type LineItemRow } from "./LineItemsEditor";
import { LowStockSuggestions } from "./LowStockSuggestions";
import { ShoppingCart, X, Calendar, FileText } from "lucide-react";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useEffectiveBranch } from "@/hooks/useEffectiveBranch";
import { useBusiness } from "@/contexts/BusinessContext";


const STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.Draft]: "Draft",
  [OrderStatus.Submitted]: "Submitted",
  [OrderStatus.Partial]: "Partially Received",
  [OrderStatus.Received]: "Restocked",
  [OrderStatus.Cancelled]: "Cancelled",
};

const schema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  expectedDelivery: z.string().min(1, "Expected delivery date is required"),
  notes: z.string(),
  isInstant: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function generateRONumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `RO-${year}-${seq}`;
}

interface RestockingFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder?: PurchaseOrder | null;
  suppliers: Supplier[];
  items: Item[];
}

export function RestockingFormSheet({
  open,
  onOpenChange,
  purchaseOrder,
  suppliers,
  items,
}: RestockingFormSheetProps) {
  const isEdit = !!purchaseOrder;
  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const { user, claims } = useAuth();
  const { storeId } = useBusiness();
  const { effectiveBranchId, canJumpBranch } = useEffectiveBranch();

  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [lineError, setLineError] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { supplierId: "", expectedDelivery: new Date().toISOString().split("T")[0], notes: "", isInstant: true },
  });

  useEffect(() => {
    if (open) {
      if (purchaseOrder) {
        form.reset({
          supplierId: purchaseOrder.supplierId,
          expectedDelivery: purchaseOrder.expectedDelivery?.slice(0, 10) ?? "",
          notes: purchaseOrder.notes ?? "",
          isInstant: false,
        });
        setLineItems(
          purchaseOrder.items.map((li) => ({
            id: li.id,
            itemId: li.itemId,
            quantity: li.quantityOrdered,
            unitCost: li.unitCost,
            sellingPrice: li.sellingPrice || items.find(i => i.id === li.itemId)?.sellingPrice || 0,
            selectedUnit: li.selectedUnit || items.find(i => i.id === li.itemId)?.unit || "",
            conversionFactor: li.conversionFactor ?? 1,
          })),
        );
      } else {
        form.reset({ supplierId: "", expectedDelivery: new Date().toISOString().split("T")[0], notes: "", isInstant: true });
        setLineItems([]);
      }
      setLineError("");
    }
  }, [open, purchaseOrder, form]);

  function onSubmit(values: FormValues) {
    if (lineItems.length === 0) {
      setLineError("At least one line item is required");
      return;
    }
    if (lineItems.some((r) => !r.itemId)) {
      setLineError("All line items must have an item selected");
      return;
    }
    setLineError("");

    const now = new Date().toISOString();
    const poItems: PurchaseOrderItem[] = lineItems.map((r) => {
      const existing = isEdit ? purchaseOrder?.items.find((li) => li.id === r.id) : undefined;
      return {
        id: r.id,
        purchaseOrderId: "",
        itemId: r.itemId,
        quantityOrdered: r.quantity,
        // Preserve already-received quantities when editing; only instant restocks fill them fully
        quantityReceived: values.isInstant ? r.quantity : (existing?.quantityReceived ?? 0),
        unitCost: r.unitCost,
        sellingPrice: r.sellingPrice,
        selectedUnit: r.selectedUnit,
        conversionFactor: r.conversionFactor,
      };
    });
    const totalCost = poItems.reduce((s, i) => s + i.quantityOrdered * i.unitCost, 0);

    if (isEdit && purchaseOrder) {
      poItems.forEach((p) => (p.purchaseOrderId = purchaseOrder.id));
      updatePO.mutate(
        {
          id: purchaseOrder.id,
          updates: {
            supplierId: values.supplierId,
            expectedDelivery: new Date(values.expectedDelivery).toISOString(),
            notes: values.notes,
            items: poItems,
            totalCost,
            updatedAt: now,
          },
        },
        {
          onSuccess: () => { toast.success(`${purchaseOrder.orderNumber} updated`); onOpenChange(false); },
          onError: (e) => toast.error(e.message || "Failed to update restock order."),
        },
      );
    } else {
      const orderNumber = generateRONumber();
      const id = crypto.randomUUID();
      poItems.forEach((p) => (p.purchaseOrderId = id));
      const newPO: PurchaseOrder = {
        id,
        orderNumber,
        supplierId: values.supplierId,
        status: values.isInstant ? OrderStatus.Received : OrderStatus.Draft,
        items: poItems,
        totalCost,
        expectedDelivery: new Date(values.expectedDelivery).toISOString(),
        notes: values.notes,
        createdBy: user?.email || "System",
        storeId: storeId || "",
        branchId: (canJumpBranch ? effectiveBranchId : claims?.branchId) || null,
        createdAt: now,
        updatedAt: now,
      };

      createPO.mutate({ ...newPO, isInstant: values.isInstant }, {
        onSuccess: () => { 
          toast.success(`${orderNumber} created ${values.isInstant ? "and inventory updated" : ""}`); 
          onOpenChange(false); 
        },
        onError: (e) => toast.error(e.message || "Failed to create restock order."),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[800px] p-0 overflow-hidden border-none shadow-2xl bg-background flex flex-col max-h-[90vh]">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b bg-card flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {isEdit ? `Edit ${purchaseOrder?.orderNumber}` : "Restock Order"}
                </DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  {isEdit && purchaseOrder ? (
                    <Badge variant="outline" className="rounded-full font-black uppercase text-[9px] tracking-widest border-2">{STATUS_LABEL[purchaseOrder.status]}</Badge>
                  ) : (
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inventory Replenishment</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <Form {...form}>
              <form id="restock-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Target Supplier *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl border-2 font-bold">
                              <SelectValue placeholder="Select a supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            {suppliers.filter((s) => s.isActive).map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expectedDelivery"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <div className="flex items-center gap-2 ml-1">
                           <Calendar className="h-3 w-3 text-muted-foreground" />
                           <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expected Arrival *</FormLabel>
                        </div>
                        <FormControl><Input type="date" {...field} className="h-11 rounded-xl border-2 font-mono font-bold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <div className="flex items-center gap-2 ml-1">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Internal Notes</FormLabel>
                      </div>
                      <FormControl><Textarea {...field} rows={2} placeholder="Reference numbers, specific instructions, etc." className="rounded-xl border-2 font-bold resize-none" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isEdit && (
                  <FormField
                    control={form.control}
                    name="isInstant"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 p-3 bg-muted/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider">Instant Restock</FormLabel>
                          <p className="text-[10px] text-muted-foreground">Automatically update stock levels upon saving.</p>
                        </div>
                        <FormControl>
                          <div 
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              field.value ? "bg-primary" : "bg-muted-foreground/30"
                            )}
                            onClick={() => field.onChange(!field.value)}
                          >
                            <span
                              className={cn(
                                "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                                field.value ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <div className="py-2">
                  <Separator className="h-0.5" />
                </div>

                {!isEdit && (
                  <div className="rounded-2xl border-2 border-dashed p-4 bg-muted/5">
                    <LowStockSuggestions
                      items={items}
                      supplierId={form.watch("supplierId")}
                      lineItems={lineItems}
                      onAdd={(row) => setLineItems((prev) => [...prev, row])}
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Order Line Items</h3>
                  <LineItemsEditor
                    items={items}
                    lineItems={lineItems}
                    onChange={setLineItems}
                    error={lineError}
                  />
                </div>
                </form>
            </Form>
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-muted/10 flex items-center justify-between">
            <div className="hidden sm:block">
              {lineItems.length > 0 && (
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {lineItems.length} items selected
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)} 
                className="flex-1 sm:flex-none rounded-xl font-bold"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                form="restock-form"
                disabled={createPO.isLoading || updatePO.isLoading}
                className="flex-1 sm:flex-none rounded-xl font-bold px-8 shadow-lg shadow-primary/20"
              >
                {createPO.isLoading || updatePO.isLoading ? "Saving..." : isEdit ? "Update Order" : "Save Restock Order"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
