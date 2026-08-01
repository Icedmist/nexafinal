import { useState } from "react";
import { Minus, Plus, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Item } from "@/types/inventory";
import type { SalePriceMode } from "./price-utils";
import { getItemPriceForMode, getConfigPrice, summarizeConfig } from "./price-utils";
import { useBusiness } from "@/contexts/BusinessContext";
import { useRole } from "@/hooks/useRole";
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
  customPrice?: number;
  configString?: string;
}

interface SalesStepCartProps {
  items: CartItem[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onSetQuantity?: (cartKey: string, qty: number) => void;
  onUpdateCustomPrice?: (cartKey: string, price: number | null) => void;
  onClear: () => void;
  onNext: () => void;
  packagingFee?: number;
  estimatedReadyTime?: number;
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

    const available = (variant.stock ?? 0) - variantInCart;
    return Math.max(0, available);
  }

  const baseUnitStock = item.currentStock ?? 0;
  const totalBaseUnitsInCart = allCartItems
    .filter((ci) => ci.item.id === item.id)
    .reduce((sum, ci) => {
      const factor = getUnitConversionFactor(ci.item, ci.selectedUnit);
      return sum + ci.quantity * factor;
    }, 0);

  const availableBaseUnits = baseUnitStock - totalBaseUnitsInCart;
  const currentConversionFactor = getUnitConversionFactor(item, selectedUnitName);

  if (currentConversionFactor <= 0) return 0;
  return Math.max(0, Math.floor(availableBaseUnits / currentConversionFactor));
}

