import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Clock, Package, Pencil, ExternalLink, X, Building2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { SupplierOrderHistory } from "@/components/suppliers/SupplierOrderHistory";
import { SupplierPerformance } from "@/components/suppliers/SupplierPerformance";
import { SupplierDeleteDialog } from "@/components/suppliers/SupplierDeleteDialog";
import type { Supplier, Item, PurchaseOrder } from "@/types/inventory";

interface SupplierDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  items: Item[];
  purchaseOrders: PurchaseOrder[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (s: Supplier) => void;
  onDelete: (id: string) => void;
}

const MAX_LINKED = 10;

export function SupplierDetailSheet({
  open,
  onOpenChange,
  supplier,
  items,
  purchaseOrders,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: SupplierDetailSheetProps) {
  const linkedItems = useMemo(() => {
    if (!supplier) return [];
    return items.filter((i) => i.supplierId === supplier.id);
  }, [items, supplier]);

  if (!supplier) return null;

  const displayed = linkedItems.slice(0, MAX_LINKED);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden nexa-card border-none bg-transparent shadow-none">
        <div className="nexa-card bg-card p-6 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">{supplier.name}</DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={supplier.isActive ? "active" : "inactive"} />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Supplier ID: #{supplier.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 items-center gap-2">
                {canDelete && (
                  <SupplierDeleteDialog
                    supplier={supplier}
                    items={items}
                    purchaseOrders={purchaseOrders}
                    onDelete={(id) => { onDelete(id); onOpenChange(false); }}
                  />
                )}
                {canEdit && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-xl border-2"
                    onClick={() => {
                      onOpenChange(false);
                      onEdit(supplier);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <button onClick={() => onOpenChange(false)} className="rounded-full p-2 hover:bg-muted transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-8 pr-1">
            {/* ── Detail grid ──────────────────────────── */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <DetailField icon={<Mail className="h-4 w-4" />} label="Email Address">
                {supplier.email ? (
                  <a href={`mailto:${supplier.email}`} className="text-primary font-black hover:underline decoration-2 underline-offset-4">
                    {supplier.email}
                  </a>
                ) : <span className="text-muted-foreground/30">—</span>}
              </DetailField>

              <DetailField icon={<Phone className="h-4 w-4" />} label="Phone Number">
                {supplier.phone ? (
                  <a href={`tel:${supplier.phone}`} className="text-primary font-black hover:underline decoration-2 underline-offset-4 font-mono">
                    {supplier.phone}
                  </a>
                ) : <span className="text-muted-foreground/30">—</span>}
              </DetailField>

              <DetailField label="Main Contact Person">
                <span className="font-bold">{supplier.contactName || "—"}</span>
              </DetailField>

              <DetailField icon={<Clock className="h-4 w-4" />} label="Estimated Lead Time">
                <span className="font-mono font-black text-primary">{supplier.leadTimeDays} Days</span>
              </DetailField>

              <DetailField icon={<MapPin className="h-4 w-4" />} label="Physical Address" full>
                <span className="font-medium">{supplier.address || "—"}</span>
              </DetailField>

              {supplier.notes && (
                <DetailField label="Internal Relationship Notes" full>
                  <p className="text-sm font-medium italic text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/50">{supplier.notes}</p>
                </DetailField>
              )}
            </div>

            {/* ── Linked Items ─────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Linked Items ({linkedItems.length})
                  </h3>
                </div>
                {linkedItems.length > MAX_LINKED && (
                  <Link
                    to="/app/catalog"
                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                  >
                    View All
                  </Link>
                )}
              </div>

              {linkedItems.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed p-8 text-center bg-muted/5">
                  <p className="text-xs font-bold text-muted-foreground italic">No items currently linked to this supplier</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {displayed.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border-2 border-border/50 bg-muted/10 p-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-sm text-foreground truncate">{item.name}</p>
                        <p className="font-mono text-[10px] font-bold text-muted-foreground mt-0.5">{item.sku}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-mono text-sm font-black text-foreground">
                            {item.currentStock}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.unit}</p>
                        </div>
                        <StatusBadge status={item.currentStock <= 0 ? "out-of-stock" : item.currentStock <= item.reorderPoint ? "low-stock" : "in-stock"} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Performance ───────────────────────── */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-1 overflow-hidden">
               <SupplierPerformance purchaseOrders={purchaseOrders} supplierId={supplier.id} />
            </div>

            {/* ── Order History ────────────────────────── */}
            <div className="rounded-2xl border border-border bg-muted/10 p-1">
              <SupplierOrderHistory purchaseOrders={purchaseOrders} supplierId={supplier.id} />
            </div>
          </div>
        </div>
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
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
        {icon}
        {label}
      </div>
      <div className="text-sm px-1">{children}</div>
    </div>
  );
}

