import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { Pencil, ExternalLink, Trash2, PackageCheck, Clock, Check, Printer, ShoppingCart, Calendar, FileText, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ensureDate } from "@/lib/date-utils";
import { OrderStatus } from "@/types/inventory";
import type { PurchaseOrder, Supplier, Item, StockMovement } from "@/types/inventory";
import { RestockStatusActions } from "./RestockStatusActions";
import { cn } from "@/lib/utils";
import { RestockPrintView } from "./RestockPrintView";

const NAIRA = "₦";

const STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.Draft]: "Draft",
  [OrderStatus.Submitted]: "Submitted",
  [OrderStatus.Partial]: "Partially Received",
  [OrderStatus.Received]: "Fully Received",
  [OrderStatus.Cancelled]: "Cancelled",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  [OrderStatus.Draft]: "bg-muted text-muted-foreground",
  [OrderStatus.Submitted]: "bg-primary/15 text-primary border-primary/20",
  [OrderStatus.Partial]: "bg-amber-accent/15 text-amber-accent border-amber-accent/20",
  [OrderStatus.Received]: "bg-stock-healthy/15 text-stock-healthy border-stock-healthy/20",
  [OrderStatus.Cancelled]: "bg-destructive/15 text-destructive border-destructive/20",
};

interface RestockingDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder | null;
  suppliers: Supplier[];
  items: Item[];
  canEdit: boolean;
  isAdmin: boolean;
  onEdit: (po: PurchaseOrder) => void;
  onDelete: (id: string) => void;
  onReceive?: (po: PurchaseOrder) => void;
  movements?: StockMovement[];
}

