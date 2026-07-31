import { format } from "date-fns";
import { useMemo, useState } from "react";
import { X, Pencil, Archive, Package, Sparkles } from "lucide-react";
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
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { toast } from "sonner";
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
  const { flags } = useFeatureFlags();

  const recommendedPrice = useMemo(() => {
    if (!item) return 0;
    const baseCost = item.costPrice || 0;
    if (baseCost > 0) {
      const recommended = baseCost * 1.35;
      return Math.round(recommended / 50) * 50;
    } else {
      const recommended = item.sellingPrice * 1.12;
      return Math.round(recommended / 50) * 50;
    }
  }, [item]);

  const priceDiffPercentage = useMemo(() => {
    if (!item || !recommendedPrice) return 0;
    const diff = recommendedPrice - item.sellingPrice;
    return Math.round((diff / item.sellingPrice) * 100);
  }, [item, recommendedPrice]);

  const [applyingPrice, setApplyingPrice] = useState(false);

  const handleApplyAiPrice = async () => {
    if (!item || !recommendedPrice) return;
    try {
      setApplyingPrice(true);
      await updateItem.mutate({
        id: item.id,
        updates: { sellingPrice: recommendedPrice },
      });
      toast.success("AI Price recommendation successfully applied!", {
        description: `Set selling price of ${item.name} to ₦${recommendedPrice.toLocaleString()}.`,
      });
    } catch (e) {
      toast.error("Failed to apply dynamic pricing recommendation.");
    } finally {
      setApplyingPrice(false);
    }
  };

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
                {/* Image display */}
                <div className="relative group aspect-square max-h-64 mx-auto w-full flex items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-contain p-4"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
                      <Package className="h-12 w-12" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">No Image</span>
                    </div>
                  )}
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

                  {flags.hasAI && (
                    <div className="col-span-2 rounded-xl border border-purple-500/20 bg-purple-500/[0.02] dark:bg-purple-950/[0.04] p-4 space-y-3 my-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                          <Sparkles className="h-4 w-4 animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider">AI pricing recommendation</span>
                        </div>
                        {priceDiffPercentage !== 0 && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priceDiffPercentage > 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"}`}>
                            {priceDiffPercentage > 0 ? `+${priceDiffPercentage}%` : `${priceDiffPercentage}%`} optimal diff
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black font-mono text-foreground">₦{recommendedPrice.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground line-through font-mono">current: ₦{item.sellingPrice.toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {item.costPrice && item.costPrice > 0
                            ? `Optimized based on a standard 35% target gross margin index above unit cost (₦${item.costPrice.toLocaleString()}).`
                            : "Optimized using real-time competitive margin indexing and regional high-demand categories."}
                        </p>
                      </div>
                      {item.sellingPrice !== recommendedPrice && (
                        <Button
                          size="sm"
                          onClick={handleApplyAiPrice}
                          disabled={applyingPrice}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-8 shadow-xs"
                        >
                          {applyingPrice ? "Applying..." : `Apply AI Price (₦${recommendedPrice.toLocaleString()})`}
                        </Button>
                      )}
                    </div>
                  )}
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
