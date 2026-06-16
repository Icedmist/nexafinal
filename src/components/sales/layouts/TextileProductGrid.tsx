import { useState, useMemo } from "react";
import { Plus, Minus, Package, Tag, ShoppingCart, Info } from "lucide-react";
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

interface TextileProductGridProps {
  filtered: Item[];
  cart: Map<string, number>;
  onAdd: (cartKey: string) => void;
  onRemove: (cartKey: string) => void;
  onSetQuantity: (cartKey: string, qty: number) => void;
  animatingItems: Set<string>;
  setAnimatingItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  items: Item[];
}

const COLOR_MAP: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  purple: "#a855f7",
  pink: "#ec4899",
  gray: "#6b7280",
  grey: "#6b7280",
  brown: "#78350f",
  beige: "#f5f5dc",
  navy: "#1e3a8a",
  teal: "#0d9488",
  gold: "#d4af37",
  silver: "#c0c0c0",
  cream: "#fffdd0",
};

interface ParsedVariant {
  unitName: string;
  color: string;
  size: string;
  price: number;
  conversionFactor: number;
}

export function TextileProductGrid({
  filtered,
  cart,
  onAdd,
  onRemove,
  onSetQuantity,
  animatingItems,
  setAnimatingItems,
  items,
}: TextileProductGridProps) {
  // Store expanded item ID
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {filtered.map((item) => {
        // Parse variants
        const variants: ParsedVariant[] = useMemo(() => {
          const list = [
            { name: item.unit, sellingPrice: item.sellingPrice, conversionFactor: 1 },
            ...(item.units || []),
          ];
          return list.map((u) => {
            // Split unit name to parse color and size (e.g. "Red/38", "Blue-40", "Black 42")
            const parts = u.name.split(/[\/\-]/).map((p) => p.trim());
            let color = parts[0] || "Default";
            let size = parts[1] || "";

            // If no separator was found, check if it's size-like or color-like
            if (parts.length === 1) {
              const val = parts[0];
              if (/^\d+$/.test(val) || ["s", "m", "l", "xl", "xxl", "xs"].includes(val.toLowerCase())) {
                size = val;
                color = "Default";
              }
            }

            return {
              unitName: u.name,
              color,
              size,
              price: u.sellingPrice ?? item.sellingPrice * u.conversionFactor,
              conversionFactor: u.conversionFactor,
            };
          });
        }, [item]);

        // Unique colors and sizes
        const uniqueColors = useMemo(() => {
          return Array.from(new Set(variants.map((v) => v.color))).filter(Boolean);
        }, [variants]);

        const uniqueSizes = useMemo(() => {
          return Array.from(new Set(variants.map((v) => v.size))).filter(Boolean);
        }, [variants]);

        return (
          <TextileProductCard
            key={item.id}
            item={item}
            variants={variants}
            uniqueColors={uniqueColors}
            uniqueSizes={uniqueSizes}
            cart={cart}
            onAdd={onAdd}
            onRemove={onRemove}
            onSetQuantity={onSetQuantity}
            animatingItems={animatingItems}
            setAnimatingItems={setAnimatingItems}
            items={items}
            isExpanded={expandedItemId === item.id}
            onToggleExpand={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
          />
        );
      })}
    </div>
  );
}

