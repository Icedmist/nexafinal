import { useState, useMemo, useCallback } from "react";
import {
  Plus, Minus, UtensilsCrossed, Clock, Flame, ShoppingCart,
  ChevronDown, MapPin, Package, StickyNote, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Item, MenuItemSize, MenuItemAddon, OrderType, RestaurantOrderLine } from "@/types/inventory";
import {
  formatNaira,
  getAvailableStockInBaseUnits,
} from "../SalesStepBrowse";

// ─── Food emoji mapping ─────────────────────────────────────────────
const FOOD_EMOJI_MAP: Record<string, string> = {
  rice: "🍚", jollof: "🍚", fried: "🍗", chicken: "🍗", beef: "🥩",
  meat: "🥩", fish: "🐟", pepper: "🌶️", soup: "🍲", stew: "🍲",
  egusi: "🍲", drink: "🥤", juice: "🧃", water: "💧", coke: "🥤",
  fanta: "🥤", sprite: "🥤", beer: "🍺", wine: "🍷", salad: "🥗",
  fries: "🍟", chips: "🍟", bread: "🍞", cake: "🎂", ice: "🍨",
  cream: "冰淇", smoothie: "🥤", tea: "🍵", coffee: "☕", egg: "🍳",
  sausage: "🌭", pizza: "🍕", burger: "🍔", sandwich: "🥪",
  plantain: "🍌", beans: "🫘", yam: "🍠", combo: "🍱",
  shawarma: "🌯", pancake: "🥞", pasta: "🍝", noodle: "🍜",
};

function getFoodEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, emoji] of Object.entries(FOOD_EMOJI_MAP)) {
    if (lower.includes(keyword)) return emoji;
  }
  return "🍽️";
}

function getPrepTime(item: Item): number {
  const config = item.menuItemConfig;
  if (config?.prepTimeMinutes) return config.prepTimeMinutes;
  // Fallback heuristics
  const name = item.name.toLowerCase();
  if (["coke", "water", "fanta", "sprite", "juice", "soda"].some(k => name.includes(k))) return 2;
  if (["fries", "salad", "egg"].some(k => name.includes(k))) return 8;
  return 15;
}

// ─── Order context props ────────────────────────────────────────────
export interface RestaurantProductGridProps {
  filtered: Item[];
  cart: Map<string, number>;
  orderCart: Map<string, RestaurantOrderLine>;
  onAdd: (cartKey: string, config?: RestaurantOrderLine) => void;
  onRemove: (cartKey: string) => void;
  onSetQuantity: (cartKey: string, qty: number) => void;
  animatingItems: Set<string>;
  setAnimatingItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  items: Item[];
  orderType: OrderType;
  setOrderType: React.Dispatch<React.SetStateAction<OrderType>>;
  tableNumber: string;
  setTableNumber: React.Dispatch<React.SetStateAction<string>>;
}

