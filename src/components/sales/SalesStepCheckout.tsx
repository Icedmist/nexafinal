import { useState, useMemo } from "react";
import { User, Phone, CreditCard, Tag, Percent, Wallet, Banknote, Smartphone, MessageCircle, AlertTriangle, Trash2, Plus, Minus, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PriceModeSelector } from "./PriceModeSelector";
import type { SalePriceMode } from "./price-utils";
import { getItemPriceForMode, getConfigPrice, parseConfigString, summarizeConfig } from "./price-utils";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Item, SaleTransaction } from "@/types/inventory";
import type { Discount } from "@/types/finance";
import { SalesReceipt } from "./SalesReceipt";
import { useSalesMutations, useSales, useDebtPayments } from "@/hooks/useSalesData";
import { notifyActivity } from "@/lib/notification-service";
import { validatePromo, usePromo } from "@/lib/promos";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useRole } from "@/hooks/useRole";

const NAIRA = "₦";

export interface CheckoutItem {
  item: Item;
  quantity: number;
  selectedUnit: string;
  cartKey: string;
  saleType?: SalePriceMode;
  customPrice?: number;
  configString?: string;
}

function getCartItemUnitPrice(item: Item, unitName: string, saleType: SalePriceMode = "retail"): number {
  return getItemPriceForMode(item, unitName, saleType);
}

interface SalesStepCheckoutProps {
  items: CheckoutItem[];
  onComplete: () => void;
  defaultSaleType?: SalePriceMode;
  onSetQuantity?: (cartKey: string, quantity: number) => void;
  onUpdateCustomPrice?: (cartKey: string, customPrice?: number | null) => void;
  onRemove?: (cartKey: string) => void;
  packagingFee?: number;
  estimatedReadyTime?: number;
  orderType?: "dine_in" | "takeaway" | "delivery";
  tableNumber?: string;
}

