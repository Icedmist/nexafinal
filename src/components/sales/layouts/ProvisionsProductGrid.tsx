import { useState, useCallback } from "react";
import { Plus, Minus, ChevronDown, ChevronUp, Package, Layers, ShoppingCart, Palette, Tag, Edit3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Item } from "@/types/inventory";
import { getColorHex } from "@/lib/variants";
import {
  formatNaira,
  getUnitConversionFactor,
  getCartItemUnitPrice,
  getAvailableStockInBaseUnits
} from "../SalesStepBrowse";

import type { SalePriceMode } from "../price-utils";

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
  defaultSaleType: SalePriceMode;
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
  defaultSaleType,
}: ProvisionsProductGridProps) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [expandedItemSaleType, setExpandedItemSaleType] = useState<SalePriceMode>(defaultSaleType);
  // Per-item variant attribute selections: { [itemId]: { [attrName]: selectedValue } }
  const [perItemVariantAttrs, setPerItemVariantAttrs] = useState<Record<string, Record<string, string>>>({});
  const [editingQtyItemId, setEditingQtyItemId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState("");

  // Toggle expansion for a specific item — resets variant state for that item
  const handleToggleExpand = useCallback((itemId: string, item: Item) => {
    if (expandedItemId === itemId) {
      setExpandedItemId(null);
      return;
    }
    setExpandedItemId(itemId);
    setExpandedItemSaleType(defaultSaleType);

    // Initialize variant attrs for THIS item from its variants
    if (item.variants && item.variants.length > 0 && item.variantAttributes) {
      const initial: Record<string, string> = {};
      for (const attrName of item.variantAttributes) {
        const values = [...new Set(item.variants.map(v => v.attributes[attrName]).filter(Boolean))];
        if (values.length > 0) initial[attrName] = values[0];
      }
      setPerItemVariantAttrs(prev => ({ ...prev, [itemId]: initial }));
    }
  }, [expandedItemId, defaultSaleType]);

  // Update a single variant attr for a specific item
  const setItemVariantAttr = useCallback((itemId: string, attrName: string, value: string) => {
    setPerItemVariantAttrs(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [attrName]: value },
    }));
  }, []);

  return (
    <div className="grid grid-cols-1 gap-3.5 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((item) => {
        const activeUnit = activeUnits[item.id] || item.unit;
        const activeUnitPrice = getCartItemUnitPrice(item, activeUnit, defaultSaleType);
        const activeUnitQty = cart.get(`${item.id}:${activeUnit}:${defaultSaleType}`) ?? 0;
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

        // Only show the unit-selection section when the product actually has multiple units/variants
        const hasMultipleVariants = (item.units && item.units.length > 0) || (item.variants && item.variants.length > 0);

        const handleAddClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (item.currentStock > 0 && canAddActiveUnit) {
            const cartKey = `${item.id}:${activeUnit}:${defaultSaleType}`;
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
            onRemove(`${item.id}:${activeUnit}:${defaultSaleType}`);
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

            {/* Unit Pills — Level 1: Fast selection (only when product has multiple units/variants) */}
            {hasMultipleVariants && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Units
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleExpand(item.id, item);
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
            )}

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
                {editingQtyItemId === `${item.id}:${activeUnit}` ? (
                  <input
                    type="number"
                    autoFocus
                    min={0}
                    max={stockInActiveUnit + activeUnitQty}
                    value={editingQtyValue}
                    onChange={(e) => setEditingQtyValue(e.target.value)}
                    onBlur={() => {
                      const val = parseInt(editingQtyValue) || 0;
                      const cartKey = `${item.id}:${activeUnit}:${defaultSaleType}`;
                      onSetQuantity(cartKey, Math.max(0, val));
                      setEditingQtyItemId(null);
                      setEditingQtyValue("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseInt(editingQtyValue) || 0;
                        const cartKey = `${item.id}:${activeUnit}:${defaultSaleType}`;
                        onSetQuantity(cartKey, Math.max(0, val));
                        setEditingQtyItemId(null);
                        setEditingQtyValue("");
                      } else if (e.key === "Escape") {
                        setEditingQtyItemId(null);
                        setEditingQtyValue("");
                      }
                    }}
                    className="w-12 h-8 text-center text-sm font-extrabold font-mono text-foreground bg-background border border-emerald-500/40 rounded-md outline-none focus:ring-1 focus:ring-emerald-500/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingQtyItemId(`${item.id}:${activeUnit}`);
                      setEditingQtyValue(String(activeUnitQty));
                    }}
                    className="relative flex items-center justify-center min-w-[32px] h-8 px-1 rounded-md hover:bg-emerald-500/5 transition-colors group/qty"
                    title="Click to edit quantity"
                  >
                    <span className={cn(
                      "text-sm font-extrabold font-mono text-foreground transition-all duration-200",
                      isAnimating && "scale-125 text-emerald-600"
                    )}>
                      {activeUnitQty}
                    </span>
                    <Edit3 className="h-2.5 w-2.5 absolute -right-0.5 -top-0.5 opacity-0 group-hover/qty:opacity-50 transition-opacity text-muted-foreground" />
                  </button>
                )}
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

            {/* Level 2: Expanded Details (scoped to THIS item only) */}
            {isExpanded && (() => {
              const itemAttrs = perItemVariantAttrs[item.id] || {};
              const hasVariants = item.variants && item.variants.length > 0;
              const hasCustomFields = item.customFields && Object.keys(item.customFields).length > 0;

              return (
              <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/50 space-y-4 animate-in fade-in-50 duration-200" onClick={(e) => e.stopPropagation()}>
                {/* Header with price mode */}
                <div className="flex items-center justify-between border-b pb-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Product Details
                  </p>
                  <select
                    className="text-[10px] h-6 rounded-md border bg-background px-1.5 font-bold outline-none cursor-pointer"
                    value={expandedItemSaleType}
                    onChange={(e) => setExpandedItemSaleType(e.target.value as SalePriceMode)}
                  >
                    <option value="retail">Retail Price</option>
                    <option value="wholesale">Wholesale Price</option>
                  </select>
                </div>

                {/* Custom Fields Display */}
                {hasCustomFields && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Product Details
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(item.customFields!).map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-[9px] px-1.5 py-0.5 h-auto">
                          <span className="font-normal text-muted-foreground mr-1">{k}:</span>
                          <span className="font-bold">{String(v)}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variant Attributes Interactive Selectors */}
                {hasVariants && item.variantAttributes && item.variantAttributes.length > 0 && (
                  <div className="space-y-3">
                    {item.variantAttributes.map((attrName) => {
                      const uniqueValues = [...new Set(item.variants!.map(v => v.attributes[attrName]).filter(Boolean))];
                      if (uniqueValues.length === 0) return null;

                      const selectedVal = itemAttrs[attrName] || uniqueValues[0];
                      const isColourAttr = attrName.toLowerCase() === "colour" || attrName.toLowerCase() === "color";

                      return (
                        <div key={attrName} className="space-y-1.5">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            {isColourAttr ? <Palette className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
                            {attrName}
                            {selectedVal && <span className="text-emerald-600 dark:text-emerald-400 normal-case">— {selectedVal}</span>}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {uniqueValues.map(val => {
                              const isActive = selectedVal === val;
                              const hexColor = isColourAttr ? getColorHex(val) : null;

                              // Check if this value has available stock for the current other selections
                              const hasStock = item.variants!.some(v => {
                                if (v.attributes[attrName] !== val) return false;
                                // Check other selected attrs match
                                return item.variantAttributes!.every(otherAttr => {
                                  if (otherAttr === attrName) return true;
                                  const otherSel = itemAttrs[otherAttr];
                                  return !otherSel || v.attributes[otherAttr] === otherSel;
                                }) && v.stock > 0;
                              });

                              return (
                                <button
                                  key={val}
                                  type="button"
                                  disabled={!hasStock}
                                  onClick={() => setItemVariantAttr(item.id, attrName, val)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border",
                                    isActive
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                      : hasStock
                                        ? "bg-background text-muted-foreground border-border hover:bg-accent"
                                        : "bg-muted/40 text-muted-foreground/30 border-transparent cursor-not-allowed line-through"
                                  )}
                                >
                                  {hexColor && (
                                    <span
                                      className="h-3 w-3 rounded-full border border-black/15 shrink-0"
                                      style={{ backgroundColor: hexColor }}
                                    />
                                  )}
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Active Variant Info + Cart Controls */}
                    {(() => {
                      const activeVariant = item.variants!.find(v =>
                        item.variantAttributes!.every(attr => {
                          const sel = itemAttrs[attr] || [...new Set(item.variants!.map(v2 => v2.attributes[attr]).filter(Boolean))][0];
                          return v.attributes[attr] === sel;
                        })
                      ) || item.variants![0];

                      const variantCartKey = `${item.id}:${activeVariant.id}:${expandedItemSaleType}`;
                      const variantInCartQty = cart.get(variantCartKey) ?? 0;
                      const variantLabel = Object.values(activeVariant.attributes).join(" / ");

                      return (
                        <div className="pt-3 border-t border-border/40 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="min-w-0">
                              <p className="font-extrabold text-foreground truncate">{variantLabel}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Stock: <span className="font-bold">{activeVariant.stock}</span> units
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-black text-emerald-600 dark:text-emerald-400">{formatNaira(activeVariant.price)}</p>
                              {variantInCartQty > 0 && (
                                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                                  {variantInCartQty} in cart
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center border rounded-lg bg-background shrink-0">
                              <button
                                type="button"
                                disabled={variantInCartQty <= 0}
                                onClick={() => onSetQuantity(variantCartKey, variantInCartQty - 1)}
                                className="p-1.5 text-muted-foreground disabled:opacity-20 hover:text-foreground"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-mono font-bold select-none">
                                {variantInCartQty}
                              </span>
                              <button
                                type="button"
                                disabled={activeVariant.stock <= 0 || variantInCartQty >= activeVariant.stock}
                                onClick={() => onSetQuantity(variantCartKey, variantInCartQty + 1)}
                                className="p-1.5 text-muted-foreground disabled:opacity-20 hover:text-foreground"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <Button
                              type="button"
                              disabled={activeVariant.stock <= 0 || variantInCartQty >= activeVariant.stock}
                              onClick={() => onSetQuantity(variantCartKey, variantInCartQty + 1)}
                              className="flex-1 h-7.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700"
                            >
                              <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                              Add to cart
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Units Manager (if NO variants) */}
                {!hasVariants && (
                  <div className="space-y-3">
                    {/* Base Unit Manager */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{item.unit} <span className="text-[9px] font-normal text-muted-foreground">(Base)</span></p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                          {formatNaira(expandedItemSaleType === "wholesale" ? (item.wholesalePrice ?? item.sellingPrice) : item.sellingPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 rounded-md"
                          disabled={(cart.get(`${item.id}:${item.unit}:${expandedItemSaleType}`) ?? 0) <= 0}
                          onClick={() => {
                            const key = `${item.id}:${item.unit}:${expandedItemSaleType}`;
                            const current = cart.get(key) ?? 0;
                            onSetQuantity(key, current - 1);
                          }}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-xs font-mono font-bold">
                          {cart.get(`${item.id}:${item.unit}:${expandedItemSaleType}`) ?? 0}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 rounded-md"
                          disabled={remainingStock <= 0}
                          onClick={() => {
                            const key = `${item.id}:${item.unit}:${expandedItemSaleType}`;
                            const current = cart.get(key) ?? 0;
                            onSetQuantity(key, current + 1);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Secondary Units Manager */}
                    {item.units?.map((u) => {
                      const basePrice = expandedItemSaleType === "wholesale" ? (item.wholesalePrice ?? item.sellingPrice) : item.sellingPrice;
                      const secondaryPrice = u.sellingPrice ?? (basePrice * u.conversionFactor);

                      const key = `${item.id}:${u.name}:${expandedItemSaleType}`;
                      const inCartQty = cart.get(key) ?? 0;
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
                              onClick={() => onSetQuantity(key, inCartQty - 1)}
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
                              onClick={() => onSetQuantity(key, inCartQty + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  onClick={(e) => { e.stopPropagation(); setExpandedItemId(null); }}
                >
                  Done
                </Button>
              </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}
