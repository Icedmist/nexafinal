import { useState, useMemo } from "react";
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";
import { CalendarIcon, Receipt, TrendingUp, Printer, MessageCircle, RotateCcw, User, Clock, CreditCard, Banknote, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSales } from "@/hooks/useSalesData";
import { useRole } from "@/hooks/useRole";
import { useBusiness } from "@/contexts/BusinessContext";
import { useStoreBranches } from "@/hooks/useStaffData";
import { EmptyState } from "@/components/shared/EmptyState";
import type { SaleTransaction } from "@/types/inventory";
import { toast } from "sonner";

const NAIRA = "₦";

function fmtNgn(amount: number): string {
  return `${NAIRA}${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

export function SalesHistoryPage() {
  const { data: sales, isLoading } = useSales();
  const { role, isAdmin } = useRole();
  const { profile } = useBusiness();
  const { data: branches } = useStoreBranches();

  const [from, setFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [to, setTo] = useState<Date | undefined>(new Date());
  const [selectedSale, setSelectedSale] = useState<SaleTransaction | null>(null);

  const filtered = useMemo(() => {
    if (!from && !to) return sales;
    return sales.filter((s) => {
      const d = new Date(s.createdAt);
      if (from && to) return isWithinInterval(d, { start: startOfDay(from), end: endOfDay(to) });
      if (from) return d >= startOfDay(from);
      if (to) return d <= endOfDay(to);
      return true;
    });
  }, [sales, from, to]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalRevenue = filtered.reduce((s, t) => s + t.totalNgn, 0);
  const totalTransactions = filtered.length;
  const totalItems = filtered.reduce((s, t) => s + t.items.reduce((a, li) => a + li.quantity, 0), 0);

  const storeName = profile?.storeDetails?.name || "NEXA Store OS";
  const userName = role === "admin" ? "Admin" : role === "manager" ? "Manager" : "Staff";

  const handleSendReceipt = (sale: SaleTransaction) => {
    if (!sale.customerPhone) {
      toast.error("No phone number on this sale. Cannot send receipt.");
      return;
    }
    const lines = [
      `🧾 *${storeName}*`,
      `Receipt #${sale.id.slice(-8).toUpperCase()}`,
      `Date: ${format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}`,
      sale.customerName ? `Customer: ${sale.customerName}` : "",
      "",
      "─────────────────",
      ...sale.items.map((li) => `${li.itemName}\n  ${li.quantity} × ${fmtNgn(li.unitPriceNgn)} = ${fmtNgn(li.unitPriceNgn * li.quantity)}`),
      "─────────────────",
      `*TOTAL: ${fmtNgn(sale.totalNgn)}*`,
      "",
      "Thank you! 🙏",
    ].filter(Boolean).join("\n");
    const phone = sale.customerPhone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines)}`, "_blank");
  };

  return (
    <div className={cn("mx-auto max-w-[1200px] space-y-6 flex flex-col", filtered.length === 0 && "min-h-[60vh] justify-center")}>
      {/* Header with date and user */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Sales History</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest italic">Store Revenue & Performance</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-sm text-foreground justify-end font-bold">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-black uppercase tracking-tight">{userName} Session</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground justify-end font-black uppercase tracking-widest">
              <Clock className="h-3 w-3" />
              {format(new Date(), "dd MMM yyyy, HH:mm")}
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="nexa-card bg-card p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="h-12 w-12 text-primary" />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Total Revenue
            </div>
            <p className="mt-2 text-3xl font-black font-mono text-primary tracking-tighter">{fmtNgn(totalRevenue)}</p>
          </div>
          <div className="nexa-card bg-card p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Receipt className="h-12 w-12 text-secondary" />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Transactions
            </div>
            <p className="mt-2 text-3xl font-black font-mono text-foreground tracking-tighter">{totalTransactions}</p>
          </div>
          <div className="nexa-card bg-card p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Receipt className="h-12 w-12 text-emerald-500" />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Items Sold
            </div>
            <p className="mt-2 text-3xl font-black font-mono text-foreground tracking-tighter">{totalItems}</p>
          </div>
        </div>
      )}

      {/* Date filters */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-muted/20 p-2 rounded-2xl border border-border/50 w-fit">
          <DatePicker label="From" date={from} onSelect={setFrom} />
          <DatePicker label="To" date={to} onSelect={setTo} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFrom(undefined); setTo(undefined); }}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Reset
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <EmptyState
            icon={Receipt}
            title="No sales history found"
            description="You haven't processed any sales yet or the selected date range has no data."
            actionLabel="Start Selling"
            onAction={() => window.location.href = "/app/sales"}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((sale) => (
            <Card
              key={sale.id}
              className="group cursor-pointer nexa-card-hover"
              onClick={() => setSelectedSale(sale)}
            >
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
                    #{sale.id.slice(-6)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-base leading-none">{sale.customerName || "Walk-in Customer"}</h3>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{format(new Date(sale.createdAt), "dd MMM, HH:mm")}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black tracking-tight text-foreground">{fmtNgn(sale.totalNgn)}</p>
                    <p className="text-[10px] font-bold text-primary/70 uppercase">{sale.items.reduce((s, li) => s + li.quantity, 0)} items</p>
                    {isAdmin && sale.branchId && (
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                        {branches.find(b => b.id === sale.branchId)?.name || "Branch"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                   <div className="flex items-center gap-2">
                     <PaymentIcon method={(sale as SaleWithPayment).paymentMethod} />
                     <span className="text-[10px] font-bold text-muted-foreground uppercase">{(sale as SaleWithPayment).paymentMethod || "Cash"}</span>
                   </div>
                   <div className="flex items-center gap-1 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                     View Details <TrendingUp className="h-3 w-3" />
                   </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sale detail sheet */}
      <Dialog open={!!selectedSale} onOpenChange={(o) => !o && setSelectedSale(null)}>
        <DialogContent className="max-w-md p-0 border-none bg-transparent shadow-none [&>button]:hidden">
          {selectedSale && (
            <div className="nexa-card bg-card p-6 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Sale Details</DialogTitle>
                <button 
                  onClick={() => setSelectedSale(null)}
                  className="rounded-full p-2 hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-1 w-full bg-primary/20" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider">Transaction ID</span>
                  <span className="font-mono font-black text-foreground">#{selectedSale.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider">Date & Time</span>
                  <span className="font-bold text-foreground">{format(new Date(selectedSale.createdAt), "dd MMM yyyy, HH:mm")}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-border/50">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider">Payment Method</span>
                  <div className="flex items-center gap-1.5">
                    <PaymentIcon method={(selectedSale as SaleWithPayment).paymentMethod} />
                    <span className="capitalize font-black text-primary">{(selectedSale as SaleWithPayment).paymentMethod || "cash"}</span>
                  </div>
                </div>
                {isAdmin && selectedSale.branchId && (
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-border/50">
                    <span className="text-muted-foreground font-bold uppercase tracking-wider">Branch</span>
                    <span className="font-black text-foreground uppercase">{branches.find(b => b.id === selectedSale.branchId)?.name || "Main Branch"}</span>
                  </div>
                )}
              </div>

              {selectedSale.customerName && (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm border-primary/10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <User className="h-3 w-3" /> Customer Info
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black">{selectedSale.customerName}</span>
                    {selectedSale.customerPhone && (
                      <span className="text-xs font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">{selectedSale.customerPhone}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Items Purchased</h4>
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {selectedSale.items.map((li, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-foreground">{li.itemName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground">{li.quantity} x {fmtNgn(li.unitPriceNgn)}</p>
                      </div>
                      <span className="font-mono text-sm font-black text-foreground shrink-0">{fmtNgn(li.unitPriceNgn * li.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-primary/5 p-4 border border-primary/20 flex justify-between items-center shadow-inner">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Grand Total</span>
                <span className="text-3xl font-black font-mono tracking-tighter text-primary">{fmtNgn(selectedSale.totalNgn)}</span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  className="flex-1 gap-2 rounded-xl h-12 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
                  onClick={() => {
                    toast.success("Preparing receipt for print...");
                  }}
                >
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 gap-2 rounded-xl h-12 font-black uppercase text-xs tracking-widest border-2"
                  onClick={() => {
                    toast.info("Return functionality coming soon");
                  }}
                >
                  <RotateCcw className="h-4 w-4" /> Return
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Extended type for payment method
interface SaleWithPayment extends SaleTransaction {
  paymentMethod?: "cash" | "transfer" | "card";
}

function PaymentIcon({ method }: { method?: string }) {
  switch (method) {
    case "transfer":
      return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Smartphone className="h-3.5 w-3.5" /> Transfer</span>;
    case "card":
      return <span className="flex items-center gap-1 text-xs text-muted-foreground"><CreditCard className="h-3.5 w-3.5" /> Card</span>;
    default:
      return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Banknote className="h-3.5 w-3.5" /> Cash</span>;
  }
}

function DatePicker({
  label,
  date,
  onSelect,
}: {
  label: string;
  date: Date | undefined;
  onSelect: (d: Date | undefined) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-[180px] justify-start text-left font-normal", !date && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMM yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