export function SalesStepCheckout({
  items,
  onComplete,
  defaultSaleType = "retail",
  onSetQuantity,
  onUpdateCustomPrice,
  onRemove,
  packagingFee = 0,
  estimatedReadyTime = 0,
  orderType = "dine_in",
  tableNumber = "",
}: SalesStepCheckoutProps) {
  const { profile } = useBusiness();
  const { isAdmin } = useRole();
  const businessType = profile?.businessType || "retail";

  // Price lock setting (unlocked by default unless explicitly locked by admin)
  const isPriceEditingLocked = profile?.settings?.lockPriceAtCheckout ?? profile?.storeDetails?.lockPriceAtCheckout ?? false;
  const canEditPrice = !isPriceEditingLocked || isAdmin;

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

  // Tax rate override state
  const defaultTaxRate = profile?.storeDetails?.taxRate ?? 0;
  const [customTaxRate, setCustomTaxRate] = useState<string>(String(defaultTaxRate));

  const taxRate = useMemo(() => {
    const parsed = parseFloat(customTaxRate);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }, [customTaxRate]);

  // Get current price for an item based on its selected unit and sale type
  const getItemPrice = (ci: CheckoutItem) => {
    if (ci.configString) return getConfigPrice(ci.item, ci.configString);
    return ci.customPrice ?? getCartItemUnitPrice(ci.item, ci.selectedUnit, ci.saleType ?? saleType);
  };

  const subtotal = items.reduce((s, ci) => s + getItemPrice(ci) * ci.quantity, 0) + packagingFee;
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

  // Tax calculation
  const taxAmount = total * (taxRate / 100);

  const customerDebt = useMemo(() => {
    const qPhone = customerPhone.trim();
    if (!qPhone || qPhone.length < 8) return 0;
    const creditSales = sales.filter(s => s.isCreditSale && s.customerPhone === qPhone).reduce((sum, s) => sum + s.totalNgn, 0);
    const cleared = payments.filter(p => p.customerPhone === qPhone).reduce((sum, p) => sum + p.amountNgn, 0);
    return Math.max(0, creditSales - cleared);
  }, [customerPhone, sales, payments]);

  const grandTotal = total + taxAmount + (includeDebt && customerDebt > 0 ? customerDebt : 0);

  // Quick cash payment options
  const quickPayOptions = useMemo(() => {
    if (grandTotal <= 0) return [];
    const options = new Set<number>();
    const roundedTotal = Math.ceil(grandTotal);

    // Exact amount
    options.add(roundedTotal);

    // Common bills above grandTotal
    [1000, 2000, 5000, 10000, 20000, 50000].forEach((amt) => {
      if (amt >= grandTotal) options.add(amt);
    });

    return Array.from(options).sort((a, b) => a - b).slice(0, 5);
  }, [grandTotal]);

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
    if (!promoCode.trim()) {
      toast.error("Enter a promo code to apply");
      return;
    }
    const promo = validatePromo(promoCode);
    if (promo) {
      setPromoApplied({ type: promo.discountType, value: promo.discountValue });
      toast.success(`Promo "${promo.code}" applied!`);
    } else {
      setPromoApplied(null);
      toast.error("Invalid or expired promo code");
    }
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
        const price = ci.configString
          ? getConfigPrice(ci.item, ci.configString)
          : (ci.customPrice ?? getCartItemUnitPrice(ci.item, ci.selectedUnit, itemSaleType));
        const config = ci.configString ? parseConfigString(ci.configString) : null;

        return {
          itemId: ci.item.id,
          itemName: (() => {
            const variant = ci.item.variants?.find(v => v.id === ci.selectedUnit);
            const base = variant ? `${ci.item.name} - ${Object.values(variant.attributes).join(" / ")}` : ci.item.name;
            const summary = ci.configString ? summarizeConfig(ci.configString) : null;
            return summary ? `${base} (${summary})` : base;
          })(),
          sku: ci.item.sku,
          quantity: ci.quantity,
          unitPriceNgn: price,
          customPriceNgn: ci.customPrice,
          imageUrl: ci.item.imageUrl || null,
          selectedUnit: ci.selectedUnit,
          conversionFactor: unit?.conversionFactor || 1,
          salePriceMode: itemSaleType,
          size: config?.size?.name,
          addons: config?.addons,
          spiceLevel: config?.spiceLevel,
          kitchenNote: config?.note,
          configString: ci.configString,
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
      notes: businessType === "restaurant" ? `${orderType === "dine_in" ? `Dine-in (Table ${tableNumber})` : orderType === "takeaway" ? "Takeaway Order" : "Delivery Order"}${estimatedReadyTime > 0 ? ` - Cooking Ready: ~${estimatedReadyTime}m` : ""}${packagingFee > 0 ? ` (Packaging ₦${packagingFee})` : ""}` : undefined,
    };

    try {
      const docRef = await addSale(saleData);
      const sale = { id: docRef?.id || `sale-${Date.now()}`, ...saleData };
      setLastSale(sale);

      if (promoApplied && promoCode) usePromo(promoCode);

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
        storeId: (storeId || claims?.storeId) as string,
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
        <div className="space-y-2">
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
          {/* Quick cash shortcuts */}
          {quickPayOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  "h-7 text-xs font-mono font-medium border-dashed",
                  amountPaid === String(grandTotal) && "border-primary text-primary bg-primary/10"
                )}
                onClick={() => setAmountPaid(String(grandTotal))}
              >
                Exact ({NAIRA}{grandTotal.toLocaleString("en-NG")})
              </Button>
              {quickPayOptions.map((opt) => (
                <Button
                  key={opt}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-7 text-xs font-mono font-medium",
                    amountPaid === String(opt) && "border-primary text-primary bg-primary/10"
                  )}
                  onClick={() => setAmountPaid(String(opt))}
                >
                  {NAIRA}{opt.toLocaleString("en-NG")}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Order summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Order Summary ({items.length})</h3>
          {!canEditPrice && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
              <Lock className="h-3 w-3" /> Price locked by admin
            </span>
          )}
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              No items in checkout.
            </div>
          ) : (
            items.map((ci) => {
              const basePrice = ci.configString
                ? getConfigPrice(ci.item, ci.configString)
                : getCartItemUnitPrice(ci.item, ci.selectedUnit, ci.saleType ?? saleType);
              const price = getItemPrice(ci);
              const variant = ci.item.variants?.find(v => v.id === ci.selectedUnit);
              const displayLabel = variant 
                ? `${ci.item.name} - ${Object.values(variant.attributes).join(" / ")}`
                : ci.item.name;
              const configSummary = ci.configString ? summarizeConfig(ci.configString) : null;

              return (
                <div key={ci.cartKey} className="space-y-2 pb-2 border-b border-border/40 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-xs text-foreground block truncate">{displayLabel}</span>
                      <span className="text-[10px] text-muted-foreground">Unit: {variant ? "unit" : ci.selectedUnit}</span>
                      {configSummary && (
                        <span className="block text-[10px] font-medium text-amber-600 dark:text-amber-400 mt-0.5 truncate">{configSummary}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-xs text-foreground shrink-0">
                        {NAIRA}{(price * ci.quantity).toLocaleString("en-NG", { minimumFractionDigits: 0 })}
                      </span>
                      {onRemove && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemove(ci.cartKey)}
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Quantity & Unit Price Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {/* Quantity controls */}
                    <div className="flex items-center gap-1">
                      <Label className="text-[10px] text-muted-foreground mr-1">Qty:</Label>
                      {onSetQuantity ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 rounded border-border"
                            onClick={() => {
                              if (ci.quantity <= 1) {
                                onRemove?.(ci.cartKey);
                              } else {
                                onSetQuantity(ci.cartKey, ci.quantity - 1);
                              }
                            }}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={ci.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val > 0) {
                                onSetQuantity(ci.cartKey, val);
                              }
                            }}
                            className="h-6 w-11 text-center font-mono text-xs px-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 rounded border-border"
                            onClick={() => onSetQuantity(ci.cartKey, ci.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs font-mono font-medium">{ci.quantity}</span>
                      )}
                    </div>

                    {/* Unit Price Field */}
                    <div className="flex items-center gap-1">
                      <Label className="text-[10px] text-muted-foreground">Price/unit:</Label>
                      {canEditPrice && onUpdateCustomPrice ? (
                        <div className="flex items-center gap-1">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">{NAIRA}</span>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={ci.customPrice ?? basePrice}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 0) {
                                  onUpdateCustomPrice(ci.cartKey, val);
                                }
                              }}
                              className="h-6 w-24 pl-5 text-xs font-mono px-1 font-medium"
                              placeholder={String(basePrice)}
                            />
                          </div>
                          {ci.customPrice !== undefined && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              title="Reset price"
                              onClick={() => onUpdateCustomPrice(ci.cartKey, undefined)}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-mono font-semibold text-foreground">{NAIRA}{price.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {items.length > 0 && (
            <div className="pt-2 border-t border-border/50 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono text-foreground font-medium">{NAIRA}{(subtotal - packagingFee).toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
              </div>
              {packagingFee > 0 && (
                <div className="flex justify-between text-[11px] text-primary font-semibold">
                  <span>Container Packaging Surcharge</span>
                  <span className="font-mono">+{NAIRA}{packagingFee.toLocaleString("en-NG")}</span>
                </div>
              )}
              {businessType === "restaurant" && (
                <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider text-muted-foreground pt-1 border-t border-border/40">
                  <span>Dining Context</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{orderType === "dine_in" ? `Dine-in (Table ${tableNumber || "—"})` : orderType === "takeaway" ? "Takeaway" : "Delivery"}</span>
                </div>
              )}
              {estimatedReadyTime > 0 && businessType === "restaurant" && (
                <div className="flex justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                  <span>Est. Prep Time</span>
                  <span>~{estimatedReadyTime} mins</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className={cn("flex justify-between text-[11px]", businessType === "restaurant" ? "text-emerald-600" : "text-primary")}>
                  <span>Discount</span>
                  <span className="font-mono">-{NAIRA}{discountAmount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
                </div>
              )}

              {/* Tax with editable rate */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span>Tax Rate</span>
                  <div className="relative flex items-center">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={customTaxRate}
                      onChange={(e) => setCustomTaxRate(e.target.value)}
                      className="h-5 w-14 text-center font-mono text-[11px] px-1 py-0"
                      placeholder="0"
                    />
                    <span className="text-[10px] ml-0.5">%</span>
                  </div>
                </div>
                <span className="font-mono">+{NAIRA}{taxAmount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
              </div>

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
