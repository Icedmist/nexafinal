import { useState, useMemo } from "react";
import { User, Phone, CreditCard, Tag, Percent, Wallet, Banknote, Smartphone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Item, SaleTransaction } from "@/types/inventory";
import type { Discount } from "@/types/finance";
import { SalesReceipt } from "./SalesReceipt";
import { useSalesMutations } from "@/hooks/useSalesData";
import { notifyActivity } from "@/lib/notification-service";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";

const NAIRA = "₦";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface CheckoutItem {
  item: Item;
  quantity: number;
}

interface SalesStepCheckoutProps {
  items: CheckoutItem[];
  onComplete: () => void;
}

export function SalesStepCheckout({ items, onComplete }: SalesStepCheckoutProps) {
  const { profile } = useBusiness();
  const { addSale } = useSalesMutations();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [lastSale, setLastSale] = useState<SaleTransaction | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ type: "percentage" | "flat"; value: number } | null>(null);
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [payOnCredit, setPayOnCredit] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "card">("cash");
  const [unitOverrides, setUnitOverrides] = useState<Record<string, string>>({});

  // Get current price for an item based on its selected unit
  const getItemPrice = (ci: CheckoutItem) => {
    const selectedUnitName = unitOverrides[ci.item.id];
    if (selectedUnitName) {
      const unit = ci.item.units?.find(u => u.name === selectedUnitName);
      if (unit) {
        // Use override price if set, otherwise calculate from base price
        return unit.sellingPrice ?? (ci.item.sellingPrice * unit.conversionFactor);
      }
    }
    return ci.item.sellingPrice;
  };

  const subtotal = items.reduce((s, ci) => s + getItemPrice(ci) * ci.quantity, 0);
  const [isProcessing, setIsProcessing] = useState(false);


  // Calculate discount
  const discountAmount = useMemo(() => {
    let amt = 0;
    if (discount) {
      amt += discount.type === "percentage" ? subtotal * (discount.value / 100) : discount.value;
    }
    if (promoApplied) {
      const base = subtotal - amt;
      amt += promoApplied.type === "percentage" ? base * (promoApplied.value / 100) : promoApplied.value;
    }
    return Math.min(amt, subtotal);
  }, [subtotal, discount, promoApplied]);

  const total = subtotal - discountAmount;

  // Tax
  const taxRate = profile?.storeDetails?.taxRate ?? 0;
  const taxAmount = total * (taxRate / 100);
  const grandTotal = total + taxAmount;


  const knownCustomers = new Map<string, string>();
  const customerSuggestions: any[] = [];

  const handlePhoneChange = (value: string) => {
    setCustomerPhone(value);
  };

  const handleApplyPromo = () => {
    toast.error("Promos are currently disabled during migration");
  };

  const { user, claims } = useAuth();
  const handleCheckout = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const saleData: any = {
      customerName: customerName.trim() || null,
      customerPhone: customerPhone.trim() || null,
      customerEmail: customerEmail.trim() || null,
      items: items.map((ci) => {
        const selectedUnitName = unitOverrides[ci.item.id];
        const unit = ci.item.units?.find(u => u.name === selectedUnitName);
        const price = getItemPrice(ci);
        
        return {
          itemId: ci.item.id,
          itemName: ci.item.name,
          sku: ci.item.sku,
          quantity: ci.quantity,
          unitPriceNgn: price,
          imageUrl: ci.item.imageUrl || null,
          selectedUnit: selectedUnitName || ci.item.unit,
          conversionFactor: unit?.conversionFactor || 1,
        };
      }),

      totalNgn: grandTotal,
      paymentMethod,
      isCreditSale: payOnCredit,
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addSale(saleData);
      const sale = { id: docRef?.id || `sale-${Date.now()}`, ...saleData };
      setLastSale(sale);
      
      await notifyActivity(
        "sale",
        "Sale Recorded",
        `A sale of ${NAIRA}${grandTotal.toLocaleString()} was recorded by ${user?.email || "Staff"}.`,
        user?.uid || "unknown",
        user?.email || "unknown",
        claims?.storeId,
        claims?.branchId,
        { saleId: sale.id, total: grandTotal }
      );

      toast.success(`Sale recorded — ${NAIRA}${grandTotal.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`);
    } catch (err) {
      console.error("Checkout Error:", err);
      toast.error("Failed to record sale");
    } finally {
      setIsProcessing(false);
    }
  };

  if (lastSale) {
    return (
      <SalesReceipt
        sale={lastSale}
        onClose={() => { setLastSale(null); onComplete(); }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-4 overflow-y-auto">
      {/* Customer details */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Customer Details</h3>
          <p className="text-xs text-muted-foreground">Optional — helps with receipts and repeat tracking</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="checkout-phone" className="text-xs">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="checkout-phone" value={customerPhone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="08012345678" className="pl-10 h-11 font-mono" />
            </div>
            {customerPhone.length >= 8 && knownCustomers.has(customerPhone) && (
              <p className="text-xs text-primary">✓ Returning customer — {knownCustomers.get(customerPhone)}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="checkout-name" className="text-xs">Customer Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="checkout-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Chidi Okonkwo" className="pl-10 h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="checkout-email" className="text-xs">Email Address (Optional)</Label>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="checkout-email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@example.com" className="pl-10 h-11" />
            </div>
          </div>
          {/* Auto-suggest dropdown */}
          {customerSuggestions.length > 0 && (customerName.length >= 2 || customerPhone.length >= 3) && (
            <div className="rounded-lg border border-border bg-card p-1 space-y-0.5">
              <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Suggestions</p>
              {customerSuggestions.map((s) => (
                <button
                  key={s.phone}
                  type="button"
                  onClick={() => { setCustomerName(s.name); setCustomerPhone(s.phone); }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                >
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground font-mono ml-auto">{s.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Discount & Promo */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Discounts & Promos</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Discount Type</Label>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={discount?.type === "percentage" ? "default" : "outline"}
                className="flex-1 h-9 text-xs gap-1"
                onClick={() => setDiscount(discount?.type === "percentage" ? null : { type: "percentage", value: discount?.value ?? 0 })}
              >
                <Percent className="h-3 w-3" /> %
              </Button>
              <Button
                type="button"
                size="sm"
                variant={discount?.type === "flat" ? "default" : "outline"}
                className="flex-1 h-9 text-xs gap-1"
                onClick={() => setDiscount(discount?.type === "flat" ? null : { type: "flat", value: discount?.value ?? 0 })}
              >
                {NAIRA} Flat
              </Button>
            </div>
          </div>
          {discount && (
            <div className="space-y-1.5">
              <Label className="text-xs">Value</Label>
              <Input
                type="number"
                value={discount.value || ""}
                onChange={(e) => setDiscount({ ...discount, value: Number(e.target.value) })}
                placeholder={discount.type === "percentage" ? "e.g. 10" : "e.g. 500"}
                className="h-9"
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Promo Code</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="WELCOME10" className="pl-10 h-9 font-mono text-xs" />
            </div>
            <Button size="sm" variant="outline" onClick={handleApplyPromo} className="h-9">Apply</Button>
          </div>
          {promoApplied && <p className="text-xs text-primary">✓ Promo applied: {promoApplied.type === "percentage" ? `${promoApplied.value}% off` : `${NAIRA}${promoApplied.value} off`}</p>}
        </div>

        {/* Credit toggle */}
        <button
          type="button"
          onClick={() => setPayOnCredit(!payOnCredit)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all w-full ${payOnCredit ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
        >
          <Wallet className="h-4 w-4" />
          {payOnCredit ? "Paying on credit ✓" : "Add to customer credit"}
        </button>
      </div>

      <Separator className="my-4" />

      {/* Payment Method */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Payment Method</h3>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: "cash" as const, label: "Cash", icon: Banknote },
            { id: "transfer" as const, label: "Transfer", icon: Smartphone },
            { id: "card" as const, label: "Card", icon: CreditCard },
          ]).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPaymentMethod(m.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all",
                paymentMethod === m.id
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              <m.icon className="h-5 w-5" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Order summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Order Summary</h3>
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
          {items.map((ci) => {
            const hasMultiUnits = ci.item.units && ci.item.units.length > 0;
            const price = getItemPrice(ci);
            
            return (
              <div key={ci.item.id} className="space-y-2">
                <div className="flex justify-between items-start text-xs">
                  <div className="flex-1 min-w-0 pr-4">
                    <span className="font-medium text-foreground block truncate">{ci.item.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-muted-foreground whitespace-nowrap">Qty: {ci.quantity}</span>
                      {hasMultiUnits && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">in</span>
                          <Select
                            value={unitOverrides[ci.item.id] || ci.item.unit}
                            onValueChange={(val) => setUnitOverrides(prev => ({ ...prev, [ci.item.id]: val }))}
                          >
                            <SelectTrigger className="h-6 w-auto min-w-[60px] px-2 text-[10px] py-0 border-none bg-background/50 hover:bg-background transition-colors rounded-md shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ci.item.unit} className="text-[10px]">{ci.item.unit} (Base)</SelectItem>
                              {ci.item.units?.map(u => (
                                <SelectItem key={u.name} value={u.name} className="text-[10px]">
                                  {u.name} (x{u.conversionFactor})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-foreground shrink-0 pt-0.5">
                    {NAIRA}{(price * ci.quantity).toLocaleString("en-NG", { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            );
          })}
          
          {items.length > 0 && (
            <div className="pt-2 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono text-foreground font-medium">{NAIRA}{subtotal.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[11px] text-primary">
                  <span>Discount</span>
                  <span className="font-mono">-{NAIRA}{discountAmount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Tax ({taxRate}%)</span>
                  <span className="font-mono">+{NAIRA}{taxAmount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Total and checkout button */}
      <div className="mt-auto pt-5 space-y-3">
        <div className="flex items-center justify-between text-xl font-bold">
          <span>Total</span>
          <span className="font-mono">{NAIRA}{grandTotal.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
        </div>
        <Button 
          onClick={handleCheckout} 
          className="w-full gap-2 h-12 text-base rounded-xl" 
          size="lg"
          disabled={isProcessing}
        >
          <CreditCard className={cn("h-5 w-5", isProcessing && "animate-pulse")} />
          {isProcessing ? "Processing..." : (payOnCredit ? "Record Credit Sale" : "Complete Sale")}
        </Button>
      </div>
    </div>
  );
}
