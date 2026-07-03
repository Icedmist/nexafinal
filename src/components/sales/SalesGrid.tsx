import { useState, useEffect, useCallback } from "react";
import { ShoppingCart, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useItems } from "@/hooks/useInventoryData";
import { cn } from "@/lib/utils";
import { SalesStepBrowse } from "./SalesStepBrowse";
import { SalesStepCart, type CartItem } from "./SalesStepCart";
import { SalesStepCheckout } from "./SalesStepCheckout";
import { useBusiness } from "@/contexts/BusinessContext";

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

export function SalesGrid() {
  const { data: items } = useItems();
  const { profile } = useBusiness();
  const businessType = profile?.businessType || "retail";
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [step, setStep] = useState<StepId>("browse");

  const goToCart = useCallback(() => setStep("cart"), []);

  // Listen for "Sell" button click from browse step
  useEffect(() => {
    const handler = () => goToCart();
    window.addEventListener("pos-go-to-cart", handler);
    return () => window.removeEventListener("pos-go-to-cart", handler);
  }, [goToCart]);

  const addToCart = (cartKey: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const [itemId, unitName] = cartKey.split(":");
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

  const removeFromCart = (cartKey: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const qty = (next.get(cartKey) ?? 0) - 1;
      if (qty <= 0) next.delete(cartKey);
      else next.set(cartKey, qty);
      return next;
    });
  };

  const setQuantityInCart = (cartKey: string, qty: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const [itemId, unitName] = cartKey.split(":");
      const item = (items || []).find((i) => i.id === itemId);
      if (!item) return prev;

      if (qty <= 0) {
        next.delete(cartKey);
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
    const [itemId, unitName] = key.split(":");
    const item = (items || []).find((i) => i.id === itemId);
    if (item) {
      cartItems.push({
        item,
        quantity: qty,
        selectedUnit: unitName,
        cartKey: key,
      });
    }
  });

  const totalItems = Array.from(cart.values()).reduce((s, q) => s + q, 0);
  const totalNaira = cartItems.reduce((s, ci) => s + getCartItemUnitPrice(ci.item, ci.selectedUnit) * ci.quantity, 0);

  const handleComplete = () => {
    setCart(new Map());
    setStep("browse");
  };

  const stepIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Step indicator header */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-foreground">Point of Sale</h1>
          {totalItems > 0 && step === "browse" && (
            <Button
              size="sm"
              className={cn("gap-2", businessType === "restaurant" && "bg-emerald-600 hover:bg-emerald-700 text-white")}
              onClick={goToCart}
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 rounded-full px-1 text-[10px]">
                {totalItems}
              </Badge>
            </Button>
          )}
        </div>

        {/* Step tabs */}
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
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {step === "browse" && (
          <SalesStepBrowse 
            cart={cart} 
            onAdd={addToCart} 
            onRemove={removeFromCart} 
            onSetQuantity={setQuantityInCart} 
          />
        )}
        {step === "cart" && (
          <SalesStepCart
            items={cartItems}
            onAdd={addToCart}
            onRemove={removeFromCart}
            onClear={() => setCart(new Map())}
            onNext={() => setStep("checkout")}
          />
        )}
        {step === "checkout" && (
          <SalesStepCheckout items={cartItems} onComplete={handleComplete} />
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
              {NAIRA}{totalNaira.toLocaleString("en-NG", { minimumFractionDigits: 0 })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
