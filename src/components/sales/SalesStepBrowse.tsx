import { useState, useMemo, useRef, useCallback } from "react";
import { Plus, Minus, Package, Search, X, TrendingUp, UserCheck, ScanBarcode, QrCode, ShoppingCart, Palette, Tag, Edit3 } from "lucide-react";
import { PriceModeSelector } from "./PriceModeSelector";
import type { SalePriceMode } from "./price-utils";
import { getItemPriceForMode } from "./price-utils";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useItems, useCategories } from "@/hooks/useInventoryData";
import { cn, extractItemIdentifier } from "@/lib/utils";
import type { Item } from "@/types/inventory";
import { QRScannerDialog } from "../shared/QRScannerDialog";
import { useBusiness } from "@/contexts/BusinessContext";
import { RestaurantProductGrid } from "./layouts/RestaurantProductGrid";
import { TextileProductGrid } from "./layouts/TextileProductGrid";
import { ProvisionsProductGrid } from "./layouts/ProvisionsProductGrid";
import { getColorHex } from "@/lib/variants";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useUpdateItem } from "@/hooks/useInventoryMutations";
import { usePermissions } from "@/hooks/usePermissions";

const NAIRA = "₦";

export function formatNaira(price: number): string {
  return `${NAIRA}${price.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function getUnitConversionFactor(item: Item, unitName: string): number {
  if (unitName === item.unit) return 1;
  const secondaryUnit = item.units?.find((u) => u.name === unitName);
  return secondaryUnit?.conversionFactor ?? 1;
}

export function getCartItemUnitPrice(item: Item, unitName: string, saleType: SalePriceMode = "retail"): number {
  return getItemPriceForMode(item, unitName, saleType);
}

export function getCartBaseUnitsForItem(itemId: string, cart: Map<string, number>, itemsList: Item[]): number {
  let total = 0;
  cart.forEach((qty, key) => {
    const [id, unitName] = key.split(":");
    if (id === itemId) {
      const item = itemsList.find((i) => i.id === id);
      if (item) {
        total += qty * getUnitConversionFactor(item, unitName);
      }
    }
  });
  return total;
}

export function getAvailableStockInBaseUnits(itemId: string, cart: Map<string, number>, itemsList: Item[]): number {
  const item = itemsList.find((i) => i.id === itemId);
  if (!item) return 0;
  const inCart = getCartBaseUnitsForItem(itemId, cart, itemsList);
  return Math.max(0, item.currentStock - inCart);
}

interface SalesStepBrowseProps {
  cart: Map<string, number>;
  onAdd: (cartKey: string) => void;
  onRemove: (cartKey: string) => void;
  onSetQuantity: (cartKey: string, qty: number) => void;
  defaultSaleType: SalePriceMode;
  onDefaultSaleTypeChange: (value: SalePriceMode) => void;
}

export function SalesStepBrowse({ cart, onAdd, onRemove, onSetQuantity, defaultSaleType, onDefaultSaleTypeChange }: SalesStepBrowseProps) {
  const { data: items } = useItems();
  const { profile } = useBusiness();
  const businessType = profile?.businessType || "retail";
  const { data: categories } = useCategories();
  const [search, setSearch] = useState("");
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const [activeUnits, setActiveUnits] = useState<Record<string, string>>({});
  const [editingUnitsItem, setEditingUnitsItem] = useState<Item | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [perItemVariantAttrs, setPerItemVariantAttrs] = useState<Record<string, Record<string, string>>>({});
  const [editingQtyItemId, setEditingQtyItemId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState("");

  const setItemVariantAttr = useCallback((itemId: string, attrName: string, value: string) => {
    setPerItemVariantAttrs(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [attrName]: value }
    }));
  }, []);

  // Restaurant-specific state
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [orderCart, setOrderCart] = useState<Map<string, any>>(new Map());

  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");

  const navigate = useNavigate();
  const updateItem = useUpdateItem();
  const { can } = usePermissions();

  const totalItems = Array.from(cart.values()).reduce((s, q) => s + q, 0);
  const totalNaira = useMemo(() => {
    let sum = 0;
    cart.forEach((qty, key) => {
      const parts = key.split(":");
      const itemId = parts[0];
      const unitName = parts[1];
      const saleType = (parts[2] as SalePriceMode) || defaultSaleType;
      const item = (items || []).find((i) => i.id === itemId);
      if (item) {
        sum += getCartItemUnitPrice(item, unitName, saleType) * qty;
      }
    });
    return sum;
  }, [cart, items, defaultSaleType]);

  // Long-press support
  const longPressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLongPress = useCallback((action: () => void, e?: React.TouchEvent) => {
    if (e) e.preventDefault();
    action();
    longPressRef.current = setInterval(action, 400);
  }, []);

  const stopLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearInterval(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const handleAdd = useCallback((cartKey: string, config?: any) => {
    onAdd(cartKey);
    const itemId = cartKey.split(":")[0];
    setAnimatingItems((prev) => new Set(prev).add(itemId));
    setTimeout(() => setAnimatingItems((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    }), 200);
    // Store restaurant order config
    if (config) {
      setOrderCart(prev => new Map(prev).set(cartKey, config));
    }
  }, [onAdd]);

  const handleBarcodeSubmit = useCallback((val: string) => {
    const cleanCode = extractItemIdentifier(val);
    const query = cleanCode.trim().toLowerCase();
    if (!query) return;

    const item = (items || []).find(
      (i) => i.id.toLowerCase() === query || i.barcode?.toLowerCase() === query || i.sku.toLowerCase() === query
    );

    if (item) {
      handleAdd(`${item.id}:${item.unit}:${defaultSaleType}`);
      toast.success(`Added ${item.name}`);
      setSearch(""); // Clear for next scan
    } else {
      setUnknownBarcode(query);
    }
  }, [items, handleAdd, defaultSaleType]);

  const topSellers = useMemo(() => {
    return [] as Item[];
  }, []);

  const repeatCustomers = useMemo(() => {
    return [] as { name: string; phone: string; count: number }[];
  }, []);

  const isSearchEmpty = !search.trim() && !activeCat;

  const filtered = useMemo(() => {
    let list = [...(items || [])];
    if (activeCat) list = list.filter((i) => i.categoryId === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    }
    return list;
  }, [items, search, activeCat]);

  return (
    <div className="flex h-full flex-col relative">
      {/* Search bar */}
      <div className="px-4 pt-3 pb-2 flex gap-2">
        <PriceModeSelector
          value={defaultSaleType}
          onValueChange={onDefaultSaleTypeChange}
          className="w-36 shrink-0"
          label="Price Mode"
        />
        <div className="relative flex-1">
          {barcodeMode ? (
            <ScanBarcode className={cn("absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-pulse", businessType === "restaurant" ? "text-emerald-600" : "text-primary")} />
          ) : (
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && barcodeMode) {
                handleBarcodeSubmit(search);
              }
            }}
            placeholder={barcodeMode ? "Scan or enter SKU..." : "Search by name or SKU…"}
            className={cn("pl-9 h-10", barcodeMode && (businessType === "restaurant" ? "border-emerald-600 ring-1 ring-emerald-600/20" : "border-primary ring-1 ring-primary/20"))}
            autoFocus={barcodeMode}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Button
          variant={isScannerOpen ? "default" : "outline"}
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => setIsScannerOpen(true)}
          title="Open Camera QR Scanner"
        >
          <QrCode className="h-4 w-4" />
        </Button>
        <Button
          variant={barcodeMode ? "default" : "outline"}
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => setBarcodeMode(!barcodeMode)}
          title="Toggle Barcode Scanner Mode"
        >
          <ScanBarcode className="h-4 w-4" />
        </Button>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveCat(null)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            !activeCat 
              ? (businessType === "restaurant" ? "bg-emerald-600 text-white shadow-sm" : "bg-primary text-primary-foreground shadow-sm") 
              : "bg-muted text-muted-foreground hover:bg-accent"
          )}
        >
          All
        </button>
        {(categories || []).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
              activeCat === cat.id 
                ? (businessType === "restaurant" ? "bg-emerald-600 text-white shadow-sm" : "bg-primary text-primary-foreground shadow-sm") 
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Smart suggestions when search is empty */}
      {isSearchEmpty && (topSellers.length > 0 || repeatCustomers.length > 0) && (
        <div className="border-b border-border px-4 pb-3 space-y-3">
          {topSellers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Sellers</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {topSellers.map((item) => item && (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAdd(`${item.id}:${item.unit}:${defaultSaleType}`)}
                    className="shrink-0 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left hover:border-primary/40 hover:shadow-sm transition-all active:scale-95"
                  >
                    <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center text-sm overflow-hidden">
                      {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : "📦"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate max-w-24">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{formatNaira(item.sellingPrice)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {repeatCustomers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Repeat Customers</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {repeatCustomers.map((c) => (
                  <div key={c.phone} className="shrink-0 rounded-lg border border-border bg-card px-3 py-2">
                    <p className="text-xs font-medium">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{c.phone}</p>
                    <Badge variant="secondary" className="mt-1 text-[9px]">{c.count} orders</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <div className="rounded-full bg-muted p-4"><Package className="h-8 w-8" /></div>
            <p className="text-sm font-medium">No products found</p>
            <p className="text-xs">Try adjusting your search or filter</p>
          </div>
        ) : businessType === "restaurant" ? (
          <RestaurantProductGrid
            filtered={filtered}
            cart={cart}
            orderCart={orderCart}
            onAdd={handleAdd}
            onRemove={onRemove}
            onSetQuantity={onSetQuantity}
            animatingItems={animatingItems}
            setAnimatingItems={setAnimatingItems}
            items={items || []}
            orderType={orderType}
            setOrderType={setOrderType}
            tableNumber={tableNumber}
            setTableNumber={setTableNumber}
          />
        ) : businessType === "textile" ? (
          <TextileProductGrid
            filtered={filtered}
            cart={cart}
            onAdd={handleAdd}
            onRemove={onRemove}
            onSetQuantity={onSetQuantity}
            animatingItems={animatingItems}
            setAnimatingItems={setAnimatingItems}
            items={items || []}
          />
        ) : ["wholesale", "agriculture"].includes(businessType) ? (
          <ProvisionsProductGrid
            filtered={filtered}
            cart={cart}
            onAdd={handleAdd}
            onRemove={onRemove}
            onSetQuantity={onSetQuantity}
            animatingItems={animatingItems}
            setAnimatingItems={setAnimatingItems}
            activeUnits={activeUnits}
            setActiveUnits={setActiveUnits}
            items={items || []}
            defaultSaleType={defaultSaleType}
          />
        ) : (
          /* Default retail grid */
          <div className="grid grid-cols-2 gap-2.5 py-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((item) => {
              const totalQtyInCart = Array.from(cart.entries())
                .filter(([key]) => key.startsWith(`${item.id}:`))
                .reduce((sum, [_, q]) => sum + q, 0);

              const isAnimating = animatingItems.has(item.id);
              const activeUnit = activeUnits[item.id] || item.unit;
              const activeUnitPrice = getCartItemUnitPrice(item, activeUnit, defaultSaleType);
              const activeUnitQty = cart.get(`${item.id}:${activeUnit}:${defaultSaleType}`) ?? 0;
              const remainingStock = getAvailableStockInBaseUnits(item.id, cart, items || []);
              const conversionFactor = getUnitConversionFactor(item, activeUnit);
              const canAddActiveUnit = remainingStock >= conversionFactor;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.units && item.units.length > 0) {
                      setEditingUnitsItem(item);
                    } else {
                      setExpandedItemId(prev => {
                        if (prev === item.id) return null;
                        
                        // Init default variant attributes
                        const initialAttrs: Record<string, string> = {};
                        if (item.variantAttributes && item.variants) {
                          item.variantAttributes.forEach(attr => {
                            const unique = [...new Set(item.variants!.map(v => v.attributes[attr]).filter(Boolean))];
                            if (unique.length > 0) initialAttrs[attr] = unique[0];
                          });
                        }
                        
                        setPerItemVariantAttrs(p => ({ ...p, [item.id]: initialAttrs }));
                        return item.id;
                      });
                    }
                  }}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 cursor-pointer",
                    totalQtyInCart > 0 ? "border-primary/40 shadow-lg ring-1 ring-primary/20 scale-[1.02]" : "border-border hover:border-primary/20 hover:shadow-md",
                    item.currentStock <= 0 && "opacity-75 grayscale-[0.5] cursor-not-allowed"
                  )}
                >
                  <div 
                    onClick={(e) => {
                      if (item.units && item.units.length > 0) {
                        e.stopPropagation();
                        setEditingUnitsItem(item);
                      }
                    }}
                    className="relative aspect-square overflow-hidden bg-muted/20"
                  >
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = ""; 
                          (e.target as HTMLImageElement).className = "hidden"; 
                        }}
                      />
                    ) : null}
                    
                    {/* Fallback icon */}
                    <div className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-muted/30 to-muted/10 text-muted-foreground/20 transition-opacity duration-300",
                      item.imageUrl ? "opacity-0 group-hover:opacity-10" : "opacity-100"
                    )}>
                      <Package className="h-10 w-10 stroke-[1.5]" />
                      <span className="text-[10px] font-black tracking-[0.2em] opacity-50 uppercase">No Image</span>
                    </div>

                    {/* Multi-unit badge if applicable */}
                    {item.units && item.units.length > 0 && (
                      <div className="absolute top-2 left-2 z-10 rounded-md bg-black/40 backdrop-blur-md px-1.5 py-0.5 text-[8px] font-black text-white uppercase tracking-wider">
                        Multi-Unit
                      </div>
                    )}

                    {/* Glassmorphism overlays */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                    {/* Top Right Badge: Total footprints in Cart */}
                    {totalQtyInCart > 0 && (
                      <div className={cn(
                        "absolute right-2 top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-primary px-1.5 text-[14px] font-black text-primary-foreground shadow-xl shadow-primary/40 ring-2 ring-background z-10 animate-in zoom-in-50",
                        isAnimating && "scale-125 rotate-12"
                      )}>
                        {totalQtyInCart}
                      </div>
                    )}
                    
                    {/* Bottom Left Badge: Stock Status */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "h-6 px-2 text-[10px] font-bold backdrop-blur-md border-none shadow-sm",
                          remainingStock <= 0
                            ? "bg-destructive/90 text-destructive-foreground"
                            : remainingStock <= (item.reorderPoint || 5) 
                              ? "bg-amber-500/90 text-amber-950" 
                              : "bg-background/80 text-foreground"
                        )}
                      >
                        {remainingStock <= 0 ? "Out of Stock" : `${remainingStock} in stock`}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-1 p-3.5">
                    <p className="text-[14px] font-bold leading-tight line-clamp-1 text-foreground group-hover:text-primary transition-colors">{item.name}</p>
                    {item.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">{item.description}</p>
                    )}

                    {/* 1-Tap Inline Unit Selector Pills */}
                    {item.units && item.units.length > 0 && (
                      <div 
                        className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 mt-1.5 whitespace-nowrap select-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Base Unit Pill */}
                        {(() => {
                          const baseUnitName = item.unit;
                          const baseUnitQty = cart.get(`${item.id}:${baseUnitName}:${defaultSaleType}`) ?? 0;
                          const isActive = activeUnit === baseUnitName;
                          return (
                            <button
                              key={baseUnitName}
                              type="button"
                              onClick={() => {
                                setActiveUnits(prev => ({ ...prev, [item.id]: baseUnitName }));
                              }}
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all border shrink-0",
                                isActive 
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                  : "bg-muted hover:bg-muted/80 text-muted-foreground border-transparent"
                              )}
                            >
                              {baseUnitName}{baseUnitQty > 0 ? ` (${baseUnitQty})` : ""}
                            </button>
                          );
                        })()}

                        {/* Secondary Unit Pills */}
                        {item.units.map((u) => {
                          const secondaryUnitQty = cart.get(`${item.id}:${u.name}:${defaultSaleType}`) ?? 0;
                          const isActive = activeUnit === u.name;
                          return (
                            <button
                              key={u.name}
                              type="button"
                              onClick={() => {
                                setActiveUnits(prev => ({ ...prev, [item.id]: u.name }));
                              }}
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all border shrink-0",
                                isActive 
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                  : "bg-muted hover:bg-muted/80 text-muted-foreground border-transparent"
                              )}
                            >
                              {u.name}{secondaryUnitQty > 0 ? ` (${secondaryUnitQty})` : ""}
                            </button>
                          );
                        })}

                        {/* Bulk Drawer Pill */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUnitsItem(item);
                          }}
                          className="px-2 py-0.5 rounded-full text-[9px] font-black bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all shrink-0"
                        >
                          Bulk ⚙️
                        </button>
                      </div>
                    )}

                    <div className="mt-auto flex items-end justify-between pt-1">
                      <div className="flex flex-col">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{activeUnit}</p>
                        <p className="text-base font-black text-primary leading-none mt-0.5">{formatNaira(activeUnitPrice)}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-bold opacity-40 uppercase tracking-tighter">{item.sku}</span>
                    </div>
                  </div>

                  {/* Quick +/- controls (always visible) */}
                  <div className="flex items-center border-t border-border bg-muted/5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={activeUnitQty === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(`${item.id}:${activeUnit}:${defaultSaleType}`);
                      }}
                      className="flex h-11 flex-1 items-center justify-center text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive disabled:opacity-10 active:scale-90"
                    >
                      <Minus className="h-4.5 w-4.5" />
                    </button>
                    <div className="w-px h-5 bg-border/50" />
                    {editingQtyItemId === `${item.id}:${activeUnit}` ? (
                      <input
                        type="number"
                        autoFocus
                        min={0}
                        max={remainingStock + activeUnitQty}
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
                        className="w-12 h-8 text-center text-xs font-bold font-mono text-foreground bg-background border border-primary/40 rounded-md outline-none focus:ring-1 focus:ring-primary/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingQtyItemId(`${item.id}:${activeUnit}`);
                          setEditingQtyValue(String(activeUnitQty));
                        }}
                        className="px-2 min-w-[32px] h-8 text-xs font-bold font-mono text-foreground hover:bg-primary/5 rounded-md transition-colors flex items-center justify-center gap-1 group/qty"
                        title="Click to edit quantity"
                      >
                        {activeUnitQty}
                        <Edit3 className="h-2.5 w-2.5 opacity-0 group-hover/qty:opacity-50 transition-opacity" />
                      </button>
                    )}
                    <div className="w-px h-5 bg-border/50" />
                    <button
                      type="button"
                      disabled={item.currentStock <= 0 || !canAddActiveUnit}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(`${item.id}:${activeUnit}:${defaultSaleType}`);
                      }}
                      className="flex h-11 flex-1 items-center justify-center text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary disabled:opacity-10 active:scale-90"
                    >
                      <Plus className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Inline Expander Panel (for single-unit items) */}
                  {expandedItemId === item.id && !(item.units && item.units.length > 0) && (() => {
                    const itemAttrs = perItemVariantAttrs[item.id] || {};
                    const hasVariants = item.variants && item.variants.length > 0;
                    const hasCustomFields = item.customFields && Object.keys(item.customFields).length > 0;
                    const expanderSaleType = defaultSaleType;

                    let expanderUnitPrice = getCartItemUnitPrice(item, activeUnit, expanderSaleType);
                    let cartKey = `${item.id}:${activeUnit}:${expanderSaleType}`;
                    let activeVariant = null;
                    let displayLabel = item.name;
                    let displayStock = remainingStock;

                    if (hasVariants) {
                      activeVariant = item.variants!.find(v =>
                        item.variantAttributes!.every(attr => {
                          const sel = itemAttrs[attr] || [...new Set(item.variants!.map(v2 => v2.attributes[attr]).filter(Boolean))][0];
                          return v.attributes[attr] === sel;
                        })
                      ) || item.variants![0];
                      expanderUnitPrice = activeVariant.price;
                      cartKey = `${item.id}:${activeVariant.id}:${expanderSaleType}`;
                      displayLabel = Object.values(activeVariant.attributes).join(" / ");
                      displayStock = activeVariant.stock;
                    }

                    const expanderUnitQty = cart.get(cartKey) ?? 0;
                    
                    return (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="border-t border-border/80 bg-muted/20 p-3 space-y-3 animate-in slide-in-from-bottom-2 duration-200"
                    >
                      {/* Price & Stock Info */}
                      <div className="flex items-start justify-between text-[11px]">
                        <div>
                          <p className="font-extrabold text-foreground truncate max-w-[150px]">{displayLabel}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Stock: <span className="font-bold">{displayStock}</span> {hasVariants ? "units" : item.unit}
                          </p>
                          {/* Custom Fields */}
                          {hasCustomFields && !hasVariants && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {Object.entries(item.customFields || {}).map(([k, v]) => (
                                <Badge key={k} variant="secondary" className="text-[8px] px-1.5 py-0 h-4 opacity-70 truncate max-w-[100px]">{k}: {String(v)}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="font-black text-primary text-[13px]">{formatNaira(expanderUnitPrice)}</p>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">
                            {expanderSaleType}
                          </p>
                        </div>
                      </div>

                      {/* Variant Attributes Interactive Selectors */}
                      {hasVariants && item.variantAttributes && item.variantAttributes.length > 0 && (
                        <div className="space-y-3 pb-2 border-b border-border/50">
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
                                  {selectedVal && <span className="text-primary normal-case">— {selectedVal}</span>}
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {uniqueValues.map(val => {
                                    const isActive = selectedVal === val;
                                    const hexColor = isColourAttr ? getColorHex(val) : null;

                                    // Check if this value has available stock
                                    const hasStock = item.variants!.some(v => {
                                      if (v.attributes[attrName] !== val) return false;
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
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
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
                        </div>
                      )}

                      {/* Quantity Selector & Add to Cart */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <div className="flex items-center border rounded-lg bg-background shrink-0">
                          <button
                            type="button"
                            disabled={expanderUnitQty <= 0}
                            onClick={() => onRemove(cartKey)}
                            className="p-1.5 text-muted-foreground disabled:opacity-20 hover:text-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={displayStock}
                            value={expanderUnitQty || ""}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              onSetQuantity(cartKey, Math.max(0, val));
                            }}
                            className="w-10 h-6 text-center text-[10px] font-mono font-bold bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            disabled={displayStock <= 0 || expanderUnitQty >= displayStock}
                            onClick={() => handleAdd(cartKey)}
                            className="p-1.5 text-muted-foreground disabled:opacity-20 hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <Button
                          type="button"
                          disabled={displayStock <= 0 || expanderUnitQty >= displayStock}
                          onClick={() => handleAdd(cartKey)}
                          className="flex-1 h-7.5 text-[10px] font-black px-0"
                        >
                          <ShoppingCart className="mr-1 h-3 w-3" />
                          Add
                        </Button>
                      </div>
                    </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Sell button - truly floating over content */}
      {totalItems > 0 && createPortal(
        <div className="pointer-events-none fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex justify-center w-full max-w-md px-4 transition-all duration-300">
          <button
            type="button"
            onClick={() => {
              const event = new CustomEvent("pos-go-to-cart");
              window.dispatchEvent(event);
            }}
            className={cn(
              "pointer-events-auto flex items-center gap-2.5 rounded-full px-6 py-3 text-primary-foreground shadow-2xl transition-all hover:scale-105 active:scale-95 font-bold",
              businessType === "restaurant"
                ? "bg-emerald-600 shadow-emerald-600/30 hover:shadow-emerald-600/40"
                : "bg-primary shadow-primary/60 hover:shadow-primary/80"
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="text-sm font-semibold">Sell</span>
            <span className="text-xs text-primary-foreground/70">·</span>
            <span className="text-sm font-mono">
              {NAIRA}{totalNaira.toLocaleString("en-NG", { minimumFractionDigits: 0 })}
            </span>
            <Badge variant="secondary" className="ml-1 h-6 min-w-6 rounded-full px-1.5 text-xs font-bold bg-primary-foreground/20 text-primary-foreground">
              {totalItems}
            </Badge>
          </button>
        </div>,
        document.body
      )}

      {/* Bulk All Units Drawer */}
      <Sheet open={editingUnitsItem !== null} onOpenChange={(open) => { if (!open) setEditingUnitsItem(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto">
          {editingUnitsItem && (
            <div className="space-y-4">
              <SheetHeader className="text-left pb-2 border-b">
                <SheetTitle className="text-base font-bold flex items-center justify-between">
                  <span>{editingUnitsItem.name} - Bulk Units</span>
                  <span className="text-xs text-muted-foreground font-mono">{editingUnitsItem.sku}</span>
                </SheetTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Remaining Available Stock: <span className="font-bold font-mono text-primary">{getAvailableStockInBaseUnits(editingUnitsItem.id, cart, items || [])}</span> {editingUnitsItem.unit}
                </p>
              </SheetHeader>

              <div className="space-y-3">
                {/* Render Base Unit Row */}
                {(() => {
                  const unitName = editingUnitsItem.unit;
                    const cartKey = `${editingUnitsItem.id}:${unitName}:${defaultSaleType}`;
                    const qty = cart.get(cartKey) ?? 0;
                    const price = defaultSaleType === "wholesale" ? (editingUnitsItem.wholesalePrice ?? editingUnitsItem.sellingPrice) : editingUnitsItem.sellingPrice;
                  const conversionFactor = 1;
                  const availableBaseStock = getAvailableStockInBaseUnits(editingUnitsItem.id, cart, items || []);
                  const maxAddable = Math.floor(availableBaseStock / conversionFactor);
                  
                  return (
                    <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                      <div>
                        <p className="text-sm font-bold">{unitName} <span className="text-xs font-normal text-muted-foreground">(Base Unit)</span></p>
                        <p className="text-xs text-primary font-mono font-semibold">{formatNaira(price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          disabled={qty <= 0}
                          onClick={() => onSetQuantity(`${editingUnitsItem.id}:${unitName}`, qty - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={qty || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            onSetQuantity(`${editingUnitsItem.id}:${unitName}`, val);
                          }}
                          className="w-12 h-8 text-center text-xs font-mono p-0"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          disabled={maxAddable <= 0}
                          onClick={() => onSetQuantity(`${editingUnitsItem.id}:${unitName}`, qty + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* Render Secondary Units */}
                {editingUnitsItem.units?.map((u) => {
                  const unitName = u.name;
                  const cartKey = `${editingUnitsItem.id}:${unitName}:${defaultSaleType}`;
                  const qty = cart.get(cartKey) ?? 0;
                  const basePrice = defaultSaleType === "wholesale" ? (editingUnitsItem.wholesalePrice ?? editingUnitsItem.sellingPrice) : editingUnitsItem.sellingPrice;
                  const price = u.sellingPrice ?? (basePrice * u.conversionFactor);
                  const conversionFactor = u.conversionFactor;
                  const availableBaseStock = getAvailableStockInBaseUnits(editingUnitsItem.id, cart, items || []);
                  const maxAddable = Math.floor(availableBaseStock / conversionFactor);

                  return (
                    <div key={unitName} className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                      <div>
                        <p className="text-sm font-bold">{unitName}</p>
                        <p className="text-xs text-muted-foreground">1 {unitName} = {conversionFactor} {editingUnitsItem.unit}</p>
                        <p className="text-xs text-primary font-mono font-semibold mt-0.5">{formatNaira(price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          disabled={qty <= 0}
                          onClick={() => onSetQuantity(`${editingUnitsItem.id}:${unitName}`, qty - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={qty || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            onSetQuantity(`${editingUnitsItem.id}:${unitName}`, val);
                          }}
                          className="w-12 h-8 text-center text-xs font-mono p-0"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          disabled={maxAddable <= 0}
                          onClick={() => onSetQuantity(`${editingUnitsItem.id}:${unitName}`, qty + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <Button className="w-full sm:w-auto" onClick={() => setEditingUnitsItem(null)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <QRScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={handleBarcodeSubmit}
      />

      {/* Unknown Barcode Dialog */}
      <Dialog open={!!unknownBarcode} onOpenChange={(v) => {
        if (!v) {
          setUnknownBarcode(null);
          setIsLinking(false);
          setLinkSearch("");
        }
      }}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl bg-card p-0 overflow-hidden">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-foreground">
                Unknown Barcode Scanned
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm">
                The barcode <span className="font-mono font-bold text-primary">{unknownBarcode}</span> was not found in your inventory.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6">
              {!isLinking ? (
                <div className="space-y-3">
                  <Button 
                    className="w-full justify-start h-12 text-sm font-bold" 
                    onClick={() => {
                      navigate(`/app/catalog?newItem=true&newBarcode=${unknownBarcode}`);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Product
                  </Button>
                  
                  {can("edit_item") && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-12 text-sm font-bold"
                      onClick={() => setIsLinking(true)}
                    >
                      <ScanBarcode className="mr-2 h-4 w-4" />
                      Link to Existing Product
                    </Button>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    className="w-full mt-2"
                    onClick={() => setUnknownBarcode(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoFocus
                      placeholder="Search product to link..."
                      className="pl-9"
                      value={linkSearch}
                      onChange={(e) => setLinkSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
                    {items?.filter(i => 
                      !linkSearch || 
                      i.name.toLowerCase().includes(linkSearch.toLowerCase()) || 
                      i.sku.toLowerCase().includes(linkSearch.toLowerCase())
                    ).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (!unknownBarcode) return;
                          toast.loading("Linking barcode...", { id: "link-barcode" });
                          updateItem.mutate({ id: item.id, updates: { barcode: unknownBarcode } }, {
                            onSuccess: () => {
                              handleAdd(`${item.id}:${item.unit}`);
                              toast.success(`Linked barcode to ${item.name} and added to cart`, { id: "link-barcode" });
                              setUnknownBarcode(null);
                              setIsLinking(false);
                              setSearch("");
                            },
                            onError: () => toast.error("Failed to link barcode", { id: "link-barcode" })
                          });
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40 transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-bold truncate max-w-[200px]">{item.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-primary">{formatNaira(item.sellingPrice)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{item.currentStock} in stock</p>
                        </div>
                      </button>
                    ))}
                    
                    {items?.filter(i => 
                      !linkSearch || 
                      i.name.toLowerCase().includes(linkSearch.toLowerCase()) || 
                      i.sku.toLowerCase().includes(linkSearch.toLowerCase())
                    ).length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">No products found</p>
                    )}
                  </div>

                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => {
                      setIsLinking(false);
                      setLinkSearch("");
                    }}
                  >
                    Back
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
