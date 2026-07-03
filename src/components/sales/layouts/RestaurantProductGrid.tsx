import { useState, useMemo } from "react";
import { Plus, Minus, ChevronDown, ChevronUp, UtensilsCrossed, Clock, Flame, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Item } from "@/types/inventory";
import {
  formatNaira,
  getUnitConversionFactor,
  getCartItemUnitPrice,
  getAvailableStockInBaseUnits,
} from "../SalesStepBrowse";

// ─── Food-specific emoji mapping for fallback icons ─────────────────
const FOOD_EMOJI_MAP: Record<string, string> = {
  rice: "🍚",
  jollof: "🍚",
  fried: "🍗",
  chicken: "🍗",
  beef: "🥩",
  meat: "🥩",
  fish: "🐟",
  pepper: "🌶️",
  soup: "🍲",
  stew: "🍲",
  egusi: "🍲",
  drink: "🥤",
  juice: "🧃",
  water: "💧",
  coke: "🥤",
  fanta: "🥤",
  sprite: "🥤",
  beer: "🍺",
  wine: "🍷",
  salad: "🥗",
  fries: "🍟",
  chips: "🍟",
  bread: "🍞",
  cake: "🎂",
  ice: "🍨",
  cream: "🍨",
  smoothie: "🥤",
  tea: "🍵",
  coffee: "☕",
  egg: "🍳",
  sausage: "🌭",
  pizza: "🍕",
  burger: "🍔",
  sandwich: "🥪",
  plantain: "🍌",
  beans: "🫘",
  yam: "🍠",
  combo: "🍱",
  shawarma: "🌯",
  pancake: "🥞",
  pasta: "🍝",
  noodle: "🍜",
};

function getFoodEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, emoji] of Object.entries(FOOD_EMOJI_MAP)) {
    if (lower.includes(keyword)) return emoji;
  }
  return "🍽️";
}

function isSpicy(item: Item): boolean {
  const name = item.name.toLowerCase();
  const desc = (item.description || "").toLowerCase();
  const spicyKeywords = ["pepper", "spicy", "suya", "hot", "chili", "chilli", "stew", "tsire"];
  return spicyKeywords.some(kw => name.includes(kw) || desc.includes(kw));
}

function getPrepTime(item: Item): string {
  const desc = (item.description || "").toLowerCase();
  const name = item.name.toLowerCase();
  const timeMatch = desc.match(/(\d+-\d+|\d+)\s*(mins|min|minutes|prep)/);
  if (timeMatch) return `${timeMatch[1]} mins`;
  
  const fastKeywords = ["drink", "coke", "water", "fanta", "sprite", "beer", "wine", "juice", "soda", "ice", "cream"];
  if (fastKeywords.some(kw => name.includes(kw) || desc.includes(kw))) {
    return "2-5 mins";
  }
  const mediumKeywords = ["fries", "salad", "bread", "burger", "sandwich", "chips", "egg", "sausage", "suya", "pepper"];
  if (mediumKeywords.some(kw => name.includes(kw) || desc.includes(kw))) {
    return "5-10 mins";
  }
  return "10-15 mins";
}

function isMainDish(item: Item): boolean {
  const name = item.name.toLowerCase();
  const desc = (item.description || "").toLowerCase();
  const mainKeywords = ["rice", "jollof", "chicken", "beef", "meat", "fish", "soup", "stew", "egusi", "pasta", "noodle", "beans", "yam", "combo", "shawarma", "pizza", "burger", "pancake"];
  return mainKeywords.some(kw => name.includes(kw) || desc.includes(kw));
}