interface TextileProductCardProps {
  item: Item;
  variants: ParsedVariant[];
  uniqueColors: string[];
  uniqueSizes: string[];
  cart: Map<string, number>;
  onAdd: (cartKey: string) => void;
  onRemove: (cartKey: string) => void;
  onSetQuantity: (cartKey: string, qty: number) => void;
  animatingItems: Set<string>;
  setAnimatingItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  items: Item[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function TextileProductCard({
  item,
  variants,
  uniqueColors,
  uniqueSizes,
  cart,
  onAdd,
  onRemove,
  onSetQuantity,
  animatingItems,
  setAnimatingItems,
  items,
  isExpanded,
  onToggleExpand,
}: TextileProductCardProps) {
  // Color and Size selection state
  const [selectedColor, setSelectedColor] = useState<string>(uniqueColors[0] || "");
  const [selectedSize, setSelectedSize] = useState<string>(
    // Default to the first size available for the selected color
    uniqueSizes.find((s) => variants.some((v) => v.color === uniqueColors[0] && v.size === s)) || ""
  );

  // Local quantity to add
  const [localQty, setLocalQty] = useState<number>(1);

  // Remaining stock across all units (base units)
  const remainingStock = getAvailableStockInBaseUnits(item.id, cart, items);

  // Find currently selected variant mapping
  const activeVariant = useMemo(() => {
    return variants.find((v) => v.color === selectedColor && v.size === selectedSize) || variants[0];
  }, [variants, selectedColor, selectedSize]);

  const activeUnitQty = cart.get(`${item.id}:${activeVariant?.unitName}`) ?? 0;
  const isAnimating = animatingItems.has(item.id);

  // Min price for "from ₦X"
  const minPrice = useMemo(() => {
    return Math.min(...variants.map((v) => v.price));
  }, [variants]);

  const hasMultiplePrices = useMemo(() => {
    return new Set(variants.map((v) => v.price)).size > 1;
  }, [variants]);

  // Total quantity in cart for this product
  const totalQtyInCart = useMemo(() => {
    return Array.from(cart.entries())
      .filter(([key]) => key.startsWith(`${item.id}:`))
      .reduce((sum, [_, q]) => sum + q, 0);
  }, [cart, item.id]);

  const handleAddVariant = () => {
    if (!activeVariant) return;
    const key = `${item.id}:${activeVariant.unitName}`;
    const targetQty = activeUnitQty + localQty;

    // Check stock limit
    const requiredBaseUnits = localQty * activeVariant.conversionFactor;
    if (remainingStock < requiredBaseUnits) {
      return;
    }

    onSetQuantity(key, targetQty);

    // Animation trigger
    setAnimatingItems((prev) => new Set(prev).add(item.id));
    setTimeout(() => {
      setAnimatingItems((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 200);

    // Reset local qty
    setLocalQty(1);
  };

  // Check if a size is available for the currently selected color
  const isSizeAvailable = (size: string) => {
    return variants.some((v) => v.color === selectedColor && v.size === size);
  };

  return (
    <div
      onClick={onToggleExpand}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 cursor-pointer shadow-sm",
        totalQtyInCart > 0
          ? "border-primary/50 shadow-lg ring-1 ring-primary/10 scale-[1.01]"
          : "border-border hover:border-primary/20 hover:shadow-md",
        item.currentStock <= 0 && "opacity-75 grayscale-[0.3]"
      )}
    >
      {/* Product Image & Badges */}
      <div className="relative aspect-square overflow-hidden bg-muted/20">
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
        ) : null}

        {/* Fallback pattern */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-primary/5 to-primary/10 text-primary/30 transition-opacity duration-300",
            item.imageUrl ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          )}
        >
          <Package className="h-8 w-8 stroke-[1.2]" />
          <span className="text-[9px] font-black tracking-wider uppercase opacity-60">Textile</span>
        </div>

        {/* Color Count Badge */}
        {uniqueColors.length > 1 && (
          <div className="absolute top-2 left-2 z-10 rounded-md bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[8px] font-black text-white uppercase tracking-wider">
            {uniqueColors.length} Colours
          </div>
        )}

        {/* Cart counter */}
        {totalQtyInCart > 0 && (
          <div
            className={cn(
              "absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-1 text-xs font-black text-primary-foreground shadow-lg ring-2 ring-background z-10 transition-transform duration-200",
              isAnimating && "scale-125 rotate-6"
            )}
          >
            {totalQtyInCart}
          </div>
        )}

        {/* Stock Badge */}
        <div className="absolute bottom-2 left-2 z-10">
          <Badge
            variant="secondary"
            className={cn(
              "h-5 px-1.5 text-[9px] font-bold backdrop-blur-md border-none shadow-sm",
              remainingStock <= 0
                ? "bg-destructive/90 text-destructive-foreground"
                : remainingStock <= (item.reorderPoint || 5)
                  ? "bg-amber-500/90 text-amber-950"
                  : "bg-background/80 text-foreground"
            )}
          >
            {remainingStock <= 0 ? "Out" : `${remainingStock} left`}
          </Badge>
        </div>
      </div>

      {/* Card Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-[13px] font-extrabold leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {item.name}
        </p>

        <div className="mt-auto flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">
              {hasMultiplePrices ? "From" : "Price"}
            </span>
            <span className="text-sm font-black text-primary leading-none mt-0.5">
              {formatNaira(minPrice)}
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground font-mono font-bold opacity-60">
            {item.sku}
          </span>
        </div>
      </div>

      {/* Inline Expander Panel */}
      {isExpanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="border-t border-border/80 bg-muted/20 p-3 space-y-3 animate-in slide-in-from-bottom-2 duration-200"
        >
          {/* Colors Selector */}
          {uniqueColors.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                Colour
              </span>
              <div className="flex flex-wrap gap-1">
                {uniqueColors.map((color) => {
                  const isActive = selectedColor === color;
                  const normalizedColor = color.toLowerCase();
                  const hexColor = COLOR_MAP[normalizedColor] || null;

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setSelectedColor(color);
                        // If current size is not available with the new color, select the first available size
                        const sizesForColor = uniqueSizes.filter((s) =>
                          variants.some((v) => v.color === color && v.size === s)
                        );
                        if (!sizesForColor.includes(selectedSize)) {
                          setSelectedSize(sizesForColor[0] || "");
                        }
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:bg-accent"
                      )}
                    >
                      {hexColor ? (
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: hexColor }}
                        />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/30 shrink-0" />
                      )}
                      <span>{color}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sizes Selector */}
          {uniqueSizes.length > 0 && uniqueSizes.some(Boolean) && (
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                Size
              </span>
              <div className="flex flex-wrap gap-1">
                {uniqueSizes.map((size) => {
                  const isActive = selectedSize === size;
                  const isAvailable = isSizeAvailable(size);

                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "h-6 min-w-6 px-1.5 rounded-md text-[10px] font-bold transition-all border flex items-center justify-center",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : isAvailable
                            ? "bg-background text-muted-foreground border-border hover:bg-accent"
                            : "bg-muted/40 text-muted-foreground/30 border-transparent cursor-not-allowed"
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Variant Price & Warning */}
          {activeVariant && (
            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1 text-[11px]">
              <div className="min-w-0">
                <p className="font-extrabold text-foreground truncate">
                  {activeVariant.color} {activeVariant.size ? `/ Size ${activeVariant.size}` : ""}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Stock:{" "}
                  <span className="font-bold">
                    {Math.floor(remainingStock / activeVariant.conversionFactor)}
                  </span>{" "}
                  packs
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-primary">{formatNaira(activeVariant.price)}</p>
                {activeUnitQty > 0 && (
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {activeUnitQty} in cart
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quantity selector & Add to cart button */}
          <div className="flex items-center gap-1.5 pt-1">
            <div className="flex items-center border rounded-lg bg-background shrink-0">
              <button
                type="button"
                disabled={localQty <= 1}
                onClick={() => setLocalQty((q) => q - 1)}
                className="p-1.5 text-muted-foreground disabled:opacity-20 hover:text-foreground"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-5 text-center text-xs font-mono font-bold select-none">
                {localQty}
              </span>
              <button
                type="button"
                disabled={
                  !activeVariant ||
                  remainingStock < (localQty + 1) * activeVariant.conversionFactor
                }
                onClick={() => setLocalQty((q) => q + 1)}
                className="p-1.5 text-muted-foreground disabled:opacity-20 hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            <Button
              type="button"
              disabled={
                !activeVariant ||
                remainingStock < localQty * activeVariant.conversionFactor
              }
              onClick={handleAddVariant}
              className="flex-1 h-7.5 text-xs font-black"
            >
              <ShoppingCart className="mr-1 h-3.5 w-3.5" />
              Add to cart
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
