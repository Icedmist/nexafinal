import { useState, useMemo } from "react";
import { Minus, Plus, Trash2, User, Phone, X, ShoppingBag, Receipt, ArrowRightCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Item, SaleTransaction } from "@/types/inventory";
import { useDemo } from "@/hooks/useDemo";
import { toast } from "sonner";
import { SalesReceipt } from "./SalesReceipt";
import { cn } from "@/lib/utils";

const NAIRA = "₦";

export interface CartItem {
  item: Item;
  quantity: number;
}

interface SalesCartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

function fmtNgn(price: number, qty: number = 1): string {
  const ngn = price * qty;
  return `${NAIRA}${ngn.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

export function SalesCart({ open, onOpenChange, items, onAdd, onRemove, onClear }: SalesCartProps) {
  const { demoStore, bumpVersion } = useDemo();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [lastSale, setLastSale] = useState<SaleTransaction | null>(null);
  const total = items.reduce((s, ci) => s + ci.item.sellingPrice * ci.quantity, 0);

  // Auto-suggest customer name from past sales
  const knownCustomers = useMemo(() => {
    const sales = demoStore?.getSales() ?? [];
    const map = new Map<string, string>();
    for (const sale of sales) {
      if (sale.customerPhone && sale.customerName) {
        map.set(sale.customerPhone, sale.customerName);
      }
    }
    return map;
  }, [demoStore]);

  const handlePhoneChange = (value: string) => {
    setCustomerPhone(value);
    if (value.length >= 8) {
      const found = knownCustomers.get(value);
      if (found && !customerName) setCustomerName(found);
    }
  };

  const handleCheckout = () => {
    const sale: SaleTransaction = {
      id: `sale-${Date.now()}`,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      items: items.map((ci) => ({
        itemId: ci.item.id,
        itemName: ci.item.name,
        sku: ci.item.sku,
        quantity: ci.quantity,
        unitPriceNgn: ci.item.sellingPrice,
        imageUrl: ci.item.imageUrl ?? undefined,
      })),
      totalNgn: total,
      createdAt: new Date().toISOString(),
    };

    if (demoStore) {
      demoStore.addSale(sale);
      bumpVersion();
    }

    setLastSale(sale);
    toast.success(`Sale recorded — ${NAIRA}${total.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`);
    onClear();
    setCustomerName("");
    setCustomerPhone("");
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden nexa-card border-none bg-transparent shadow-none">
          <div className="nexa-card bg-card p-6 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black tracking-tight">Active Cart</DialogTitle>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{items.length} products selected</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={onClear} className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/5 hover:text-destructive">
                    <Trash2 className="h-3 w-3 mr-1.5" /> Clear
                  </Button>
                )}
                <button onClick={() => onOpenChange(false)} className="rounded-full p-2 hover:bg-muted transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4 animate-in fade-in zoom-in-95 duration-500">
                  <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center">
                    <ShoppingBag className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-black text-foreground">Your cart is empty</p>
                    <p className="text-sm font-medium text-muted-foreground italic">Add products from the catalog to begin a sale.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {items.map((ci) => (
                      <div key={ci.item.id} className="flex items-center gap-4 rounded-2xl border-2 border-border/50 bg-muted/5 p-4 hover:bg-muted/10 transition-all group">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ring-2 ring-border/50 group-hover:ring-primary/20 transition-all">
                          {ci.item.imageUrl ? (
                            <img src={ci.item.imageUrl} alt={ci.item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-2xl bg-muted/30">📦</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-foreground truncate">{ci.item.name}</p>
                          <p className="font-mono text-[10px] font-black text-primary uppercase tracking-wider">{fmtNgn(ci.item.sellingPrice)} Unit</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-muted/20 rounded-xl p-1 border border-border/50">
                            <button
                              type="button"
                              onClick={() => onRemove(ci.item.id)}
                              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center font-mono font-black text-sm">{ci.quantity}</span>
                            <button
                              type="button"
                              onClick={() => onAdd(ci.item.id)}
                              disabled={ci.quantity >= ci.item.currentStock}
                              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-primary/10 hover:text-primary text-muted-foreground disabled:opacity-20 transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="text-right min-w-[70px]">
                            <p className="font-mono font-black text-sm text-foreground">{fmtNgn(ci.item.sellingPrice, ci.quantity)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                       <User className="h-3.5 w-3.5 text-primary" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-primary">Customer Identification</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="customer-phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                          <Input
                            id="customer-phone"
                            value={customerPhone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            placeholder="080 1234 5678"
                            className="h-11 pl-10 rounded-xl border-2 font-mono font-black"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="customer-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                          <Input
                            id="customer-name"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Optional name"
                            className="h-11 pl-10 rounded-xl border-2 font-black"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {items.length > 0 && (
              <div className="mt-6 pt-6 border-t-2 border-border/50">
                <div className="flex items-end justify-between mb-6 px-1">
                  <div className="space-y-1">
                     <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order Total</span>
                     <p className="text-xs font-bold text-muted-foreground italic">Tax included in prices</p>
                  </div>
                  <p className="text-4xl font-black tracking-tighter text-foreground font-mono">
                    {NAIRA}{total.toLocaleString("en-NG", { minimumFractionDigits: 0 })}
                  </p>
                </div>
                <Button onClick={handleCheckout} className="w-full h-14 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/30 group">
                  Confirm and Complete Sale
                  <ArrowRightCircle className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt modal */}
      {lastSale && (
        <SalesReceipt sale={lastSale} onClose={() => setLastSale(null)} />
      )}
    </>
  );
}