export function SalesStepCart({ items, onAdd, onRemove, onSetQuantity, onUpdateCustomPrice, onClear, onNext, packagingFee = 0, estimatedReadyTime = 0 }: SalesStepCartProps) {
  const { profile } = useBusiness();
  const { isAdmin, isManager } = useRole();
  const businessType = profile?.businessType || "retail";

  // Price editing at checkout requires platform admin approval (locked by default).
  // Admins and managers may edit prices; regular staff only when unlocked.
  const isPriceEditingLocked = profile?.settings?.lockPriceAtCheckout ?? profile?.storeDetails?.lockPriceAtCheckout ?? true;
  const canEditPrice = !isPriceEditingLocked || isAdmin || isManager;

  const [editingCartKey, setEditingCartKey] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState<string>("");

  const [editingPriceCartKey, setEditingPriceCartKey] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>("");

  const total = items.reduce(
    (sum, ci) =>
      sum +
      (ci.customPrice ?? (ci.configString ? getConfigPrice(ci.item, ci.configString) : getCartItemUnitPrice(ci.item, ci.selectedUnit, (ci.saleType as SalePriceMode) ?? "retail"))) *
        ci.quantity,
    0
  ) + packagingFee;
  const totalQty = items.reduce((sum, ci) => sum + ci.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <p className="text-base font-semibold">Your cart is empty</p>
        <p className="text-xs">Go back and add some products</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-28 space-y-2">
        {items.map((ci) => {
          const baseUnitPrice = ci.configString
            ? getConfigPrice(ci.item, ci.configString)
            : getCartItemUnitPrice(ci.item, ci.selectedUnit, (ci.saleType as SalePriceMode) ?? "retail");
          const effectiveUnitPrice = ci.customPrice ?? baseUnitPrice;
          const isAddDisabled = getAvailableStockForUnit(ci.item, ci.selectedUnit, items) <= 0;
          const configSummary = ci.configString ? summarizeConfig(ci.configString) : null;

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
                      
                      {editingPriceCartKey === ci.cartKey ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-muted-foreground">{NAIRA}</span>
                          <input
                            type="number"
                            autoFocus
                            min={0}
                            step="any"
                            value={editingPriceValue}
                            onChange={(e) => setEditingPriceValue(e.target.value)}
                            onBlur={() => {
                              const parsed = parseFloat(editingPriceValue);
                              if (!isNaN(parsed) && parsed >= 0 && parsed !== baseUnitPrice) {
                                onUpdateCustomPrice?.(ci.cartKey, parsed);
                              } else {
                                onUpdateCustomPrice?.(ci.cartKey, null);
                              }
                              setEditingPriceCartKey(null);
                              setEditingPriceValue("");
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const parsed = parseFloat(editingPriceValue);
                                if (!isNaN(parsed) && parsed >= 0 && parsed !== baseUnitPrice) {
                                  onUpdateCustomPrice?.(ci.cartKey, parsed);
                                } else {
                                  onUpdateCustomPrice?.(ci.cartKey, null);
                                }
                                setEditingPriceCartKey(null);
                                setEditingPriceValue("");
                              } else if (e.key === "Escape") {
                                setEditingPriceCartKey(null);
                                setEditingPriceValue("");
                              }
                            }}
                            className="w-24 h-7 text-xs font-semibold font-mono bg-background border border-primary/40 rounded-md px-2 outline-none focus:ring-1 focus:ring-primary/30"
                          />
                          <span className="text-xs text-muted-foreground">per {hasVariants ? "unit" : ci.selectedUnit}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <span>{fmtNgn(effectiveUnitPrice)} per {hasVariants ? "unit" : ci.selectedUnit}</span>
                          {ci.customPrice !== undefined && ci.customPrice !== baseUnitPrice && (
                            <span className="inline-flex items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              Custom
                            </span>
                          )}
                          {canEditPrice && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPriceCartKey(ci.cartKey);
                                setEditingPriceValue(String(effectiveUnitPrice));
                              }}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit item price"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                      
                      {!hasVariants && ci.item.customFields && Object.keys(ci.item.customFields).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(ci.item.customFields).map(([k, v]) => (
                            <span key={k} className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      )}

                      {configSummary && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="inline-flex items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            {configSummary}
                          </span>
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
                {editingCartKey === ci.cartKey ? (
                  <input
                    type="number"
                    autoFocus
                    min={1}
                    value={editingQtyValue}
                    onChange={(e) => setEditingQtyValue(e.target.value)}
                    onBlur={() => {
                      const val = parseInt(editingQtyValue) || 1;
                      if (onSetQuantity) {
                        onSetQuantity(ci.cartKey, Math.max(1, val));
                      }
                      setEditingCartKey(null);
                      setEditingQtyValue("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseInt(editingQtyValue) || 1;
                        if (onSetQuantity) {
                          onSetQuantity(ci.cartKey, Math.max(1, val));
                        }
                        setEditingCartKey(null);
                        setEditingQtyValue("");
                      } else if (e.key === "Escape") {
                        setEditingCartKey(null);
                        setEditingQtyValue("");
                      }
                    }}
                    className="w-12 h-8 text-center text-sm font-semibold font-mono bg-background border border-primary/40 rounded-md outline-none focus:ring-1 focus:ring-primary/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCartKey(ci.cartKey);
                      setEditingQtyValue(String(ci.quantity));
                    }}
                    className="min-w-7 h-8 px-1 flex items-center justify-center gap-0.5 rounded-md hover:bg-muted/50 transition-colors group/qty"
                    title="Click to edit quantity"
                  >
                    <span className="text-sm font-semibold font-mono">{ci.quantity}</span>
                    <Edit3 className="h-2.5 w-2.5 opacity-0 group-hover/qty:opacity-40 transition-opacity" />
                  </button>
                )}
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

              <p className="min-w-16 text-right text-sm font-semibold font-mono">{fmtNgn(effectiveUnitPrice, ci.quantity)}</p>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-4 space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{totalQty} item{totalQty !== 1 && "s"}</span>
          <span className="font-mono">{NAIRA}{(total - packagingFee).toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
        </div>
        {packagingFee > 0 && (
          <div className="flex items-center justify-between text-xs text-primary font-bold">
            <span>Container Packaging Surcharge</span>
            <span className="font-mono">+{NAIRA}{packagingFee.toLocaleString("en-NG")}</span>
          </div>
        )}
        {estimatedReadyTime > 0 && businessType === "restaurant" && (
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-bold border-b border-border/40 pb-2">
            <span>Expected Cooking Ready Time</span>
            <span>~{estimatedReadyTime} minutes</span>
          </div>
        )}
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
