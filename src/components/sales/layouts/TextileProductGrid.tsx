import { useState, useMemo } from "react";
import { Plus, Minus, Package, Tag, ShoppingCart, Info, Palette, Ruler, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Item, ProductVariant } from "@/types/inventory";
import { getColorHex } from "@/lib/variants";
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
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {filtered.map((item) => (
        <TextileProductCard
          key={item.id}
          item={item}
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
      ))}
    </div>
  );
}

interface TextileProductCardProps {
  item: Item;
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
  const itemVariants = useMemo(() => item.variants || [], [item.variants]);
  const variantAttributes = item.variantAttributes || [];

  const hasColour = variantAttributes.includes("Colour");
  const hasSize = variantAttributes.includes("Size");
  const hasMaterial = variantAttributes.includes("Material");

  // Extract unique values from itemVariants
  const uniqueColors = useMemo(() => {
    if (!hasColour) return [];
    return [...new Set(itemVariants.map(v => v.attributes["Colour"]).filter(Boolean))];
  }, [itemVariants, hasColour]);

  const uniqueSizes = useMemo(() => {
    if (!hasSize) return [];
    return [...new Set(itemVariants.map(v => v.attributes["Size"]).filter(Boolean))];
  }, [itemVariants, hasSize]);

  const uniqueMaterials = useMemo(() => {
    if (!hasMaterial) return [];
    return [...new Set(itemVariants.map(v => v.attributes["Material"]).filter(Boolean))];
  }, [itemVariants, hasMaterial]);

  // Selection state
  const [selectedColor, setSelectedColor] = useState<string>(uniqueColors[0] || "");
  const [selectedSize, setSelectedSize] = useState<string>(
    uniqueSizes.find(s => itemVariants.some(v => v.attributes["Colour"] === uniqueColors[0] && v.attributes["Size"] === s)) || ""
  );
  const [selectedMaterial, setSelectedMaterial] = useState<string>(uniqueMaterials[0] || "");
  const [localQty, setLocalQty] = useState<number>(1);

  // Find active variant
  const activeVariant = useMemo(() => {
    return itemVariants.find(v => {
      const colorMatch = !hasColour || v.attributes["Colour"] === selectedColor;
      const sizeMatch = !hasSize || v.attributes["Size"] === selectedSize;
      const materialMatch = !hasMaterial || v.attributes["Material"] === selectedMaterial;
      return colorMatch && sizeMatch && materialMatch;
    }) || itemVariants[0];
  }, [itemVariants, selectedColor, selectedSize, selectedMaterial, hasColour, hasSize, hasMaterial]);

  // Cart key uses variant ID
  const cartKey = activeVariant ? `${item.id}:${activeVariant.id}` : `${item.id}:default`;
  const activeVariantQty = cart.get(cartKey) ?? 0;

  // Stock
  const variantStock = activeVariant?.stock ?? 0;
  const remainingStock = getAvailableStockInBaseUnits(item.id, cart, items);
  const isAnimating = animatingItems.has(item.id);

  // Price calculations
  const minPrice = useMemo(() => {
    if (itemVariants.length === 0) return item.sellingPrice;
    return Math.min(...itemVariants.map(v => v.price));
  }, [itemVariants, item.sellingPrice]);

  const hasMultiplePrices = useMemo(() => {
    return new Set(itemVariants.map(v => v.price)).size > 1;
  }, [itemVariants]);

  // Total cart count
  const totalQtyInCart = useMemo(() => {
    return Array.from(cart.entries())
      .filter(([key]) => key.startsWith(`${item.id}:`))
      .reduce((sum, [_, q]) => sum + q, 0);
  }, [cart, item.id]);

  // Total variant stock
  const totalVariantStock = useMemo(() => {
    if (itemVariants.length === 0) return item.currentStock;
    return itemVariants.reduce((sum, v) => sum + v.stock, 0);
  }, [itemVariants, item.currentStock]);