export function RestaurantProductGrid({
  filtered,
  cart,
  orderCart,
  onAdd,
  onRemove,
  onSetQuantity,
  animatingItems,
  setAnimatingItems,
  items,
  orderType,
  setOrderType,
  tableNumber,
  setTableNumber,
}: RestaurantProductGridProps) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  return (
    <div className="space-y-3 py-2">
      {/* ─── Order Context Chips ─── */}
      <div className="flex items-center gap-2 px-1">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex gap-1.5">
          {([
            { type: "dine_in" as OrderType, label: "Dine-in", icon: "🍽️" },
            { type: "takeaway" as OrderType, label: "Takeaway", icon: "📦" },
            { type: "delivery" as OrderType, label: "Delivery", icon: "🚴" },
          ]).map(({ type, label, icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => setOrderType(type)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                orderType === type
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:bg-accent"
              )}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Table number for dine-in */}
        {orderType === "dine_in" && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Table</span>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-xs font-bold text-center focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              placeholder="#"
            />
          </div>
        )}
      </div>

      {/* ─── Menu Grid ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((item) => (
          <DishCard
            key={item.id}
            item={item}
            cart={cart}
            orderCart={orderCart}
            onAdd={onAdd}
            onRemove={onRemove}
            onSetQuantity={onSetQuantity}
            animatingItems={animatingItems}
            setAnimatingItems={setAnimatingItems}
            items={items}
            isExpanded={expandedItemId === item.id}
            onToggleExpand={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
            orderType={orderType}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Dish Card Component ────────────────────────────────────────────
interface DishCardProps {
  item: Item;
  cart: Map<string, number>;
  orderCart: Map<string, RestaurantOrderLine>;
  onAdd: (cartKey: string, config?: RestaurantOrderLine) => void;
  onRemove: (cartKey: string) => void;
  onSetQuantity: (cartKey: string, qty: number) => void;
  animatingItems: Set<string>;
  setAnimatingItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  items: Item[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  orderType: OrderType;
}

function DishCard({
  item,
  cart,
  orderCart,
  onAdd,
  onRemove,
  onSetQuantity,
  animatingItems,
  setAnimatingItems,
  items,
  isExpanded,
  onToggleExpand,
  orderType,
}: DishCardProps) {
  const config = item.menuItemConfig;
  const hasConfig = config && (config.sizes?.length > 0 || config.addons?.length > 0 || config.spiceLevels?.length > 0);

  // Selection state
  const [selectedSize, setSelectedSize] = useState<MenuItemSize | null>(config?.sizes?.[0] || null);
  const [selectedAddons, setSelectedAddons] = useState<MenuItemAddon[]>([]);
  const [selectedSpice, setSelectedSpice] = useState<string>("");
  const [kitchenNote, setKitchenNote] = useState("");
  const [localQty, setLocalQty] = useState(1);

  // Calculate running price
  const unitPrice = useMemo(() => {
    let price = selectedSize?.price || item.sellingPrice || 0;
    selectedAddons.forEach(a => { price += a.price; });
    return price;
  }, [selectedSize, selectedAddons, item.sellingPrice]);

  const totalPrice = unitPrice * localQty;

  // Cart key includes size and addons for unique identification
  const cartKey = useMemo(() => {
    const sizeName = selectedSize?.name || "default";
    const addonNames = selectedAddons.map(a => a.name).sort().join(",");
    const spice = selectedSpice || "none";
    return `${item.id}:${sizeName}:${addonNames}:${spice}`;
  }, [item.id, selectedSize, selectedAddons, selectedSpice]);

  const qtyInCart = cart.get(cartKey) ?? 0;
  const remainingStock = getAvailableStockInBaseUnits(item.id, cart, items);
  const isAnimating = animatingItems.has(item.id);

  const totalQtyInCart = useMemo(() => {
    return Array.from(cart.entries())
      .filter(([key]) => key.startsWith(`${item.id}:`))
      .reduce((sum, [_, q]) => sum + q, 0);
  }, [cart, item.id]);

  const prepTime = getPrepTime(item);

  const toggleAddon = (addon: MenuItemAddon) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) return prev.filter(a => a.id !== addon.id);
      return [...prev, addon];
    });
  };

  const handleAddToOrder = () => {
    if (!hasConfig || !isExpanded) {
      // Quick add with default config
      onAdd(`${item.id}:default`);
    } else {
      // Add with full configuration
      onAdd(cartKey, {
        itemId: item.id,
        itemName: item.name,
        size: selectedSize?.name,
        sizePrice: selectedSize?.price,
        addons: selectedAddons.map(a => ({ name: a.name, price: a.price })),
        spiceLevel: selectedSpice || undefined,
        kitchenNote: kitchenNote || undefined,
        quantity: localQty,
        unitPriceNgn: unitPrice,
        totalPriceNgn: totalPrice,
      });
    }

    setAnimatingItems(prev => new Set(prev).add(item.id));
    setTimeout(() => {
      setAnimatingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 200);

    setLocalQty(1);
    setKitchenNote("");
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (remainingStock > 0) {
      onAdd(`${item.id}:default`);
      setAnimatingItems(prev => new Set(prev).add(item.id));
      setTimeout(() => {
        setAnimatingItems(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 200);
    }
  };

  return (
    <div
      onClick={onToggleExpand}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 cursor-pointer shadow-sm",
        totalQtyInCart > 0
          ? "border-emerald-500/50 shadow-lg ring-1 ring-emerald-500/20"
          : "border-border hover:border-emerald-500/20 hover:shadow-md",
        remainingStock <= 0 && "opacity-60 grayscale-[0.4] cursor-not-allowed",
      )}
    >
      {/* ─── Image / Emoji Area ─── */}
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

        {/* Cart counter */}
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

        {/* Sold out overlay */}
        {remainingStock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
            <Badge className="bg-destructive text-destructive-foreground font-black text-xs px-3 py-1">
              Sold Out
            </Badge>
          </div>
        )}

        {/* Config indicator */}
        {hasConfig && (
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="secondary" className="h-5 px-1.5 text-[9px] font-bold bg-black/50 backdrop-blur-md text-white border-none shadow-sm">
              Configurable
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

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mt-1 mb-1.5">
          <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
            <Clock className="h-2.5 w-2.5" />
            {prepTime} min
          </span>
          {config?.spiceLevels && config.spiceLevels.length > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
              <Flame className="h-2.5 w-2.5" />
              Spice
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mt-auto flex items-end justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-sm font-black text-emerald-600 leading-none">
              {formatNaira(unitPrice)}
            </span>
          </div>

          {/* Quick-add (non-expanded) */}
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

          {hasConfig && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ml-1 shrink-0",
                isExpanded && "rotate-180",
              )}
            />
          )}
        </div>
      </div>

      {/* ─── Expanded: Configuration Panel ─── */}
      {isExpanded && hasConfig && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="border-t border-border/60 bg-muted/20 p-3 space-y-3 animate-in slide-in-from-bottom-2 duration-200"
        >
          {/* Portion Size (Required) */}
          {config.sizes && config.sizes.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                Portion Size
                <span className="text-amber-500">*required</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {config.sizes.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border shadow-sm",
                      selectedSize?.id === size.id
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/10"
                        : "bg-background/80 text-muted-foreground border-border/80 hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {size.name}
                    <span className="ml-1 text-[9px] opacity-70">{formatNaira(size.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Protein / Add-on (Optional) */}
          {config.addons && config.addons.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                Add-ons
                <span className="text-emerald-500">optional</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {config.addons.map((addon) => {
                  const isSelected = selectedAddons.some(a => a.id === addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddon(addon)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border shadow-sm",
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/10"
                          : "bg-background/80 text-muted-foreground border-border/80 hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {addon.name}
                      <span className="ml-1 text-[9px] opacity-70">+{formatNaira(addon.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Spice Level (Free) */}
          {config.spiceLevels && config.spiceLevels.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                Spice level
                <span className="text-emerald-500">free</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {config.spiceLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedSpice(selectedSpice === level ? "" : level)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border shadow-sm",
                      selectedSpice === level
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/10"
                        : "bg-background/80 text-muted-foreground border-border/80 hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kitchen Note */}
          {config.allowKitchenNotes && (
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <StickyNote className="h-3 w-3" />
                Kitchen note (optional)
              </span>
              <textarea
                value={kitchenNote}
                onChange={(e) => setKitchenNote(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                placeholder="e.g. no onions, extra spicy..."
              />
            </div>
          )}

          {/* Price Summary & Add to Order */}
          <div className="pt-2 border-t border-border/40 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="text-muted-foreground">
                {selectedSize?.name || "Regular"}
                {selectedAddons.length > 0 && (
                  <span> + {selectedAddons.map(a => a.name).join(", ")}</span>
                )}
                {selectedSpice && <span> · {selectedSpice}</span>}
              </div>
              <div className="font-black text-emerald-600">
                {formatNaira(unitPrice)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quantity controls */}
              <div className="flex items-center border border-border/80 rounded-xl bg-background shrink-0 h-9">
                <button
                  type="button"
                  disabled={localQty <= 1}
                  onClick={() => setLocalQty(q => Math.max(1, q - 1))}
                  className="p-2 text-muted-foreground disabled:opacity-20 hover:text-foreground transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-xs font-mono font-bold select-none">
                  {localQty}
                </span>
                <button
                  type="button"
                  onClick={() => setLocalQty(q => q + 1)}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Add to order button */}
              <Button
                type="button"
                onClick={handleAddToOrder}
                className="flex-1 h-9 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md active:scale-95"
              >
                <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                Add to order — {formatNaira(totalPrice)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
