import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useBusiness } from "@/contexts/BusinessContext";


const STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.Draft]: "Draft",
  [OrderStatus.Submitted]: "Submitted",
  [OrderStatus.Partial]: "Partially Received",
  [OrderStatus.Received]: "Fully Received",
  [OrderStatus.Cancelled]: "Cancelled",
};

const schema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  expectedDelivery: z.string().min(1, "Expected delivery date is required"),
  notes: z.string(),
});

type FormValues = z.infer<typeof schema>;

function generatePONumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `PO-${year}-${seq}`;
}

interface PurchaseOrderFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder?: PurchaseOrder | null;
  suppliers: Supplier[];
  items: Item[];
}

export function PurchaseOrderFormSheet({
  open,
  onOpenChange,
  purchaseOrder,
  suppliers,
  items,
}: PurchaseOrderFormSheetProps) {
  const isEdit = !!purchaseOrder;
  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const { user, claims } = useAuth();
  const { storeId } = useBusiness();

  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [lineError, setLineError] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { supplierId: "", expectedDelivery: "", notes: "" },
  });

  useEffect(() => {
    if (open) {
      if (purchaseOrder) {
        form.reset({
          supplierId: purchaseOrder.supplierId,
          expectedDelivery: purchaseOrder.expectedDelivery?.slice(0, 10) ?? "",
          notes: purchaseOrder.notes ?? "",
        });
        setLineItems(
          purchaseOrder.items.map((li) => ({
            id: li.id,
            itemId: li.itemId,
            quantity: li.quantityOrdered,
            unitCost: li.unitCost,
          })),
        );
      } else {
        form.reset({ supplierId: "", expectedDelivery: "", notes: "" });
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
    const poItems: PurchaseOrderItem[] = lineItems.map((r) => ({
      id: r.id,
      purchaseOrderId: "",
      itemId: r.itemId,
      quantityOrdered: r.quantity,
      quantityReceived: 0,
      unitCost: r.unitCost,
    }));
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
          onError: (e) => toast.error(e.message || "Failed to update purchase order."),
        },
      );
    } else {
      const orderNumber = generatePONumber();
      const id = crypto.randomUUID();
      poItems.forEach((p) => (p.purchaseOrderId = id));
      const newPO: PurchaseOrder = {
        id,
        orderNumber,
        supplierId: values.supplierId,
        status: OrderStatus.Draft,
        items: poItems,
        totalCost,
        expectedDelivery: new Date(values.expectedDelivery).toISOString(),
        notes: values.notes,
        createdBy: user?.email || "System",
        storeId: storeId || "",
        branchId: claims?.branchId || null,
        createdAt: now,
        updatedAt: now,
      };

      createPO.mutate(newPO, {
        onSuccess: () => { toast.success(`${orderNumber} created`); onOpenChange(false); },
        onError: (e) => toast.error(e.message || "Failed to create purchase order."),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] p-0 overflow-hidden nexa-card border-none bg-transparent shadow-none">
        <div className="nexa-card bg-card p-6 flex flex-col max-h-[90vh]">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {isEdit ? `Edit ${purchaseOrder?.orderNumber}` : "New Purchase Order"}
                </DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  {isEdit && purchaseOrder ? (
                    <Badge variant="outline" className="rounded-full font-black uppercase text-[9px] tracking-widest border-2">{STATUS_LABEL[purchaseOrder.status]}</Badge>
                  ) : (
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Procurement Workflow</span>
                  )}
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
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">PO Internal Notes</FormLabel>
                      </div>
                      <FormControl><Textarea {...field} rows={2} placeholder="Reference numbers, specific instructions, etc." className="rounded-xl border-2 font-bold resize-none" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1 h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
                    {isEdit ? "Update Order" : "Generate Purchase Order"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-12 font-bold px-6 border-2">
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
