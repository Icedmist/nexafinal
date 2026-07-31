import { format } from "date-fns";
import { X, Pencil, Archive, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { PermissionGate } from "@/hooks/usePermissions";
import { MovementTimeline } from "@/components/catalog/MovementTimeline";
import { BarcodeDisplay } from "@/components/catalog/BarcodeDisplay";
import { QRCodeDialog } from "@/components/catalog/QRCodeDialog";
import { CustomFieldsTab } from "@/components/catalog/CustomFieldsTab";
import { useMovements } from "@/hooks/useInventoryData";
import { useItemHistory } from "@/hooks/useItemHistory";
import { usePermissions } from "@/hooks/usePermissions";
import { useUpdateItem } from "@/hooks/useInventoryMutations";
import { QrCode } from "lucide-react";
import type { Item, Category, Supplier, Location } from "@/types/inventory";

type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

function stockStatus(item: Item): StockStatus {
  if (item.currentStock === 0) return "out-of-stock";
  if (item.currentStock <= item.reorderPoint) return "low-stock";
  return "in-stock";
}

function stockColor(item: Item) {
  const s = stockStatus(item);
  if (s === "out-of-stock") return "text-stock-out";
  if (s === "low-stock") return "text-stock-low";
  return "text-stock-healthy";
}

interface ItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null | undefined;
  categories: Category[];
  suppliers: Supplier[];
  locations: Location[];
  onEdit?: (item: Item) => void;
  onArchive?: (item: Item) => void;
}

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function DetailRow({ label, value, mono }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
      <span className={mono ? "font-mono text-sm font-medium" : "text-sm font-medium"}>{value || "—"}</span>
    </div>
  );
}

export function ItemDetailSheet({
  open,
  onOpenChange,
  item,
  categories,
  suppliers,
  locations,
  onEdit,
  onArchive,
}: ItemDetailSheetProps) {
  const { data: movements, isLoading: movementsLoading } = useMovements();
  const { data: history, isLoading: historyLoading } = useItemHistory(item?.id || "");
  const { can } = usePermissions();
  const updateItem = useUpdateItem();

  if (!item) return null;

  const category = categories.find((c) => c.id === item.categoryId);
  const supplier = suppliers.find((s) => s.id === item.supplierId);
  const location = locations.find((l) => l.id === item.locationId);
  const status = stockStatus(item);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden">
        <div className="nexa-card bg-card flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-xl font-black tracking-tight text-foreground">{item.name}</DialogTitle>
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusBadge status={status} />
                  <StatusBadge status={item.status} />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <PermissionGate permission="edit_item">
                  <QRCodeDialog
                    item={item}
                    trigger={
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-2" title="Generate QR Code">
                        <QrCode className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-2" onClick={() => onEdit?.(item)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-2 text-destructive hover:bg-destructive/10" onClick={() => onArchive?.(item)} aria-label="Archive">
                    <Archive className="h-4 w-4" />
                  </Button>
                </PermissionGate>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => onOpenChange(false)} aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto">
            {/* Tabs */}
            <Tabs defaultValue="overview" className="px-6 pt-4 pb-8">
              <TabsList className="w-full h-11 bg-muted/50 p-1 rounded-2xl border border-border/50">
                <TabsTrigger value="overview" className="flex-1 rounded-xl font-bold text-xs uppercase tracking-widest">Overview</TabsTrigger>
                <TabsTrigger value="history" className="flex-1 rounded-xl font-bold text-xs uppercase tracking-widest">History</TabsTrigger>
                <TabsTrigger value="custom" className="flex-1 rounded-xl font-bold text-xs uppercase tracking-widest">Custom</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                {/* Image placeholder */}
                <div className="flex h-40 items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-muted/20">
                  <Package className="h-12 w-12 text-muted-foreground/30" />
                </div>

                {/* Quantity hero */}
                <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 text-center shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-2 w-full bg-primary/10" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Available Quantity</p>
                  <p className={`font-mono text-5xl font-black tracking-tighter ${stockColor(item)}`}>
                    {item.currentStock}
                  </p>
                  <p className="mt-1 text-xs font-bold text-muted-foreground uppercase">{item.unit}</p>
                </div>

                {/* Detail grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-6 px-2">
                  <DetailRow label="SKU Number" value={item.sku} mono />
                  <DetailRow label="Product Category" value={category?.name} />
                  <DetailRow label="Storage Location" value={location?.name} />
                  <DetailRow label="Preferred Supplier" value={supplier?.name} />
                  <DetailRow label="Cost Price" value={`₦${item.costPrice.toLocaleString("en-NG")}`} mono />
                  <DetailRow label="Selling Price" value={`₦${item.sellingPrice.toLocaleString("en-NG")}`} mono />
                  <DetailRow label="Reorder Point" value={item.reorderPoint} />
                  <DetailRow label="Reorder Qty" value={item.reorderQuantity} />
                  <div className="col-span-2">
                    <DetailRow label="Description" value={item.description} />
                  </div>
                </div>

                {/* Barcode */}
                <div className="pt-2">
                  <BarcodeDisplay
                    barcode={item.barcode}
                    itemName={item.name}
                    sku={item.sku}
                    location={location?.name}
                    onBarcodeChange={(value) => updateItem.mutate({ id: item.id, updates: { barcode: value } })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <div className="rounded-lg border bg-card/50">
                  <div className="p-4 border-b">
                    <h3 className="text-sm font-semibold">Activity & Sales History</h3>
                  </div>
                  <div className="p-2">
                    <MovementTimeline history={history} itemId={item.id} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="custom" className="mt-6">
                <div className="rounded-2xl border border-border p-4 bg-muted/10">
                  <CustomFieldsTab
                    customFields={item.customFields}
                    onUpdate={(fields) => updateItem.mutate({ id: item.id, updates: { customFields: fields } })}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
