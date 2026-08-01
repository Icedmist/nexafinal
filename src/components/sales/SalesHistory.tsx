import { useState, useMemo, useRef } from "react";
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";
import { exportSalesHistoryPDF } from "@/lib/pdf-export";
import { CalendarIcon, Receipt, TrendingUp, Printer, MessageCircle, RotateCcw, User, Clock, CreditCard, Banknote, Smartphone, X, Wallet, Upload, Eye, Check, ShoppingBag, Package, Layers, RefreshCw, FileEdit } from "lucide-react";
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
import { isAdminRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useSales, useSalesMutations } from "@/hooks/useSalesData";
import { useRole } from "@/hooks/useRole";
import { useBusiness } from "@/contexts/BusinessContext";
import { useStoreBranches } from "@/hooks/useStaffData";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import type { SaleTransaction } from "@/types/inventory";
import { toast } from "sonner";
import { useRefunds, useRefundsMutations } from "@/hooks/useRefundsData";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadImage } from "@/lib/storage";

const NAIRA = "₦";

function fmtNgn(amount: number): string {
  return `${NAIRA}${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

export function SalesHistoryPage() {
  const { data: sales, isLoading } = useSales();
  const { role, isAdmin } = useRole();
  const { profile } = useBusiness();
  const { data: branches } = useStoreBranches();

  const isGlobalViewer = isAdmin || role === "owner";

  const [from, setFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [to, setTo] = useState<Date | undefined>(new Date());
  const { data: refunds } = useRefunds();
  const { updateSaleStatus } = useSalesMutations();
  const [selectedSale, setSelectedSale] = useState<SaleTransaction | null>(null);
  const [collectionCodeInput, setCollectionCodeInput] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "cash" | "card" | "transfer" | "debit">("all");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [saleTypeFilter, setSaleTypeFilter] = useState<"all" | "retail" | "wholesale">("all");
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
  const { addRefund } = useRefundsMutations();

  const saleRefunds = useMemo(() => {
    if (!selectedSale || !refunds) return [];
    return refunds.filter((r) => r.saleId === selectedSale.id);
  }, [selectedSale, refunds]);

  const [refundSale, setRefundSale] = useState<SaleTransaction | null>(null);
  const [refundItemId, setRefundItemId] = useState<string>("");
  const [refundQty, setRefundQty] = useState<number>(1);
  const [refundReason, setRefundReason] = useState<string>("customer_return");
  const [refundNotes, setRefundNotes] = useState<string>("");
  const [isProcessingRefund, setIsProcessingRefund] = useState<boolean>(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const handleProofSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearProof = () => {
    setProofFile(null);
    setProofPreview(null);
    if (proofInputRef.current) proofInputRef.current.value = "";
  };

  const handleRefundSubmit = async () => {
    if (!refundSale || !refundItemId) return;
    const selectedItem = refundSale.items.find((i) => i.itemId === refundItemId);
    if (!selectedItem) return;

    if (refundQty < 1 || refundQty > selectedItem.quantity) {
      toast.error(`Invalid quantity. Must be between 1 and ${selectedItem.quantity}`);
      return;
    }

    setIsProcessingRefund(true);
    try {
      let proofImageUrl: string | undefined;
      if (proofFile) {
        try {
          const result = await uploadImage(proofFile, "refunds", `return_proof_${Date.now()}`);
          proofImageUrl = result.url;
        } catch (uploadErr) {
          toast.error("Failed to upload proof image, but refund will still be processed");
        }
      }

      await addRefund({
        saleId: refundSale.id,
        itemId: selectedItem.itemId,
        itemName: selectedItem.itemName,
        quantity: refundQty,
        amountNgn: selectedItem.unitPriceNgn * refundQty,
        reason: refundReason as any,
        notes: refundNotes,
        proofImageUrl,
        selectedUnit: selectedItem.selectedUnit,
        conversionFactor: selectedItem.conversionFactor,
        createdAt: new Date().toISOString(),
      });
      toast.success(`Refund processed successfully: ${fmtNgn(selectedItem.unitPriceNgn * refundQty)}`);
      setRefundSale(null);
      clearProof();
    } catch (err) {
      console.error(err);
      toast.error("Failed to process refund");
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const filtered = useMemo(() => {
    let list = sales;
    if (from || to) {
      list = list.filter((s) => {
        const d = new Date(s.createdAt);
        if (from && to) return isWithinInterval(d, { start: startOfDay(from), end: endOfDay(to) });
        if (from) return d >= startOfDay(from);
        if (to) return d <= endOfDay(to);
        return true;
      });
    }
    if (paymentFilter === "debit") {
      list = list.filter((s) => s.isCreditSale === true);
    } else if (paymentFilter !== "all") {
      list = list.filter((s) => (s as any).paymentMethod === paymentFilter);
    }
    if (selectedBranchId !== "all") {
      list = list.filter((s) => s.branchId === selectedBranchId);
    }
    if (saleTypeFilter !== "all") {
      list = list.filter((s) => {
        const hasRetail = s.items.some(i => i.salePriceMode === "retail" || !i.salePriceMode);
        const hasWholesale = s.items.some(i => i.salePriceMode === "wholesale");
        if (saleTypeFilter === "retail") return hasRetail || s.saleType === "retail" || s.saleType === "mixed";
        return hasWholesale || s.saleType === "wholesale" || s.saleType === "mixed";
      });
    }
    return list;
  }, [sales, from, to, paymentFilter, selectedBranchId, saleTypeFilter]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 flex flex-col animate-in fade-in duration-300">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-xl" />
            <Skeleton className="h-4 w-32 rounded-lg" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-xl" />
              <Skeleton className="h-9 w-24 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50 bg-card/60 rounded-2xl p-6 space-y-4">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-8 w-36 rounded-lg" />
              <Skeleton className="h-3 w-48 rounded-sm" />
            </Card>
          ))}
        </div>

        {/* Filters Panel Skeleton */}
        <Card className="border-border bg-card rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-10 w-44 rounded-xl" />
              <Skeleton className="h-10 w-44 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
              {isGlobalViewer && <Skeleton className="h-10 w-40 rounded-xl" />}
            </div>
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </Card>

        {/* Sales Cards Grid Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-border bg-card rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/20">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-4 w-12 rounded-sm" />
              </div>
              <div className="flex justify-between items-start pt-2">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32 rounded-md" />
                  <Skeleton className="h-4 w-24 rounded-sm" />
                </div>
                <div className="space-y-2 text-right flex flex-col items-end">
                  <Skeleton className="h-6 w-20 rounded-md" />
                  <Skeleton className="h-3.5 w-12 rounded-sm" />
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-4 w-28 rounded-sm" />
                <Skeleton className="h-4 w-20 rounded-sm" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalRevenue = filtered.reduce((s, t) => s + t.totalNgn, 0);
  const totalTransactions = filtered.length;
  const totalItems = filtered.reduce((s, t) => s + t.items.reduce((a, li) => a + li.quantity, 0), 0);

  const storeName = profile?.storeDetails?.name || "NEXA Store OS";
  const userName = role === "system_admin" ? "System Admin" : role === "owner" ? "Store Owner" : role === "admin" ? "Admin" : role === "manager" ? "Manager" : "Staff";

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Sales History</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest italic">Store Revenue & Performance</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 flex-wrap">
              {selectedSaleIds.length > 0 && (
                <Button 
                  size="sm" 
                  className="h-9 rounded-xl font-black uppercase text-[10px] tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/10 animate-in zoom-in-95 duration-200"
                  onClick={() => {
                    const selectedSales = sales.filter(s => selectedSaleIds.includes(s.id));
                    exportSalesHistoryPDF(selectedSales, storeName, `Manually Selected (${selectedSales.length} Sales)`);
                  }}
                >
                  Export Selected ({selectedSaleIds.length})
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest hover:bg-muted/50"
                onClick={() => {
                  const filterDesc = `Filtered Sales (${from ? format(from, "dd MMM") : "Start"} to ${to ? format(to, "dd MMM yyyy") : "Present"})`;
                  exportSalesHistoryPDF(filtered, storeName, filterDesc);
                }}
              >
                Export Filtered
              </Button>
              <Button 
                size="sm" 
                className="h-9 rounded-xl font-black uppercase text-[10px] tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/10"
                onClick={() => {
                  exportSalesHistoryPDF(sales, storeName, "All Transactions");
                }}
              >
                Export All
              </Button>
            </div>
            <div className="text-right hidden sm:block">
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

      {/* Segmented Payment Tabs */}
      {sales.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-border/40 pb-4">
          {([
            { id: "all" as const, label: "All Sales" },
            { id: "cash" as const, label: "Cash" },
            { id: "card" as const, label: "Card" },
            { id: "transfer" as const, label: "Transfer" },
            { id: "debit" as const, label: "Debit / Credit" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPaymentFilter(tab.id)}
              className={cn(
                "h-9 px-4 rounded-full text-xs font-black uppercase tracking-wider transition-all select-none active:scale-95 border-2",
                paymentFilter === tab.id
                  ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/10"
                  : "bg-background border-border/60 text-muted-foreground hover:border-primary/30"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Date & Branch filters */}
      {sales.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/10 p-3 rounded-2xl border border-border/40">
          <div className="flex flex-wrap items-center gap-3">
            <DatePicker label="From" date={from} onSelect={setFrom} />
            <DatePicker label="To" date={to} onSelect={setTo} />
            {(from || to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFrom(undefined); setTo(undefined); }}
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
          </div>

          {/* Global branch filtration for Owner / Admin */}
          {isGlobalViewer && Array.isArray(branches) && branches.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filter Branch:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="h-9 px-3 rounded-xl text-xs font-black uppercase tracking-wider bg-background border border-border/60 text-foreground hover:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all select-none"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sale type / price tier filtration */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filter Tier:</span>
            <select
              value={saleTypeFilter}
              onChange={(e) => setSaleTypeFilter(e.target.value as "all" | "retail" | "wholesale")}
              className="h-9 px-3 rounded-xl text-xs font-black uppercase tracking-wider bg-background border border-border/60 text-foreground hover:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all select-none"
            >
              <option value="all">All Sales</option>
              <option value="retail">Retail Only</option>
              <option value="wholesale">Wholesale Only</option>
            </select>
          </div>
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
          {filtered.map((sale) => {
            const hasRetail = sale.items.some(i => i.salePriceMode === "retail" || !i.salePriceMode);
            const hasWholesale = sale.items.some(i => i.salePriceMode === "wholesale");
            const saleMode = hasRetail && hasWholesale ? "Mixed" : hasWholesale ? "Wholesale" : "Retail";
            const ModeIcon = hasRetail && hasWholesale ? Layers : hasWholesale ? Package : ShoppingBag;

            return (
            <Card
              key={sale.id}
              className={cn(
                "group cursor-pointer nexa-card-hover border-2 transition-all",
                selectedSaleIds.includes(sale.id)
                  ? "border-primary bg-primary/[0.02]"
                  : sale.hasRefund
                  ? "border-destructive/30 bg-destructive/[0.01] hover:border-destructive/60"
                  : "border-border"
              )}
              onClick={() => setSelectedSale(sale)}
            >
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className={cn(
                        "h-5 w-5 rounded-md border flex items-center justify-center transition-all",
                        selectedSaleIds.includes(sale.id) 
                          ? "bg-primary border-primary text-primary-foreground scale-105" 
                          : "border-muted-foreground/30 hover:border-primary/50 bg-background"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSaleIds(prev => 
                          prev.includes(sale.id) 
                            ? prev.filter(id => id !== sale.id) 
                            : [...prev, sale.id]
                        );
                      }}
                    >
                      {selectedSaleIds.includes(sale.id) && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sale.hasRefund && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-destructive flex items-center gap-0.5 animate-pulse">
                        <RotateCcw className="h-3 w-3" /> Refunded
                      </span>
                    )}
                    {!sale.hasRefund && sale.status === "pending_pickup" && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Pending Pickup
                      </span>
                    )}
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 border",
                      saleMode === "Wholesale" ? "border-indigo-500/30 text-indigo-600 bg-indigo-500/5 dark:text-indigo-400" :
                      saleMode === "Mixed" ? "border-purple-500/30 text-purple-600 bg-purple-500/5 dark:text-purple-400" :
                      "border-sky-500/30 text-sky-600 bg-sky-500/5 dark:text-sky-400"
                    )} title={`${saleMode} Sale`}>
                      <ModeIcon className="h-3 w-3" />
                      {saleMode}
                    </span>
                    <span className={cn(
                      "text-[11px] font-mono font-medium uppercase tracking-wider",
                      sale.hasRefund ? "text-destructive font-bold" : "text-muted-foreground"
                    )}>
                      #{sale.id.slice(-6)}
                    </span>
                  </div>
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
                    <div className="mt-2 space-y-0.5">
                      <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest flex items-center justify-end gap-1">
                        <User className="h-2 w-2" /> {sale.recordedByName || "Staff"}
                      </p>
                      {isGlobalViewer && sale.branchId && Array.isArray(branches) && (
                        <p className="text-[9px] font-black text-primary/40 uppercase tracking-widest">
                          {branches.find(b => b.id === sale.branchId)?.name || "Branch"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                   <div className="flex items-center gap-2">
                     <PaymentIcon method={(sale as SaleWithPayment).paymentMethod} isCreditSale={sale.isCreditSale} />
                     {!sale.isCreditSale && (
                       <span className="text-[10px] font-bold text-muted-foreground uppercase">{(sale as SaleWithPayment).paymentMethod || "Cash"}</span>
                     )}
                     {sale.paymentStatus === "incomplete" && (
                       <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                         <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Incomplete Payment
                       </span>
                     )}
                     {sale.hasRefund && (
                       <span className="text-[10px] font-black text-destructive uppercase tracking-widest flex items-center gap-1 ml-2">
                         <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" /> Refunded
                       </span>
                     )}
                   </div>
                   <div className="flex items-center gap-1 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                     View Details <TrendingUp className="h-3 w-3" />
                   </div>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}

      {/* Sale detail sheet */}
      <Dialog open={!!selectedSale} onOpenChange={(o) => {
        if (!o) {
          setSelectedSale(null);
          setCollectionCodeInput("");
        }
      }}>
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
                <div className={cn("absolute top-0 right-0 h-1 w-full", selectedSale.hasRefund ? "bg-destructive/60" : "bg-primary/20")} />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider">Transaction ID</span>
                  <span className="font-mono font-black text-foreground">#{selectedSale.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider">Date & Time</span>
                  <span className="font-bold text-foreground">{format(new Date(selectedSale.createdAt), "dd MMM yyyy, HH:mm")}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-border/50">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider">Status</span>
                  {selectedSale.hasRefund ? (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-destructive/10 text-destructive px-2 py-0.5 rounded-full flex items-center gap-1">
                      <RotateCcw className="h-2.5 w-2.5" /> Refunded
                    </span>
                  ) : selectedSale.paymentStatus === "incomplete" ? (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" /> Incomplete Payment
                    </span>
                  ) : selectedSale.status === "pending_pickup" ? (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" /> Pending Pickup
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="h-2.5 w-2.5" /> Completed
                    </span>
                  )}
                </div>
                 <div className="flex justify-between items-center text-xs pt-2 border-t border-border/50">
                   <span className="text-muted-foreground font-bold uppercase tracking-wider">Payment Method</span>
                   <div className="flex items-center gap-1.5">
                     <PaymentIcon method={(selectedSale as SaleWithPayment).paymentMethod} isCreditSale={selectedSale.isCreditSale} />
                     {!selectedSale.isCreditSale && (
                       <span className="capitalize font-black text-primary">{(selectedSale as SaleWithPayment).paymentMethod || "cash"}</span>
                     )}
                   </div>
                 </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-border/50">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider">Cashier</span>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-primary/60" />
                    <span className="font-black text-foreground">{selectedSale.recordedByName || "Store Assistant"}</span>
                  </div>
                </div>
                {selectedSale.branchId && (
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-border/50">
                    <span className="text-muted-foreground font-bold uppercase tracking-wider">Branch</span>
                    <span className="font-black text-foreground uppercase">{Array.isArray(branches) ? (branches.find(b => b.id === selectedSale.branchId)?.name || "Main Branch") : "Main Branch"}</span>
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

              {/* Processed Refunds section */}
              {saleRefunds.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-bold text-destructive uppercase tracking-widest px-1 flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Refunds Processed
                  </h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {saleRefunds.map((ref) => (
                      <div key={ref.id} className="flex flex-col gap-1.5 p-3 rounded-xl border border-destructive/20 bg-destructive/5">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-foreground">{ref.itemName}</p>
                            <p className="text-[10px] text-muted-foreground">Qty: {ref.quantity} · {new Date(ref.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className="font-mono text-xs font-black text-destructive">-{fmtNgn(ref.amountNgn)}</span>
                        </div>
                        {ref.notes && (
                          <p className="text-[10px] text-muted-foreground leading-relaxed italic">Notes: {ref.notes}</p>
                        )}
                        {ref.proofImageUrl && (
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => setPreviewImage(ref.proofImageUrl!)}
                              className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                            >
                              <Eye className="h-3 w-3" /> View Proof Photo
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSale.status === "pending_pickup" && (
                <div className="pt-4 border-t border-border/50 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Collection Code Verification</Label>
                    <Input 
                      placeholder="Enter customer's pickup code..." 
                      className="rounded-xl border-2 h-11 font-mono font-bold uppercase text-center tracking-widest"
                      value={collectionCodeInput}
                      onChange={(e) => setCollectionCodeInput(e.target.value.toUpperCase())}
                    />
                  </div>
                  <Button 
                    className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 gap-2"
                    disabled={!collectionCodeInput.trim()}
                    onClick={async () => {
                      if (collectionCodeInput !== selectedSale.collectionCode) {
                        toast.error("Invalid Collection Code! Please check with the customer.");
                        return;
                      }
                      try {
                        await updateSaleStatus(selectedSale.id, "completed");
                        toast.success("Code verified! Order marked as picked up.");
                        setSelectedSale({...selectedSale, status: "completed"});
                        setCollectionCodeInput("");
                      } catch (err) {
                        toast.error("Failed to update status");
                      }
                    }}
                  >
                    <Check className="h-4 w-4" /> Verify Code & Approve
                  </Button>
                </div>
              )}

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
                    setRefundSale(selectedSale);
                    if (selectedSale.items && selectedSale.items.length > 0) {
                      setRefundItemId(selectedSale.items[0].itemId);
                      setRefundQty(1);
                    }
                    setRefundNotes("");
                    setRefundReason("customer_return");
                    setSelectedSale(null);
                  }}
                >
                  <RotateCcw className="h-4 w-4" /> Return
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Refund Dialog */}
      <Dialog open={!!refundSale} onOpenChange={(o) => !o && setRefundSale(null)}>
        <DialogContent className="rounded-3xl border-none p-0 bg-transparent shadow-none [&>button]:hidden sm:max-w-md">
          {refundSale && (
            <div className="nexa-card bg-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-destructive" />
                  Process Refund
                </DialogTitle>
                <button 
                  onClick={() => setRefundSale(null)}
                  className="rounded-full p-2 hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Select Item to Return</Label>
                  <Select 
                    value={refundItemId} 
                    onValueChange={(v) => {
                      setRefundItemId(v);
                      const item = refundSale.items.find(i => i.itemId === v);
                      if (item) setRefundQty(1);
                    }}
                  >
                    <SelectTrigger className="rounded-xl border-2 h-11">
                      <SelectValue placeholder="Choose an item..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {refundSale.items.map((i) => (
                        <SelectItem key={i.itemId} value={i.itemId}>
                          {i.itemName} (Sold: {i.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {refundItemId && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold text-muted-foreground uppercase">Quantity to Return</Label>
                        <span className="text-[10px] font-black text-muted-foreground">
                          Max available: {refundSale.items.find(i => i.itemId === refundItemId)?.quantity || 1}
                        </span>
                      </div>
                      <Input 
                        type="number" 
                        min={1} 
                        max={refundSale.items.find(i => i.itemId === refundItemId)?.quantity || 1} 
                        value={refundQty} 
                        onChange={(e) => setRefundQty(Number(e.target.value))} 
                        className="rounded-xl border-2 h-11 font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Reason for Return</Label>
                      <Select value={refundReason} onValueChange={setRefundReason}>
                        <SelectTrigger className="rounded-xl border-2 h-11">
                          <SelectValue placeholder="Select reason..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="customer_return">Customer Return <RefreshCw className="inline h-3.5 w-3.5 ml-1" /></SelectItem>
                          <SelectItem value="damaged">Damaged / Defective ⚠️</SelectItem>
                          <SelectItem value="wrong_item">Wrong Item Sent <Package className="inline h-3.5 w-3.5 ml-1" /></SelectItem>
                          <SelectItem value="pricing_error">Pricing/Billing Error <Banknote className="inline h-3.5 w-3.5 ml-1" /></SelectItem>
                          <SelectItem value="other">Other / Out of Stock <FileEdit className="inline h-3.5 w-3.5 ml-1" /></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Notes (Optional)</Label>
                      <Textarea 
                        value={refundNotes} 
                        onChange={(e) => setRefundNotes(e.target.value)} 
                        placeholder="Provide details about the return..." 
                        className="rounded-xl border-2" 
                        rows={3} 
                      />
                    </div>

                    {/* Proof of Return Image Upload */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Proof of Return (Photo)</Label>
                      <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-4">
                        {proofPreview ? (
                          <div className="relative">
                            <img src={proofPreview} alt="Proof preview" className="w-full h-40 object-cover rounded-lg" />
                            <button
                              type="button"
                              onClick={clearProof}
                              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center gap-2 cursor-pointer py-2">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <Upload className="h-5 w-5" />
                            </div>
                            <p className="text-xs font-medium text-muted-foreground">Tap to upload proof image</p>
                            <p className="text-[10px] text-muted-foreground/70">JPG, PNG up to 10MB</p>
                            <input
                              ref={proofInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleProofSelect}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {(() => {
                      const selectedItem = refundSale.items.find(i => i.itemId === refundItemId);
                      if (!selectedItem) return null;
                      return (
                        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex justify-between items-center shadow-inner mt-4">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Refund Amount</span>
                          <span className="text-2xl font-black font-mono tracking-tighter text-destructive">
                            {fmtNgn(selectedItem.unitPriceNgn * refundQty)}
                          </span>
                        </div>
                      );
                    })()}
                  </>
                )}

                <Button 
                  onClick={handleRefundSubmit} 
                  disabled={isProcessingRefund || !refundItemId} 
                  className="w-full gap-2 rounded-xl h-12 font-black uppercase text-xs tracking-widest bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20 mt-2"
                >
                  {isProcessingRefund ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" /> Process Refund
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Proof Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-lg p-2 rounded-2xl bg-card border border-border">
          {previewImage && (
            <img src={previewImage} alt="Return proof" className="w-full h-auto rounded-xl" />
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

function PaymentIcon({ method, isCreditSale }: { method?: string; isCreditSale?: boolean }) {
  if (isCreditSale) {
    return <span className="flex items-center gap-1 text-xs text-destructive font-black uppercase"><Wallet className="h-3.5 w-3.5 text-destructive" /> Debit</span>;
  }
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
