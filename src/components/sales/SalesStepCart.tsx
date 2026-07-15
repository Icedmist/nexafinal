import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Item } from "@/types/inventory";
import type { SalePriceMode } from "./price-utils";
import { getItemPriceForMode } from "./price-utils";
import { useBusiness } from "@/contexts/BusinessContext";
import { cn } from "@/lib/utils";

const NAIRA = "₦";

function fmtNgn(price: number, qty: number = 1): string {
  const ngn = price * qty;
  return `${NAIRA}${ngn.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

export interface CartItem {
  item: Item;
  quantity: number;
  selectedUnit: string;
  cartKey: string;
  saleType?: SalePriceMode;
}

interface SalesStepCartProps {
  items: CartItem[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onNext: () => void;
}

function getUnitConversionFactor(item: Item, unitName: string): number {
  if (unitName === item.unit) return 1;
  const secondaryUnit = item.units?.find((u) => u.name === unitName);
  return secondaryUnit?.conversionFactor ?? 1;
}

export function getCartItemUnitPrice(item: Item, unitName: string, saleType: SalePriceMode = "retail"): number {
  return getItemPriceForMode(item, unitName, saleType);
}

function getAvailableStockForUnit(item: Item, selectedUnitName: string, allCartItems: CartItem[]): number {
  const isVariant = item.variants?.some(v => v.id === selectedUnitName);
  
  if (isVariant) {
    const variant = item.variants!.find(v => v.id === selectedUnitName)!;
    const variantInCart = allCartItems
      .filter((ci) => ci.item.id === item.id && ci.selectedUnit === selectedUnitName)
      .reduce((sum, ci) => sum + ci.quantity, 0);
    return Math.max(0, variant.stock - variantInCart);
  }

  const baseUnitsInCart = allCartItems
    .filter((ci) => ci.item.id === item.id && !ci.item.variants?.some(v => v.id === ci.selectedUnit))
    .reduce((sum, ci) => sum + ci.quantity * getUnitConversionFactor(ci.item, ci.selectedUnit), 0);
  
  const remainingBaseStock = Math.max(0, item.currentStock - baseUnitsInCart);
  const conversionFactor = getUnitConversionFactor(item, selectedUnitName);
  return Math.floor(remainingBaseStock / conversionFactor);
}

export function SalesStepCart({ items, onAdd, onRemove, onClear, onNext }: SalesStepCartProps) {
  const { profile } = useBusiness();
  const businessType = profile?.businessType || "retail";
  const total = items.reduce((s, ci) => s + getCartItemUnitPrice(ci.item, ci.selectedUnit, (ci.saleType as SalePriceMode) ?? "retail") * ci.quantity, 0);
  const totalQty = items.reduce((s, ci) => s + ci.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <div className="rounded-full bg-muted p-5">
          <Trash2 className="h-7 w-7" />
        </div>
        <p className="text-sm font-medium">Cart is empty</p>
        <p className="text-xs">Go back and add some products</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-28 space-y-2">
        {items.map((ci) => {
          const unitPrice = getCartItemUnitPrice(ci.item, ci.selectedUnit, (ci.saleType as SalePriceMode) ?? "retail");
          const isAddDisabled = getAvailableStockForUnit(ci.item, ci.selectedUnit, items) <= 0;

          return (
            <div key={ci.cartKey} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted/50">
                {ci.item.imageUrl ? (
                  <img src={ci.item.imageUrl} alt={ci.item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg">📦</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {(() => {
                  const variant = ci.item.variants?.find(v => v.id === ci.selectedUnit);
                  const hasVariants = !!variant;
                  const displayLabel = hasVariants 
                    ? `${ci.item.name} - ${Object.values(variant.attributes).join(" / ")}`
                    : ci.item.name;

                  return (
                    <>
                      <p className="text-sm font-medium truncate" title={displayLabel}>{displayLabel}</p>
                      <p className="text-xs text-muted-foreground">{fmtNgn(unitPrice)} per {hasVariants ? "unit" : ci.selectedUnit}</p>
                      
                      {/* Custom Fields (only for non-variant products) */}
                      {!hasVariants && ci.item.customFields && Object.keys(ci.item.customFields).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(ci.item.customFields).map(([k, v]) => (
                            <span key={k} className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onRemove(ci.cartKey)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-7 text-center text-sm font-semibold font-mono">{ci.quantity}</span>
                <button
                  type="button"
                  onClick={() => onAdd(ci.cartKey)}
                  disabled={isAddDisabled}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors disabled:opacity-30",
                    businessType === "restaurant"
                      ? "hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-500"
                      : "hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="min-w-16 text-right text-sm font-semibold font-mono">{fmtNgn(unitPrice, ci.quantity)}</p>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-4 space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{totalQty} item{totalQty !== 1 && "s"}</span>
          <span className="font-mono">{NAIRA}{total.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
        </div>
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span className="font-mono">{NAIRA}{total.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
        </div>
        <Button
          onClick={onNext}
          className={cn(
            "w-full",
            businessType === "restaurant" && "bg-emerald-600 hover:bg-emerald-700 text-white"
          )}
          size="lg"
        >
          Proceed to Checkout
        </Button>
        <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={onClear}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear cart
        </Button>
      </div>
    </div>
  );
}
