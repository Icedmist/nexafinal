import { useState } from "react";
import { Plus, Minus, ChevronDown, ChevronUp, Package, Layers, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Item } from "@/types/inventory";
import {
  formatNaira,
  getUnitConversionFactor,
  getCartItemUnitPrice,
  getAvailableStockInBaseUnits
} from "../SalesStepBrowse";

interface ProvisionsProductGridProps {
  filtered: Item[];
  cart: Map<string, number>;
  onAdd: (cartKey: string) => void;
  onRemove: (cartKey: string) => void;
  onSetQuantity: (cartKey: string, qty: number) => void;
  animatingItems: Set<string>;
  setAnimatingItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  activeUnits: Record<string, string>;
  setActiveUnits: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  items: Item[];
}

export function ProvisionsProductGrid({
  filtered,
  cart,
  onAdd,
  onRemove,
  onSetQuantity,
  animatingItems,
  setAnimatingItems,
  activeUnits,
  setActiveUnits,
  items,
}: ProvisionsProductGridProps) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-3.5 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((item) => {
        const activeUnit = activeUnits[item.id] || item.unit;
        const activeUnitPrice = getCartItemUnitPrice(item, activeUnit);
        const activeUnitQty = cart.get(`${item.id}:${activeUnit}`) ?? 0;
        const remainingStock = getAvailableStockInBaseUnits(item.id, cart, items);
        const conversionFactor = getUnitConversionFactor(item, activeUnit);
        const canAddActiveUnit = remainingStock >= conversionFactor;

        // Stock in the active unit
        const stockInActiveUnit = Math.floor(remainingStock / conversionFactor);

        // Total quantities of all units combined in cart
        const totalQtyInCart = Array.from(cart.entries())
          .filter(([key]) => key.startsWith(`${item.id}:`))
          .reduce((sum, [_, q]) => sum + q, 0);

        const isAnimating = animatingItems.has(item.id);
        const isExpanded = expandedItemId === item.id;

        const handleAddClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (item.currentStock > 0 && canAddActiveUnit) {
            const cartKey = `${item.id}:${activeUnit}`;
            onAdd(cartKey);
            setAnimatingItems(prev => new Set(prev).add(item.id));
            setTimeout(() => setAnimatingItems(prev => {
              const next = new Set(prev);
              next.delete(item.id);
              return next;
            }), 200);
          }
        };

        const handleRemoveClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (activeUnitQty > 0) {
            onRemove(`${item.id}:${activeUnit}`);
          }
        };

        return (
          <div
            key={item.id}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-4 transition-all duration-300 shadow-sm",
              totalQtyInCart > 0
                ? "border-emerald-500/40 shadow-emerald-500/5 ring-1 ring-emerald-500/20"
                : "border-border hover:border-emerald-500/20 hover:shadow-md",
              item.currentStock <= 0 && "opacity-75 grayscale-[0.3]"
            )}
          >
            {/* Header: Stock Badge + SKU */}
            <div className="flex items-start justify-between gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "h-5 px-2 text-[10px] font-bold border-none shadow-sm shrink-0",
                  remainingStock <= 0
                    ? "bg-destructive/95 text-destructive-foreground"
                    : remainingStock <= (item.reorderPoint || 5)
                      ? "bg-amber-500/95 text-amber-950"
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                )}
              >
                {remainingStock <= 0 ? "Out of Stock" : `${stockInActiveUnit} in stock (${activeUnit})`}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded select-all font-bold">
                {item.sku}
              </span>
            </div>

            {/* Product Details */}
            <div className="mt-3.5 flex-1 space-y-1">
              <h3 className="text-[15px] font-extrabold leading-tight text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {item.name}
              </h3>
              {item.description ? (
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground/40 italic">No description provided</p>
              )}
            </div>

            {/* Price */}
            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                  Price ({activeUnit})
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">
                  {formatNaira(activeUnitPrice)}
                </span>
              </div>
            </div>

            {/* Unit Pills — Level 1: Fast selection */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Units
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedItemId(isExpanded ? null : item.id);
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-500/5 px-2 py-0.5 rounded-full"
                >
                  <Layers className="h-3 w-3" />
                  <span>All units</span>
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap select-none">
                {/* Base Unit Pill */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveUnits(prev => ({ ...prev, [item.id]: item.unit }));
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border shrink-0",
                    activeUnit === item.unit
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground border-transparent"
                  )}
                >
                  {item.unit}
                  {(cart.get(`${item.id}:${item.unit}`) ?? 0) > 0 && (
                    <span className="ml-1 text-[9px] opacity-80">
                      ({cart.get(`${item.id}:${item.unit}`)})
                    </span>
                  )}
                </button>

                {/* Secondary Unit Pills */}
                {item.units?.map((u) => (
                  <button
                    key={u.name}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveUnits(prev => ({ ...prev, [item.id]: u.name }));
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border shrink-0",
                      activeUnit === u.name
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground border-transparent"
                    )}
                  >
                    {u.name}
                    {(cart.get(`${item.id}:${u.name}`) ?? 0) > 0 && (
                      <span className="ml-1 text-[9px] opacity-80">
                        ({cart.get(`${item.id}:${u.name}`)})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom: +/- controls for active unit */}
            <div className="mt-4 pt-3.5 border-t border-border/50 flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground font-bold">
                {activeUnit} Qty
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  disabled={activeUnitQty <= 0}
                  onClick={handleRemoveClick}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="relative flex items-center justify-center min-w-[24px]">
                  <span className={cn(
                    "text-sm font-extrabold font-mono text-foreground transition-all duration-200",
                    isAnimating && "scale-125 text-emerald-600"
                  )}>
                    {activeUnitQty}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  disabled={item.currentStock <= 0 || !canAddActiveUnit}
                  onClick={handleAddClick}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Level 2: All Units expandable drawer */}
            {isExpanded && (
              <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/50 space-y-3 animate-in fade-in-50 duration-200">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b pb-1">
                  Manage Units Directly
                </p>

                {/* Base Unit Manager */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{item.unit}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                      {formatNaira(item.sellingPrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-md"
                      disabled={(cart.get(`${item.id}:${item.unit}`) ?? 0) <= 0}
                      onClick={() => {
                        const current = cart.get(`${item.id}:${item.unit}`) ?? 0;
                        onSetQuantity(`${item.id}:${item.unit}`, current - 1);
                      }}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-xs font-mono font-bold">
                      {cart.get(`${item.id}:${item.unit}`) ?? 0}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-md"
                      disabled={remainingStock <= 0}
                      onClick={() => {
                        const current = cart.get(`${item.id}:${item.unit}`) ?? 0;
                        onSetQuantity(`${item.id}:${item.unit}`, current + 1);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Secondary Units Manager */}
                {item.units?.map((u) => {
                  const secondaryPrice = u.sellingPrice ?? (item.sellingPrice * u.conversionFactor);
                  const inCartQty = cart.get(`${item.id}:${u.name}`) ?? 0;
                  const maxAddable = Math.floor(remainingStock / u.conversionFactor);

                  return (
                    <div key={u.name} className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{u.name}</p>
                        <p className="text-[9px] text-muted-foreground leading-none">
                          1 {u.name} = {u.conversionFactor} {item.unit}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold mt-0.5">
                          {formatNaira(secondaryPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 rounded-md"
                          disabled={inCartQty <= 0}
                          onClick={() => {
                            onSetQuantity(`${item.id}:${u.name}`, inCartQty - 1);
                          }}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-xs font-mono font-bold">
                          {inCartQty}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 rounded-md"
                          disabled={maxAddable <= 0}
                          onClick={() => {
                            onSetQuantity(`${item.id}:${u.name}`, inCartQty + 1);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <Button
                  size="sm"
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  onClick={() => setExpandedItemId(null)}
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