export function RestockingDetailSheet({
  open,
  onOpenChange,
  purchaseOrder,
  suppliers,
  items,
  canEdit,
  isAdmin,
  onEdit,
  onDelete,
  onReceive,
  movements = [],
}: RestockingDetailSheetProps) {
  const supplierMap = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s])),
    [suppliers],
  );
  const itemMap = useMemo(
    () => new Map(items.map((i) => [i.id, i])),
    [items],
  );

  // Filter movements by PO reference (must be before early return)
  const poMovements = useMemo(
    () =>
      purchaseOrder
        ? movements
            .filter((m) => m.reference === purchaseOrder.orderNumber)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [],
    [movements, purchaseOrder],
  );

  if (!purchaseOrder) return null;

  const supplier = supplierMap.get(purchaseOrder.supplierId);
  const isDraft = purchaseOrder.status === OrderStatus.Draft;
  const canReceive =
    purchaseOrder.status === OrderStatus.Submitted ||
    purchaseOrder.status === OrderStatus.Partial;
  const showHistory =
    purchaseOrder.status === OrderStatus.Submitted ||
    purchaseOrder.status === OrderStatus.Partial ||
    purchaseOrder.status === OrderStatus.Received;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden nexa-card border-none bg-transparent shadow-none">
        <div className="nexa-card bg-card p-6 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">{purchaseOrder.orderNumber}</DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className={cn("rounded-full font-black uppercase text-[9px] tracking-widest border-2", STATUS_CLASS[purchaseOrder.status])}>
                    {STATUS_LABEL[purchaseOrder.status]}
                  </Badge>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Restocking Reference</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 items-center gap-2">
                 <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 rounded-xl border-2"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" />
                </Button>
                {isDraft && canEdit && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-xl border-2"
                    onClick={() => onEdit(purchaseOrder)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {isDraft && isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="outline" className="h-10 w-10 rounded-xl border-2 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl border-none p-6 nexa-card bg-card">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black">Delete Restocking Order?</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium">
                          Are you sure? This restocking order will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="rounded-xl font-bold border-2">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-black uppercase text-xs tracking-widest px-6"
                          onClick={() => onDelete(purchaseOrder.id)}
                        >
                          Confirm Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-8 pr-1">
            {/* Summary Row */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <DetailField label="Source Supplier" icon={<ExternalLink className="h-3 w-3" />}>
                {supplier ? (
                  <Link
                    to={`/app/suppliers?supplier=${supplier.id}`}
                    className="text-primary font-black hover:underline decoration-2 underline-offset-4"
                  >
                    {supplier.name}
                  </Link>
                ) : <span className="font-bold text-muted-foreground">Unknown</span>}
              </DetailField>

              <DetailField label="Created On" icon={<Calendar className="h-3 w-3" />}>
                <span className="font-mono font-bold text-foreground">
                  {format(ensureDate(purchaseOrder.createdAt), "MMM d, yyyy")}
                </span>
              </DetailField>

              <DetailField label="Exp. Delivery" icon={<Clock className="h-3 w-3" />}>
                <span className="font-mono font-bold text-foreground">
                  {purchaseOrder.expectedDelivery
                    ? format(ensureDate(purchaseOrder.expectedDelivery), "MMM d, yyyy")
                    : <span className="text-muted-foreground/30">—</span>}
                </span>
              </DetailField>
            </div>

            {purchaseOrder.notes && (
              <div className="rounded-2xl bg-muted/10 border-2 border-border/50 p-4">
                 <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Internal Notes</span>
                 </div>
                 <p className="text-sm font-medium italic">{purchaseOrder.notes}</p>
              </div>
            )}

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Order Items ({purchaseOrder.items.length})</h3>
                {canReceive && canEdit && onReceive && (
                  <Button
                    size="sm"
                    className="h-8 rounded-lg font-black uppercase text-[10px] tracking-widest"
                    onClick={() => onReceive(purchaseOrder)}
                  >
                    <PackageCheck className="h-3.5 w-3.5 mr-2" />
                    Receive Shipment
                  </Button>
                )}
              </div>

              <div className="rounded-2xl border-2 border-border overflow-hidden bg-muted/5">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-b-2">
                      <TableHead className="text-[10px] font-black uppercase">Product</TableHead>
                      <TableHead className="w-[80px] text-right text-[10px] font-black uppercase">Ord</TableHead>
                      <TableHead className="w-[80px] text-right text-[10px] font-black uppercase">Rec</TableHead>
                      <TableHead className="w-[100px] text-[10px] font-black uppercase">Progress</TableHead>
                      <TableHead className="w-[100px] text-right text-[10px] font-black uppercase">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrder.items.map((li) => {
                      const item = itemMap.get(li.itemId);
                      const pct = li.quantityOrdered > 0
                        ? Math.round((li.quantityReceived / li.quantityOrdered) * 100)
                        : 0;
                      return (
                        <TableRow key={li.id} className="border-b hover:bg-muted/10 transition-colors">
                          <TableCell>
                            <p className={cn("text-sm font-black text-foreground", !item && "italic text-muted-foreground/60 line-through")}>{item?.name ?? "Deleted Item"}</p>
                            <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase">{item?.sku ?? "—"}</p>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-bold">
                            {li.quantityOrdered}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-bold text-primary">
                            {li.quantityReceived}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted border border-border/50 shadow-inner">
                                <div
                                  className={cn("h-full rounded-full transition-all duration-500 shadow-sm", pct >= 100 ? "bg-emerald-500 shadow-emerald-500/20" : pct > 0 ? "bg-amber-500 shadow-amber-500/20" : "bg-muted-foreground/20")}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              {pct >= 100 && (
                                <div className="h-4 w-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                  <Check className="h-2.5 w-2.5 text-emerald-500" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-black text-foreground">
                            {NAIRA}{(li.quantityOrdered * li.unitCost).toLocaleString("en-NG", { minimumFractionDigits: 0 })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Total Section */}
            <div className="flex flex-col items-end gap-2 px-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Grand Total Amount</p>
              <p className="text-4xl font-black tracking-tighter text-foreground font-mono">
                {NAIRA}{purchaseOrder.totalCost.toLocaleString("en-NG", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>

            {/* Receiving History */}
            {showHistory && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                   <History className="h-4 w-4 text-muted-foreground" />
                   <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Shipment History</h3>
                </div>
                {poMovements.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed p-8 text-center bg-muted/5">
                    <p className="text-xs font-bold text-muted-foreground italic">No shipments recorded for this order</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {poMovements.map((m) => {
                      const item = itemMap.get(m.itemId);
                      return (
                        <div key={m.id} className="flex items-start gap-4 rounded-2xl border-2 border-border bg-muted/5 p-4 hover:bg-muted/10 transition-colors">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Clock className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn("text-sm font-black truncate", !item && "italic text-muted-foreground/60 line-through")}>
                                {item?.name ?? "[Item Deleted]"}
                              </span>
                              <span className="font-mono text-sm font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                                +{m.quantity}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              <span>{m.performedByName || m.performedBy}</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(ensureDate(m.createdAt), { addSuffix: true })}</span>
                            </div>
                            {m.notes && (
                              <p className="mt-2 text-xs font-medium text-muted-foreground bg-muted p-2 rounded-lg border border-border/50">{m.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 mt-6">
              <RestockStatusActions purchaseOrder={purchaseOrder} />
            </div>
          </div>
        </div>

        <RestockPrintView
          purchaseOrder={purchaseOrder}
          supplier={supplier}
          items={itemMap}
        />
      </DialogContent>
    </Dialog>
  );
}

/* ── Helper ─────────────────────────────────────────── */

function DetailField({
  icon,
  label,
  children,
  full,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", full ? "sm:col-span-3" : "")}>
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
        {icon}
        {label}
      </div>
      <div className="text-sm px-1 truncate">{children}</div>
    </div>
  );
}