  const handleAdd = () => {
    if (!activeVariant || variantStock <= 0) return;

    const targetQty = activeVariantQty + localQty;
    if (targetQty > variantStock) return;

    onSetQuantity(cartKey, targetQty);

    setAnimatingItems(prev => new Set(prev).add(item.id));
    setTimeout(() => {
      setAnimatingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 200);

    setLocalQty(1);
  };

  // Check if a size is available for the currently selected color
  const isSizeAvailable = (size: string) => {
    if (!hasColour) return true;
    return itemVariants.some(v => v.attributes["Colour"] === selectedColor && v.attributes["Size"] === size && v.stock > 0);
  };

  // Check if a color is available
  const isColorAvailable = (color: string) => {
    return itemVariants.some(v => v.attributes["Colour"] === color && v.stock > 0);
  };

  return (
    <div
      onClick={onToggleExpand}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 cursor-pointer shadow-sm",
        totalQtyInCart > 0
          ? "border-primary/50 shadow-lg ring-1 ring-primary/10 scale-[1.01]"
          : "border-border hover:border-primary/20 hover:shadow-md",
        totalVariantStock <= 0 && "opacity-75 grayscale-[0.3]"
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
              totalVariantStock <= 0
                ? "bg-destructive/90 text-destructive-foreground"
                : totalVariantStock <= (item.reorderPoint || 5)
                  ? "bg-amber-500/90 text-amber-950"
                  : "bg-background/80 text-foreground"
            )}
          >
            {totalVariantStock <= 0 ? "Out" : `${totalVariantStock} in stock`}
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
          {hasColour && uniqueColors.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Palette className="h-3 w-3" />
                Select colour
              </span>
              <div className="flex flex-wrap gap-1.5">
                {uniqueColors.map((color) => {
                  const isActive = selectedColor === color;
                  const hexColor = getColorHex(color);
                  const available = isColorAvailable(color);

                  return (
                    <button
                      key={color}
                      type="button"
                      disabled={!available}
                      onClick={() => {
                        setSelectedColor(color);
                        // Reset size if not available for new color
                        if (hasSize && !isSizeAvailable(selectedSize)) {
                          const firstAvailable = uniqueSizes.find(s => isSizeAvailable(s));
                          setSelectedSize(firstAvailable || "");
                        }
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : available
                            ? "bg-background text-muted-foreground border-border hover:bg-accent"
                            : "bg-muted/40 text-muted-foreground/30 border-transparent cursor-not-allowed"
                      )}
                    >
                      {hexColor ? (
                        <span
                          className="h-3 w-3 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: hexColor }}
                        />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 shrink-0" />
                      )}
                      <span>{color}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sizes Selector */}
          {hasSize && uniqueSizes.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                Select size
              </span>
              <div className="flex flex-wrap gap-1.5">
                {uniqueSizes.map((size) => {
                  const isActive = selectedSize === size;
                  const available = isSizeAvailable(size);

                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={!available}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "h-7 min-w-7 px-2 rounded-lg text-[10px] font-bold transition-all border flex items-center justify-center",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : available
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

          {/* Materials Selector */}
          {hasMaterial && uniqueMaterials.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Select material
              </span>
              <div className="flex flex-wrap gap-1.5">
                {uniqueMaterials.map((material) => {
                  const isActive = selectedMaterial === material;
                  const available = itemVariants.some(v => v.attributes["Material"] === material && v.stock > 0);

                  return (
                    <button
                      key={material}
                      type="button"
                      disabled={!available}
                      onClick={() => setSelectedMaterial(material)}
                      className={cn(
                        "h-7 px-2 rounded-lg text-[10px] font-bold transition-all border",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : available
                            ? "bg-background text-muted-foreground border-border hover:bg-accent"
                            : "bg-muted/40 text-muted-foreground/30 border-transparent cursor-not-allowed"
                      )}
                    >
                      {material}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Variant Price & Stock */}
          {activeVariant && (
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center justify-between gap-1 text-[11px]">
                <div className="min-w-0">
                  <p className="font-extrabold text-foreground truncate">
                    {Object.values(activeVariant.attributes).join(" / ")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Stock: <span className="font-bold">{variantStock}</span> units
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-primary">{formatNaira(activeVariant.price)}</p>
                  {activeVariantQty > 0 && (
                    <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {activeVariantQty} in cart
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!activeVariant && (
            <p className="text-[10px] text-muted-foreground italic text-center py-1">
              Pick a colour and size to see price and stock.
            </p>
          )}

          {/* Quantity selector & Add to cart button */}
          <div className="flex items-center gap-1.5 pt-1">
            <div className="flex items-center border rounded-lg bg-background shrink-0">
              <button
                type="button"
                disabled={localQty <= 1}
                onClick={() => setLocalQty(q => q - 1)}
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
                  activeVariantQty + localQty >= variantStock
                }
                onClick={() => setLocalQty(q => q + 1)}
                className="p-1.5 text-muted-foreground disabled:opacity-20 hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            <Button
              type="button"
              disabled={!activeVariant || variantStock <= 0 || activeVariantQty + localQty > variantStock}
              onClick={handleAdd}
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
