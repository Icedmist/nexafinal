import { useState, useMemo, useRef, useCallback } from "react";
import { Plus, Minus, Package, Search, X, TrendingUp, UserCheck, ScanBarcode, QrCode, ShoppingCart } from "lucide-react";
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

export function getCartItemUnitPrice(item: Item, unitName: string): number {
  if (unitName === item.unit) {
    return item.sellingPrice;
  }
  const secondaryUnit = item.units?.find((u) => u.name === unitName);
  if (secondaryUnit) {
    return secondaryUnit.sellingPrice ?? (item.sellingPrice * secondaryUnit.conversionFactor);
  }
  return item.sellingPrice;
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
}

export function SalesStepBrowse({ cart, onAdd, onRemove, onSetQuantity }: SalesStepBrowseProps) {
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
      const [itemId, unitName] = key.split(":");
      const item = (items || []).find((i) => i.id === itemId);
      if (item) {
        sum += getCartItemUnitPrice(item, unitName) * qty;
      }
    });
    return sum;
  }, [cart, items]);

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

  const handleAdd = useCallback((cartKey: string) => {
    onAdd(cartKey);
    const itemId = cartKey.split(":")[0];
    setAnimatingItems((prev) => new Set(prev).add(itemId));
    setTimeout(() => setAnimatingItems((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    }), 200);
  }, [onAdd]);

  const handleBarcodeSubmit = useCallback((val: string) => {
    const cleanCode = extractItemIdentifier(val);
    const query = cleanCode.trim().toLowerCase();
    if (!query) return;

    const item = (items || []).find(
      (i) => i.id.toLowerCase() === query || i.barcode?.toLowerCase() === query || i.sku.toLowerCase() === query
    );

    if (item) {
      handleAdd(`${item.id}:${item.unit}`);
      toast.success(`Added ${item.name}`);
      setSearch(""); // Clear for next scan
    } else {
      setUnknownBarcode(query);
    }
  }, [items, handleAdd]);

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
                    onClick={() => handleAdd(`${item.id}:${item.unit}`)}
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
            onAdd={handleAdd}
            onRemove={onRemove}
            onSetQuantity={onSetQuantity}
            animatingItems={animatingItems}
            setAnimatingItems={setAnimatingItems}
            activeUnits={activeUnits}
            setActiveUnits={setActiveUnits}
            items={items || []}
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
              const activeUnitPrice = getCartItemUnitPrice(item, activeUnit);
              const activeUnitQty = cart.get(`${item.id}:${activeUnit}`) ?? 0;
              const remainingStock = getAvailableStockInBaseUnits(item.id, cart, items || []);
              const conversionFactor = getUnitConversionFactor(item, activeUnit);
              const canAddActiveUnit = remainingStock >= conversionFactor;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.currentStock > 0 && canAddActiveUnit) {
                      handleAdd(`${item.id}:${activeUnit}`);
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
                          const baseUnitQty = cart.get(`${item.id}:${baseUnitName}`) ?? 0;
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
                          const secondaryUnitQty = cart.get(`${item.id}:${u.name}`) ?? 0;
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

                  <div className="flex items-center border-t border-border bg-muted/5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={activeUnitQty === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(`${item.id}:${activeUnit}`);
                      }}
                      className="flex h-11 flex-1 items-center justify-center text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive disabled:opacity-10 active:scale-90"
                    >
                      <Minus className="h-4.5 w-4.5" />
                    </button>
                    <div className="w-px h-5 bg-border/50" />
                    <span className="px-2 text-xs font-bold font-mono text-foreground min-w-[20px] text-center">
                      {activeUnitQty}
                    </span>
                    <div className="w-px h-5 bg-border/50" />
                    <button
                      type="button"
                      disabled={item.currentStock <= 0 || !canAddActiveUnit}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(`${item.id}:${activeUnit}`);
                      }}
                      className="flex h-11 flex-1 items-center justify-center text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary disabled:opacity-10 active:scale-90"
                    >
                      <Plus className="h-4.5 w-4.5" />
                    </button>
                  </div>
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
                  const qty = cart.get(`${editingUnitsItem.id}:${unitName}`) ?? 0;
                  const price = editingUnitsItem.sellingPrice;
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
                  const qty = cart.get(`${editingUnitsItem.id}:${unitName}`) ?? 0;
                  const price = u.sellingPrice ?? (editingUnitsItem.sellingPrice * u.conversionFactor);
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