// ─── Props interface (matches existing layout pattern) ──────────────
interface RestaurantProductGridProps {
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

export function RestaurantProductGrid({
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
}: RestaurantProductGridProps) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((item) => {
        const activeUnit = activeUnits[item.id] || item.unit;
        const activeUnitPrice = getCartItemUnitPrice(item, activeUnit);
        const activeUnitQty = cart.get(`${item.id}:${activeUnit}`) ?? 0;
        const remainingStock = getAvailableStockInBaseUnits(item.id, cart, items);
        const conversionFactor = getUnitConversionFactor(item, activeUnit);
        const canAddActiveUnit = remainingStock >= conversionFactor;

        const totalQtyInCart = Array.from(cart.entries())
          .filter(([key]) => key.startsWith(`${item.id}:`))
          .reduce((sum, [_, q]) => sum + q, 0);

        const isAnimating = animatingItems.has(item.id);
        const isExpanded = expandedItemId === item.id;
        const hasMultipleUnits = item.units && item.units.length > 0;

        // Determine min price for "from ₦X" display
        const allPrices = [
          item.sellingPrice,
          ...(item.units?.map((u) => u.sellingPrice ?? item.sellingPrice * u.conversionFactor) || []),
        ];
        const minPrice = Math.min(...allPrices);
        const hasMultiplePrices = new Set(allPrices).size > 1;

        const handleToggle = () => {
          setExpandedItemId(isExpanded ? null : item.id);
        };

        const handleQuickAdd = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (item.currentStock > 0 && canAddActiveUnit) {
            const cartKey = `${item.id}:${activeUnit}`;
            onAdd(cartKey);
            setAnimatingItems((prev) => new Set(prev).add(item.id));
            setTimeout(
              () =>
                setAnimatingItems((prev) => {
                  const next = new Set(prev);
                  next.delete(item.id);
                  return next;
                }),
              200,
            );
          }
        };

        return (
          <div
            key={item.id}
            onClick={handleToggle}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 cursor-pointer shadow-sm",
              totalQtyInCart > 0
                ? "border-emerald-500/50 shadow-lg ring-1 ring-emerald-500/20"
                : "border-border hover:border-emerald-500/20 hover:shadow-md",
              item.currentStock <= 0 && "opacity-60 grayscale-[0.4] cursor-not-allowed",
            )}
          >
            {/* ─── Menu Item Image / Emoji Area ─── */}
            <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-emerald-950/20 to-stone-900/40 flex items-center justify-center">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "";
                    (e.target as HTMLImageElement).className = "hidden";
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="text-5xl drop-shadow-lg select-none" aria-hidden>
                    {getFoodEmoji(item.name)}
                  </span>
                </div>
              )}

              {/* Cart counter badge */}
              {totalQtyInCart > 0 && (
                <div
                  className={cn(
                    "absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-black text-white shadow-xl ring-2 ring-background z-10 transition-transform duration-200",
                    isAnimating && "scale-125 rotate-6",
                  )}
                >
                  {totalQtyInCart}
                </div>
              )}

              {/* Availability indicator */}
              {remainingStock <= 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                  <Badge className="bg-destructive text-destructive-foreground font-black text-xs px-3 py-1">
                    Sold Out
                  </Badge>
                </div>
              )}

              {/* Multi-unit indicator */}
              {hasMultiplePrices && (
                <div className="absolute top-2 left-2 z-10">
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-[9px] font-bold bg-black/50 backdrop-blur-md text-white border-none shadow-sm"
                  >
                    {item.units?.length ? `${(item.units?.length || 0) + 1} sizes` : ""}
                  </Badge>
                </div>
              )}
            </div>

            {/* ─── Card Info ─── */}
            <div className="flex flex-1 flex-col gap-1 p-3">
              <p className="text-[13px] font-extrabold leading-tight text-foreground line-clamp-1 group-hover:text-emerald-600 transition-colors">
                {item.name}
              </p>

              {item.description && (
                <p className="text-[10px] text-muted-foreground line-clamp-1 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* Dynamic UI Badges */}
              <div className="flex flex-wrap gap-1 mt-1 mb-1.5">
                {isSpicy(item) && (
                  <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                    <Flame className="h-2.5 w-2.5 fill-rose-500/25" />
                    Spicy
                  </span>
                )}
                {isMainDish(item) && (
                  <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold bg-emerald-600/10 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <UtensilsCrossed className="h-2.5 w-2.5" />
                    Special
                  </span>
                )}
                <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                  <Clock className="h-2.5 w-2.5" />
                  {getPrepTime(item)}
                </span>
              </div>

              {/* Price */}
              <div className="mt-auto flex items-end justify-between pt-1">
                <div className="flex flex-col">
                  {hasMultiplePrices && (
                    <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">
                      from
                    </span>
                  )}
                  <span className="text-sm font-black text-emerald-600 leading-none">
                    {formatNaira(hasMultiplePrices ? minPrice : activeUnitPrice)}
                  </span>
                </div>

                {/* Quick-add tap target (non-expanded) */}
                {!isExpanded && remainingStock > 0 && (
                  <button
                    type="button"
                    onClick={handleQuickAdd}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-90",
                      totalQtyInCart > 0
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20",
                    )}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}

                {/* Expand chevron */}
                {hasMultipleUnits && (
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ml-1 shrink-0",
                      isExpanded && "rotate-180",
                    )}
                  />
                )}
              </div>
            </div>

            {/* ─── Expanded: Size / Unit Selector & Quantity Controls ─── */}
            {isExpanded && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="border-t border-border/60 bg-muted/20 p-3 space-y-3 animate-in slide-in-from-bottom-2 duration-200"
              >
                {/* Portion / Size Pills */}
                {hasMultipleUnits && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      Portion Size
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {/* Base unit pill */}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveUnits((prev) => ({ ...prev, [item.id]: item.unit }))
                        }
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border shadow-sm",
                          activeUnit === item.unit
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/10"
                            : "bg-background/80 text-muted-foreground border-border/80 hover:bg-accent hover:text-foreground",
                        )}
                      >
                        {item.unit}
                        <span className="ml-1 text-[9px] opacity-70">
                          {formatNaira(item.sellingPrice)}
                        </span>
                      </button>

                      {/* Secondary unit pills */}
                      {item.units?.map((u) => {
                        const unitPrice = u.sellingPrice ?? item.sellingPrice * u.conversionFactor;
                        return (
                          <button
                            key={u.name}
                            type="button"
                            onClick={() =>
                              setActiveUnits((prev) => ({ ...prev, [item.id]: u.name }))
                            }
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border shadow-sm",
                              activeUnit === u.name
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/10"
                                : "bg-background/80 text-muted-foreground border-border/80 hover:bg-accent hover:text-foreground",
                            )}
                          >
                            {u.name}
                            <span className="ml-1 text-[9px] opacity-70">
                              {formatNaira(unitPrice)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Active variant price & stock summary */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1 text-[11px]">
                  <div className="min-w-0">
                    <p className="font-extrabold text-foreground truncate">
                      {activeUnit}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Stock:{" "}
                      <span className="font-bold">
                        {Math.floor(remainingStock / conversionFactor)}
                      </span>{" "}
                      available
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-emerald-600">
                      {formatNaira(activeUnitPrice)}
                    </p>
                    {activeUnitQty > 0 && (
                      <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                        {activeUnitQty} in order
                      </p>
                    )}
                  </div>
                </div>

                {/* Quantity controls + Add to order */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex items-center border border-border/80 rounded-xl bg-background shrink-0 h-9">
                    <button
                      type="button"
                      disabled={activeUnitQty <= 0}
                      onClick={() => {
                        if (activeUnitQty > 0) {
                          onRemove(`${item.id}:${activeUnit}`);
                        }
                      }}
                      className="p-2 text-muted-foreground disabled:opacity-20 hover:text-foreground transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-mono font-bold select-none">
                      {activeUnitQty}
                    </span>
                    <button
                      type="button"
                      disabled={!canAddActiveUnit || item.currentStock <= 0}
                      onClick={() => {
                        onAdd(`${item.id}:${activeUnit}`);
                        setAnimatingItems((prev) => new Set(prev).add(item.id));
                        setTimeout(
                          () =>
                            setAnimatingItems((prev) => {
                              const next = new Set(prev);
                              next.delete(item.id);
                              return next;
                            }),
                          200,
                        );
                      }}
                      className="p-2 text-muted-foreground disabled:opacity-20 hover:text-foreground transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <Button
                    type="button"
                    disabled={!canAddActiveUnit || item.currentStock <= 0}
                    onClick={() => {
                      onAdd(`${item.id}:${activeUnit}`);
                      setAnimatingItems((prev) => new Set(prev).add(item.id));
                      setTimeout(
                        () =>
                          setAnimatingItems((prev) => {
                            const next = new Set(prev);
                            next.delete(item.id);
                            return next;
                          }),
                        200,
                      );
                    }}
                    className="flex-1 h-9 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md active:scale-95"
                  >
                    <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                    Add to order
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
