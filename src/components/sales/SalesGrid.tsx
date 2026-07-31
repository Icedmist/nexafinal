import { useState, useEffect, useCallback } from "react";
import { ShoppingCart, ArrowLeft, ArrowRight, Check, Scan } from "lucide-react";
import { type SalePriceMode, buildCartKey, parseCartKey, getItemPriceForMode } from "./price-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useItems } from "@/hooks/useInventoryData";
import { cn } from "@/lib/utils";
import { SalesStepBrowse } from "./SalesStepBrowse";
import { SalesStepCart, type CartItem } from "./SalesStepCart";
import { SalesStepCheckout } from "./SalesStepCheckout";
import { SalesQuickScanCheckout } from "./SalesQuickScanCheckout";
import { useBusiness } from "@/contexts/BusinessContext";
import type { OrderType } from "@/types/inventory";
import { useMemo } from "react";

const NAIRA = "₦";

const STEPS = [
  { id: "browse", label: "Browse", icon: ShoppingCart },
  { id: "cart", label: "Review", icon: ArrowRight },
  { id: "checkout", label: "Checkout", icon: Check },
] as const;

type StepId = (typeof STEPS)[number]["id"];

import type { Item } from "@/types/inventory";

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
    const { itemId: cartItemId, unitName } = parseCartKey(key);
    if (cartItemId === itemId) {
      const item = itemsList.find((i) => i.id === itemId);
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

export function SalesGrid() {
  const { data: items } = useItems();
  const { profile } = useBusiness();
  const businessType = profile?.businessType || "retail";
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [customPrices, setCustomPrices] = useState<Map<string, number>>(new Map());
  const [step, setStep] = useState<StepId>("browse");
  const [defaultSaleType, setDefaultSaleType] = useState<SalePriceMode>("retail");
  const [posMode, setPosMode] = useState<"standard" | "quickscan">("standard");
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [tableNumber, setTableNumber] = useState("");

  const goToCart = useCallback(() => setStep("cart"), []);

  // Listen for "Sell" button click from browse step
  useEffect(() => {
    const handler = () => goToCart();
    window.addEventListener("pos-go-to-cart", handler);
    return () => window.removeEventListener("pos-go-to-cart", handler);
  }, [goToCart]);

  const handleUpdateCustomPrice = (cartKey: string, price?: number | null) => {
    setCustomPrices((prev) => {
      const next = new Map(prev);
      if (price === null || price === undefined || isNaN(price) || price < 0) {
        next.delete(cartKey);
      } else {
        next.set(cartKey, price);
      }
      return next;
    });
  };

  const addToCart = (cartKey: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const { itemId, unitName } = parseCartKey(cartKey);
      const item = (items || []).find((i) => i.id === itemId);
      if (!item) return prev;

      const conversionFactor = getUnitConversionFactor(item, unitName);
      const availableBaseStock = getAvailableStockInBaseUnits(itemId, prev, items || []);
      if (availableBaseStock < conversionFactor) {
        return prev;
      }

      next.set(cartKey, (next.get(cartKey) ?? 0) + 1);
      return next;
    });
  };

  const addConfiguredToCart = (itemId: string, qty: number, unitId: string, configString: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const item = (items || []).find((i) => i.id === itemId);
      if (!item) return prev;
      const effectiveUnit = unitId || item.unit;
      const key = buildCartKey(itemId, effectiveUnit, defaultSaleType, configString);

      const conversionFactor = getUnitConversionFactor(item, effectiveUnit);
      const availableBaseStock = getAvailableStockInBaseUnits(itemId, prev, items || []);
      if (availableBaseStock < conversionFactor * qty) {
        return prev;
      }

      next.set(key, (next.get(key) ?? 0) + qty);
      return next;
    });
  };

  const removeFromCart = (cartKey: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const qty = (next.get(cartKey) ?? 0) - 1;
      if (qty <= 0) {
        next.delete(cartKey);
        setCustomPrices((cPrev) => {
          const cNext = new Map(cPrev);
          cNext.delete(cartKey);
          return cNext;
        });
      } else {
        next.set(cartKey, qty);
      }
      return next;
    });
  };

  const setQuantityInCart = (cartKey: string, qty: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const { itemId, unitName } = parseCartKey(cartKey);
      const item = (items || []).find((i) => i.id === itemId);
      if (!item) return prev;

      if (qty <= 0) {
        next.delete(cartKey);
        setCustomPrices((cPrev) => {
          const cNext = new Map(cPrev);
          cNext.delete(cartKey);
          return cNext;
        });
        return next;
      }

      const currentUnitQty = prev.get(cartKey) ?? 0;
      const conversionFactor = getUnitConversionFactor(item, unitName);
      const baseUnitsDiff = (qty - currentUnitQty) * conversionFactor;
      const availableBaseStock = getAvailableStockInBaseUnits(itemId, prev, items || []);

      if (availableBaseStock < baseUnitsDiff) {
        const maxAddableQty = Math.floor(availableBaseStock / conversionFactor);
        const cappedQty = currentUnitQty + maxAddableQty;
        if (cappedQty <= 0) {
          next.delete(cartKey);
          setCustomPrices((cPrev) => {
            const cNext = new Map(cPrev);
            cNext.delete(cartKey);
            return cNext;
          });
        } else {
          next.set(cartKey, cappedQty);
        }
      } else {
        next.set(cartKey, qty);
      }
      return next;
    });
  };

  const cartItems: CartItem[] = [];
  cart.forEach((qty, key) => {
    const { itemId, unitName, saleType, config } = parseCartKey(key);
    const item = (items || []).find((i) => i.id === itemId);
    if (item) {
      cartItems.push({
        item,
        quantity: qty,
        selectedUnit: unitName,
        cartKey: key,
        saleType,
        customPrice: customPrices.get(key),
        configString: config,
      });
    }
  });

  const totalItems = Array.from(cart.values()).reduce((s, q) => s + q, 0);
  const totalNaira = cartItems.reduce((s, ci) => {
    const unitPrice = ci.customPrice ?? getCartItemUnitPrice(ci.item, ci.selectedUnit, (ci.saleType as SalePriceMode) ?? defaultSaleType);
    return s + unitPrice * ci.quantity;
  }, 0);

  // Container packaging surcharge for takeaway/delivery restaurant orders
  const isRestaurant = businessType === "restaurant";
  const packagingFee = isRestaurant && (orderType === "takeaway" || orderType === "delivery") ? 500 : 0;

  // Estimated ready time by summing per-item kitchen prep time
  const estimatedReadyTime = useMemo(() => {
    return cartItems.reduce((sum, ci) => {
      const prep = ci.item.menuItemConfig?.prepTimeMinutes ?? 5;
      return sum + prep * ci.quantity;
    }, 0);
  }, [cartItems]);

  const totalNairaWithPackaging = totalNaira + packagingFee;

  const handleClearCart = () => {
    setCart(new Map());
    setCustomPrices(new Map());
  };

  const handleComplete = () => {
    setCart(new Map());
    setCustomPrices(new Map());
    setDefaultSaleType("retail");
    setStep("browse");
  };

  const stepIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header with mode toggle */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-foreground">Point of Sale</h1>
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border/40">
            <button
              type="button"
              onClick={() => setPosMode("standard")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                posMode === "standard"
                  ? (businessType === "restaurant" ? "bg-emerald-600 text-white shadow-sm" : "bg-primary text-primary-foreground shadow-sm")
                  : "text-muted-foreground hover:bg-muted-foreground/10"
              )}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Catalogue
            </button>
            <button
              type="button"
              onClick={() => setPosMode("quickscan")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                posMode === "quickscan"
                  ? (businessType === "restaurant" ? "bg-emerald-600 text-white shadow-sm" : "bg-primary text-primary-foreground shadow-sm")
                  : "text-muted-foreground hover:bg-muted-foreground/10"
              )}
            >
              <Scan className="h-3.5 w-3.5" />
              Quick Scan
            </button>
          </div>
        </div>

        {/* Step tabs (standard mode only) */}
        {posMode === "standard" && (
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id === "checkout" && cartItems.length === 0) return;
                  if (s.id === "cart" || s.id === "browse") setStep(s.id);
                  if (s.id === "checkout" && cartItems.length > 0) setStep(s.id);
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                  step === s.id
                    ? (businessType === "restaurant" ? "bg-emerald-600 text-white shadow-sm" : "bg-primary text-primary-foreground shadow-sm")
                    : i < stepIdx
                      ? (businessType === "restaurant" ? "bg-emerald-600/10 text-emerald-600" : "bg-primary/10 text-primary")
                      : "bg-muted text-muted-foreground",
                  s.id === "checkout" && cartItems.length === 0 && "opacity-40 cursor-not-allowed"
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold">
                  {i + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {posMode === "quickscan" ? (
        <SalesQuickScanCheckout />
      ) : (
        <>
          {/* Step content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {step === "browse" && (
              <SalesStepBrowse 
                cart={cart} 
                onAdd={addToCart} 
                onRemove={removeFromCart} 
                onSetQuantity={setQuantityInCart} 
                defaultSaleType={defaultSaleType}
                onDefaultSaleTypeChange={setDefaultSaleType}
                onAddConfigured={addConfiguredToCart}
                orderType={orderType}
                tableNumber={tableNumber}
                onOrderTypeChange={setOrderType}
                onTableNumberChange={setTableNumber}
              />
            )}
            {step === "cart" && (
              <SalesStepCart
                items={cartItems}
                onAdd={addToCart}
                onRemove={removeFromCart}
                onSetQuantity={setQuantityInCart}
                onUpdateCustomPrice={handleUpdateCustomPrice}
                onClear={handleClearCart}
                onNext={() => setStep("checkout")}
                packagingFee={packagingFee}
                estimatedReadyTime={estimatedReadyTime}
              />
            )}
            {step === "checkout" && (
              <SalesStepCheckout
                items={cartItems}
                onComplete={handleComplete}
                defaultSaleType={defaultSaleType}
                onSetQuantity={setQuantityInCart}
                onUpdateCustomPrice={handleUpdateCustomPrice}
                onRemove={removeFromCart}
                packagingFee={packagingFee}
                estimatedReadyTime={estimatedReadyTime}
                orderType={orderType}
                tableNumber={tableNumber}
              />
            )}
          </div>

          {/* Bottom navigation between steps */}
          {step !== "browse" && (
            <div className="border-t border-border bg-card px-4 py-3 flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(step === "checkout" ? "cart" : "browse")}
                className="gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              {step === "cart" && (
                <div className="ml-auto text-sm font-mono font-bold">
                  {NAIRA}{totalNairaWithPackaging.toLocaleString("en-NG", { minimumFractionDigits: 0 })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
