import { useState, useMemo } from "react";
import { User, Phone, CreditCard, Tag, Percent, Wallet, Banknote, Smartphone, MessageCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PriceModeSelector } from "./PriceModeSelector";
import type { SalePriceMode } from "./price-utils";
import { getItemPriceForMode } from "./price-utils";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Item, SaleTransaction } from "@/types/inventory";
import type { Discount } from "@/types/finance";
import { SalesReceipt } from "./SalesReceipt";
import { useSalesMutations, useSales, useDebtPayments } from "@/hooks/useSalesData";
import { notifyActivity } from "@/lib/notification-service";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";

const NAIRA = "₦";



export interface CheckoutItem {
  item: Item;
  quantity: number;
  selectedUnit: string;
  cartKey: string;
  saleType?: SalePriceMode;
  customPrice?: number;
}

function getCartItemUnitPrice(item: Item, unitName: string, saleType: SalePriceMode = "retail"): number {
  return getItemPriceForMode(item, unitName, saleType);
}

interface SalesStepCheckoutProps {
  items: CheckoutItem[];
  onComplete: () => void;
  defaultSaleType?: SalePriceMode;
}

export function SalesStepCheckout({ items, onComplete, defaultSaleType = "retail" }: SalesStepCheckoutProps) {
  const { profile } = useBusiness();
  const businessType = profile?.businessType || "retail";
  const { addSale, recordDebtPayment } = useSalesMutations();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [lastSale, setLastSale] = useState<SaleTransaction | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [saleType, setSaleType] = useState<SalePriceMode>(defaultSaleType);
  const [promoApplied, setPromoApplied] = useState<{ type: "percentage" | "flat"; value: number } | null>(null);
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [payOnCredit, setPayOnCredit] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "card">("cash");
  const [amountPaid, setAmountPaid] = useState<string>("");
  // Get current price for an item based on its selected unit and sale type
  const getItemPrice = (ci: CheckoutItem) => {
    return ci.customPrice ?? getCartItemUnitPrice(ci.item, ci.selectedUnit, ci.saleType ?? saleType);
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

  const { data: sales = [] } = useSales();
  const { data: payments = [] } = useDebtPayments();
  const [includeDebt, setIncludeDebt] = useState(false);

  // Tax
  const taxRate = profile?.storeDetails?.taxRate ?? 0;
  const taxAmount = total * (taxRate / 100);

  const customerDebt = useMemo(() => {
    const qPhone = customerPhone.trim();
    if (!qPhone || qPhone.length < 8) return 0;
    const creditSales = sales.filter(s => s.isCreditSale && s.customerPhone === qPhone).reduce((sum, s) => sum + s.totalNgn, 0);
    const cleared = payments.filter(p => p.customerPhone === qPhone).reduce((sum, p) => sum + p.amountNgn, 0);
    return Math.max(0, creditSales - cleared);
  }, [customerPhone, sales, payments]);

  const grandTotal = total + taxAmount + (includeDebt && customerDebt > 0 ? customerDebt : 0);

  const changeGiven = useMemo(() => {
    const paid = parseFloat(amountPaid) || 0;
    return Math.max(0, paid - grandTotal);
  }, [amountPaid, grandTotal]);
  
  const customersList = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; email?: string; createdAt?: string }>();
    for (const sale of sales) {
      const phone = sale.customerPhone?.trim();
      if (!phone) continue;
      
      const name = sale.customerName?.trim() || "Customer";
      const email = sale.customerEmail?.trim();
      
      const existing = map.get(phone);
      if (!existing || (sale.createdAt && (!existing.createdAt || sale.createdAt > existing.createdAt))) {
        map.set(phone, {
          name,
          phone,
          email,
          createdAt: sale.createdAt
        });
      }
    }
    return Array.from(map.values());
  }, [sales]);

  const knownCustomers = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of customersList) {
      map.set(c.phone, c.name);
    }
    return map;
  }, [customersList]);

  const customerSuggestions = useMemo(() => {
    const qPhone = customerPhone.trim().toLowerCase();
    const qName = customerName.trim().toLowerCase();
    
    if (!qPhone && !qName) return [];

    return customersList.filter(c => {
      const matchPhone = qPhone && c.phone.toLowerCase().includes(qPhone);
      const matchName = qName && c.name.toLowerCase().includes(qName);
      
      const exactMatch = c.phone === customerPhone && c.name === customerName;
      if (exactMatch) return false;
      
      return matchPhone || matchName;
    });
  }, [customersList, customerPhone, customerName]);

  const handlePhoneChange = (value: string) => {
    setCustomerPhone(value);
    if (value.length >= 8) {
      const name = knownCustomers.get(value);
      if (name) {
        setCustomerName(name);
        const match = customersList.find(c => c.phone === value);
        if (match?.email) {
          setCustomerEmail(match.email);
        }
      }
    }
  };

  const handleApplyPromo = () => {
    toast.error("Promos are currently disabled during migration");
  };

  const { user, claims } = useAuth();
  const { storeId } = useBusiness();

  const recordedBy = user?.displayName || user?.email?.split('@')[0] || "Staff";
  
  const handleCheckout = async () => {
    if (isProcessing) return;
    
    // Validate required data
    if (!storeId && !claims?.storeId) {
      toast.error("Store context not loaded. Please refresh and try again.");
      return;
    }

    setIsProcessing(true);

    const saleData: any = {
      customerName: customerName.trim() || null,
      customerPhone: customerPhone.trim() || null,
      customerEmail: customerEmail.trim() || null,
      items: items.map((ci) => {
        const unit = ci.item.units?.find(u => u.name === ci.selectedUnit);
        const itemSaleType = ci.saleType ?? saleType;
        const price = ci.customPrice ?? getCartItemUnitPrice(ci.item, ci.selectedUnit, itemSaleType);
        
        return {
          itemId: ci.item.id,
          itemName: (() => {
            const variant = ci.item.variants?.find(v => v.id === ci.selectedUnit);
            return variant ? `${ci.item.name} - ${Object.values(variant.attributes).join(" / ")}` : ci.item.name;
          })(),
          sku: ci.item.sku,
          quantity: ci.quantity,
          unitPriceNgn: price,
          customPriceNgn: ci.customPrice,
          imageUrl: ci.item.imageUrl || null,
          selectedUnit: ci.selectedUnit,
          conversionFactor: unit?.conversionFactor || 1,
          salePriceMode: itemSaleType,
        };
      }),

      totalNgn: grandTotal,
      subtotalNgn: subtotal,
      discountAmountNgn: discountAmount,
      taxAmountNgn: taxAmount,
      taxRate: taxRate,
      amountPaidNgn: parseFloat(amountPaid) || grandTotal,
      changeGivenNgn: changeGiven,
      paymentMethod,
      isCreditSale: payOnCredit,
      debtSettledNgn: includeDebt && customerDebt > 0 ? customerDebt : 0,
      recordedByName: recordedBy,
      saleType: saleType,
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addSale(saleData);
      const sale = { id: docRef?.id || `sale-${Date.now()}`, ...saleData };
      setLastSale(sale);

      if (includeDebt && customerDebt > 0) {
        await recordDebtPayment({
          customerPhone: customerPhone.trim(),
          customerName: customerName.trim() || "Customer",
          amountNgn: customerDebt,
          notes: `Auto-settled with sale ${sale.id}`
        });
      }
      
      await notifyActivity({
        type: "sale",
        category: "sales",
        severity: "low",
        title: "Sale Recorded",
        message: `A sale of ${NAIRA}${grandTotal.toLocaleString()} was recorded by ${user?.displayName || user?.email || "Staff"}.`,
        userId: user?.uid || "unknown",
        userEmail: user?.email || "unknown",
        storeId: claims?.storeId as string,
        branchId: claims?.branchId,
        metadata: { 
          saleId: sale.id, 
          total: grandTotal,
          order: sale // Pass full order for receipt template
        }
      });

      toast.success(`Sale recorded — ${NAIRA}${grandTotal.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`);
    } catch (err: any) {
      console.error("Checkout Error:", err);
      toast.error(err?.message || "Failed to record sale. Check your permissions and try again.");
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
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        {/* Customer details */}
        <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Customer Details</h3>
            <p className="text-xs text-muted-foreground">Optional — helps with receipts and repeat tracking</p>
          </div>
          <PriceModeSelector
            value={saleType}
            onValueChange={setSaleType}
            label="Sale Type"
          />
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="checkout-phone" className="text-xs">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="checkout-phone" value={customerPhone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="08012345678" className="pl-10 h-11 font-mono" />
            </div>
            {customerPhone.length >= 8 && knownCustomers.has(customerPhone) && (
              <p className={cn("text-xs", businessType === "restaurant" ? "text-emerald-600" : "text-primary")}>✓ Returning customer — {knownCustomers.get(customerPhone)}</p>
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
          {customerSuggestions.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-1 space-y-0.5">
              <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Suggestions</p>
              {customerSuggestions.map((s) => (
                <button
                  key={s.phone}
                  type="button"
                  onClick={() => { 
                    setCustomerName(s.name); 
                    setCustomerPhone(s.phone); 
                    if (s.email) setCustomerEmail(s.email);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                >
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground font-mono ml-auto">{s.phone}</span>
                </button>
              ))}
            </div>
          )}
          {customerDebt > 0 && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 flex flex-col gap-2 mt-2">
              <div className="flex items-start gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Outstanding Debt</p>
                  <p className="text-xs">This customer owes {NAIRA}{customerDebt.toLocaleString("en-NG")}</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={includeDebt} 
                  onChange={(e) => setIncludeDebt(e.target.checked)} 
                  className="rounded border-destructive/30 text-destructive focus:ring-destructive" 
                />
                Include debt settlement in this transaction
              </label>
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
                variant={discount?.type === "percentage" ? (businessType === "restaurant" ? "secondary" : "default") : "outline"}
                className={cn(
                  "flex-1 h-9 text-xs gap-1",
                  discount?.type === "percentage" && businessType === "restaurant" && "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
                onClick={() => setDiscount(discount?.type === "percentage" ? null : { type: "percentage", value: discount?.value ?? 0 })}
              >
                <Percent className="h-3 w-3" /> %
              </Button>
              <Button
                type="button"
                size="sm"
                variant={discount?.type === "flat" ? (businessType === "restaurant" ? "secondary" : "default") : "outline"}
                className={cn(
                  "flex-1 h-9 text-xs gap-1",
                  discount?.type === "flat" && businessType === "restaurant" && "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
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
          {promoApplied && <p className={cn("text-xs", businessType === "restaurant" ? "text-emerald-600" : "text-primary")}>✓ Promo applied: {promoApplied.type === "percentage" ? `${promoApplied.value}% off` : `${NAIRA}${promoApplied.value} off`}</p>}
        </div>

        {/* Credit toggle */}
        <button
          type="button"
          onClick={() => setPayOnCredit(!payOnCredit)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all w-full",
            payOnCredit
              ? (businessType === "restaurant" ? "border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500" : "border-primary bg-primary/10 text-primary")
              : (businessType === "restaurant" ? "border-border text-muted-foreground hover:border-emerald-600/40" : "border-border text-muted-foreground hover:border-primary/40")
          )}
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
                  ? (businessType === "restaurant" ? "border-emerald-600 bg-emerald-500/10 text-emerald-600 shadow-sm" : "border-primary bg-primary/10 text-primary shadow-sm")
                  : (businessType === "restaurant" ? "border-border text-muted-foreground hover:border-emerald-600/40" : "border-border text-muted-foreground hover:border-primary/40")
              )}
            >
              <m.icon className="h-5 w-5" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Amount Paid (for Cash) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Payment Details</h3>
          {parseFloat(amountPaid) > grandTotal && (
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
              Change: {NAIRA}{changeGiven.toLocaleString()}
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amount-paid" className="text-xs">Amount Received</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">{NAIRA}</span>
            <Input 
              id="amount-paid" 
              type="number" 
              value={amountPaid} 
              onChange={(e) => setAmountPaid(e.target.value)} 
              placeholder={grandTotal.toString()} 
              className="pl-8 h-11 font-mono text-lg font-black" 
            />
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Order summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Order Summary</h3>
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
          {items.map((ci) => {
            const price = getItemPrice(ci);
            
            return (
              <div key={ci.cartKey} className="space-y-2">
                <div className="flex justify-between items-start text-xs">
                  <div className="flex-1 min-w-0 pr-4">
                    {(() => {
                      const variant = ci.item.variants?.find(v => v.id === ci.selectedUnit);
                      const displayLabel = variant 
                        ? `${ci.item.name} - ${Object.values(variant.attributes).join(" / ")}`
                        : ci.item.name;
                      return (
                        <>
                          <span className="font-medium text-foreground block truncate">{displayLabel}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-muted-foreground whitespace-nowrap">Qty: {ci.quantity} {variant ? "unit" : ci.selectedUnit}</span>
                            {ci.customPrice !== undefined && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold px-1.5 py-0.5 rounded border border-amber-500/20">
                                Custom Price
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}
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
                <div className={cn("flex justify-between text-[11px]", businessType === "restaurant" ? "text-emerald-600" : "text-primary")}>
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
              {includeDebt && customerDebt > 0 && (
                <div className="flex justify-between text-[11px] text-destructive">
                  <span>Debt Settlement</span>
                  <span className="font-mono">+{NAIRA}{customerDebt.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Total and checkout button */}
      </div>
      <div className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-4 space-y-3">
        <div className="flex items-center justify-between text-xl font-bold">
          <span>Total</span>
          <span className="font-mono">{NAIRA}{grandTotal.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
        </div>
        <Button 
          onClick={handleCheckout} 
          className={cn(
            "w-full gap-2 h-12 text-base rounded-xl",
            businessType === "restaurant" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
          )}
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
