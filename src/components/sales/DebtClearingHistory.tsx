import { useState, useMemo } from "react";
import {
  CheckSquare, Clock, Phone, User, ChevronDown, ChevronUp,
  Calendar, TrendingUp, Users, Wallet, Filter, Search,
  UserCheck, ArrowDownRight, History, Download,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import type { SaleTransaction, DebtPayment } from "@/types/inventory";
import { normalizePhone } from "@/lib/utils";
import { useBusiness } from "@/contexts/BusinessContext";
import { exportDebtHistoryPDF } from "@/lib/pdf-export";
import { getSaleOutstanding } from "@/lib/credit-sale";

const NAIRA = "₦";

type TimeFrame = "today" | "this-week" | "this-month" | "all-time";

interface DebtClearingHistoryProps {
  payments: DebtPayment[];
  sales: SaleTransaction[];
}

function getTimeFrameStart(tf: TimeFrame): Date {
  const now = new Date();
  switch (tf) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "this-week": {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "this-month": {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    case "all-time":
    default:
      return new Date(0);
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

function daysSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

interface CustomerDebtProfile {
  name: string;
  phone: string;
  totalCreditSales: number;
  totalPayments: number;
  currentBalance: number;
  payments: DebtPayment[];
  creditSales: SaleTransaction[];
  fullyCleared: boolean;
  lastPaymentDate: string | null;
}

export function DebtClearingHistory({ payments, sales }: DebtClearingHistoryProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("all-time");
  const [search, setSearch] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "amount-high" | "amount-low" | "balance">("recent");
  const { profile } = useBusiness();
  const storeName = profile?.storeDetails?.name || "Nexa POS";

  // Filter payments by time frame
  const filteredPayments = useMemo(() => {
    const start = getTimeFrameStart(timeFrame);
    return payments.filter(p => new Date(p.createdAt) >= start);
  }, [payments, timeFrame]);

  // Build customer debt profiles
  const customerProfiles = useMemo(() => {
    const map = new Map<string, CustomerDebtProfile>();

    // Process credit sales
    for (const sale of sales) {
      if (!sale.isCreditSale) continue;
      const phone = sale.customerPhone?.trim();
      if (!phone) continue;
      const key = normalizePhone(phone);

      const existing = map.get(key);
      if (existing) {
        existing.totalCreditSales += getSaleOutstanding(sale);
        existing.creditSales.push(sale);
        if (sale.customerName?.trim()) existing.name = sale.customerName.trim();
      } else {
        map.set(key, {
          name: sale.customerName?.trim() || "Customer",
          phone,
          totalCreditSales: getSaleOutstanding(sale),
          totalPayments: 0,
          currentBalance: 0,
          payments: [],
          creditSales: [sale],
          fullyCleared: false,
          lastPaymentDate: null,
        });
      }
    }

    // Process payments
    for (const payment of payments) {
      const phone = payment.customerPhone?.trim();
      if (!phone) continue;
      const key = normalizePhone(phone);

      const existing = map.get(key);
      if (existing) {
        existing.totalPayments += payment.amountNgn;
        existing.payments.push(payment);
        if (payment.customerName?.trim()) existing.name = payment.customerName.trim();
        if (!existing.lastPaymentDate || payment.createdAt > existing.lastPaymentDate) {
          existing.lastPaymentDate = payment.createdAt;
        }
      } else {
        map.set(key, {
          name: payment.customerName?.trim() || "Customer",
          phone,
          totalCreditSales: 0,
          totalPayments: payment.amountNgn,
          currentBalance: 0,
          payments: [payment],
          creditSales: [],
          fullyCleared: false,
          lastPaymentDate: payment.createdAt,
        });
      }
    }

    // Calculate balances & sort payment histories
    for (const profile of map.values()) {
      profile.currentBalance = Math.max(0, profile.totalCreditSales - profile.totalPayments);
      profile.fullyCleared = profile.totalPayments > 0 && profile.currentBalance <= 0;
      profile.payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      profile.creditSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Only include profiles that have at least one payment
    return Array.from(map.values()).filter(p => p.payments.length > 0);
  }, [sales, payments]);

  // Filter by time frame and search
  const displayProfiles = useMemo(() => {
    const start = getTimeFrameStart(timeFrame);

    let list = customerProfiles.filter(p =>
      p.payments.some(pay => new Date(pay.createdAt) >= start)
    );

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "recent":
        list.sort((a, b) => {
          const aDate = a.lastPaymentDate || "";
          const bDate = b.lastPaymentDate || "";
          return bDate.localeCompare(aDate);
        });
        break;
      case "amount-high":
        list.sort((a, b) => b.totalPayments - a.totalPayments);
        break;
      case "amount-low":
        list.sort((a, b) => a.totalPayments - b.totalPayments);
        break;
      case "balance":
        list.sort((a, b) => b.currentBalance - a.currentBalance);
        break;
    }

    return list;
  }, [customerProfiles, timeFrame, search, sortBy]);

  // Summary stats for filtered time frame
  const stats = useMemo(() => {
    const totalCollected = filteredPayments.reduce((s, p) => s + p.amountNgn, 0);
    const paymentCount = filteredPayments.length;

    // Group by recorder
    const recorderMap = new Map<string, { name: string; total: number; count: number }>();
    for (const p of filteredPayments) {
      const key = p.recordedBy || "unknown";
      const existing = recorderMap.get(key);
      if (existing) {
        existing.total += p.amountNgn;
        existing.count++;
      } else {
        recorderMap.set(key, {
          name: p.recordedByName || "Staff",
          total: p.amountNgn,
          count: 1,
        });
      }
    }

    const topCollector = Array.from(recorderMap.values())
      .sort((a, b) => b.total - a.total)[0] || null;

    // Unique customers who paid
    const uniqueCustomers = new Set(filteredPayments.map(p => normalizePhone(p.customerPhone)));

    const fullyCleared = displayProfiles.filter(p => p.fullyCleared).length;

    return {
      totalCollected,
      paymentCount,
      topCollector,
      uniqueCustomers: uniqueCustomers.size,
      fullyCleared,
      collectors: Array.from(recorderMap.values()).sort((a, b) => b.total - a.total),
    };
  }, [filteredPayments, displayProfiles]);

  const timeFrameLabels: Record<TimeFrame, string> = {
    "today": "Today",
    "this-week": "This Week",
    "this-month": "This Month",
    "all-time": "All Time",
  };

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No debt clearing history"
        description="When customers make debt payments, the full clearing history with timestamps, amounts, and staff records will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-green-500" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Collected</p>
          </div>
          <p className="text-lg font-black font-mono text-green-500">
            {NAIRA}{stats.totalCollected.toLocaleString("en-NG")}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {stats.paymentCount} payment{stats.paymentCount !== 1 ? "s" : ""} · {timeFrameLabels[timeFrame]}
          </p>
        </Card>

        <Card className="p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Customers</p>
          </div>
          <p className="text-lg font-black font-mono text-primary">
            {stats.uniqueCustomers}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {stats.fullyCleared} fully cleared
          </p>
        </Card>

        <Card className="p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-amber-500" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Top Collector</p>
          </div>
          <p className="text-sm font-bold truncate">
            {stats.topCollector?.name || "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {stats.topCollector ? `${NAIRA}${stats.topCollector.total.toLocaleString("en-NG")} (${stats.topCollector.count})` : "No data"}
          </p>
        </Card>

        <Card className="p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Payment</p>
          </div>
          <p className="text-lg font-black font-mono text-blue-500">
            {stats.paymentCount > 0
              ? `${NAIRA}${Math.round(stats.totalCollected / stats.paymentCount).toLocaleString("en-NG")}`
              : "—"
            }
          </p>
          <p className="text-[10px] text-muted-foreground">per transaction</p>
        </Card>
      </div>

      {/* Collectors Breakdown (if multiple) */}
      {stats.collectors.length > 1 && (
        <Card className="p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            Collections by Staff
          </p>
          <div className="space-y-2">
            {stats.collectors.map((c) => {
              const pct = stats.totalCollected > 0 ? (c.total / stats.totalCollected) * 100 : 0;
              return (
                <div key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate max-w-[140px]">{c.name}</span>
                    <span className="font-mono text-muted-foreground">
                      {NAIRA}{c.total.toLocaleString("en-NG")} <span className="text-[10px]">({c.count})</span>
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={timeFrame} onValueChange={(v) => setTimeFrame(v as TimeFrame)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="amount-high">Highest Paid</SelectItem>
              <SelectItem value="amount-low">Lowest Paid</SelectItem>
              <SelectItem value="balance">Most Owing</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest hover:bg-muted/50 gap-1.5"
            onClick={() => exportDebtHistoryPDF(filteredPayments, storeName, timeFrameLabels[timeFrame])}
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </Button>
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer…"
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Customer Debt Profiles with Timeline */}
      {displayProfiles.length === 0 ? (
        <EmptyState
          icon={History}
          title="No payments found"
          description={`No debt payments recorded ${timeFrame !== "all-time" ? `for ${timeFrameLabels[timeFrame].toLowerCase()}` : ""}. Try changing the time frame.`}
        />
      ) : (
        <div className="space-y-2">
          {displayProfiles.map((profile) => {
            const key = normalizePhone(profile.phone);
            const isExpanded = expandedCustomer === key;
            const clearPct = profile.totalCreditSales > 0
              ? Math.min(100, (profile.totalPayments / profile.totalCreditSales) * 100)
              : 100;

            // Only show payments within the time frame for the timeline
            const start = getTimeFrameStart(timeFrame);
            const timeFilteredPayments = profile.payments.filter(
              p => new Date(p.createdAt) >= start
            );

            return (
              <div
                key={key}
                className="rounded-xl border border-border bg-card overflow-hidden transition-all"
              >
                {/* Customer Header Row */}
                <button
                  type="button"
                  onClick={() => setExpandedCustomer(isExpanded ? null : key)}
                  className="flex items-center gap-3 w-full p-3 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${
                    profile.fullyCleared
                      ? "bg-green-500/10 text-green-500"
                      : "bg-amber-500/10 text-amber-500"
                  }`}>
                    {profile.fullyCleared
                      ? <CheckSquare className="h-5 w-5" />
                      : <ArrowDownRight className="h-5 w-5" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{profile.name}</p>
                      {profile.fullyCleared && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-green-500/30 text-green-500 uppercase font-black tracking-wider">
                          Cleared
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      {profile.phone && (
                        <span className="flex items-center gap-0.5">
                          <Phone className="h-2.5 w-2.5" />{profile.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <History className="h-2.5 w-2.5" />{timeFilteredPayments.length} payment{timeFilteredPayments.length !== 1 ? "s" : ""}
                      </span>
                      {profile.lastPaymentDate && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />Last: {daysSince(profile.lastPaymentDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-sm font-bold font-mono text-green-500">
                      +{NAIRA}{timeFilteredPayments.reduce((s, p) => s + p.amountNgn, 0).toLocaleString("en-NG")}
                    </p>
                    {profile.currentBalance > 0 && (
                      <p className="text-[10px] font-mono text-destructive">
                        Still owes {NAIRA}{profile.currentBalance.toLocaleString("en-NG")}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-muted-foreground">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {/* Expanded Timeline */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/10">
                    {/* Debt Progress Bar */}
                    <div className="px-4 py-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Total Credit: {NAIRA}{profile.totalCreditSales.toLocaleString("en-NG")}</span>
                        <span>Paid: {NAIRA}{profile.totalPayments.toLocaleString("en-NG")} ({Math.round(clearPct)}%)</span>
                      </div>
                      <Progress value={clearPct} className="h-2" />
                      {profile.currentBalance > 0 && (
                        <p className="text-[10px] text-destructive font-medium">
                          Remaining: {NAIRA}{profile.currentBalance.toLocaleString("en-NG")}
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* Payment Timeline */}
                    <div className="px-4 py-3 space-y-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Payment Timeline
                      </p>

                      {/* Build a combined timeline of credit sales + payments */}
                      {(() => {
                        const events: Array<{
                          type: "credit" | "payment";
                          date: string;
                          amount: number;
                          recordedBy?: string;
                          notes?: string;
                          reference?: string;
                        }> = [];

                        for (const cs of profile.creditSales) {
                          events.push({
                            type: "credit",
                            date: cs.createdAt,
                            amount: cs.totalNgn,
                            reference: `Sale #${cs.id?.slice(-6) || "—"}`,
                          });
                        }

                        for (const p of profile.payments) {
                          events.push({
                            type: "payment",
                            date: p.createdAt,
                            amount: p.amountNgn,
                            recordedBy: p.recordedByName || "Staff",
                            notes: p.notes,
                          });
                        }

                        events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        // Calculate running balance (chronological)
                        const chronological = [...events].reverse();
                        let runningBalance = 0;
                        const balanceMap = new Map<number, number>();
                        chronological.forEach((evt, idx) => {
                          if (evt.type === "credit") {
                            runningBalance += evt.amount;
                          } else {
                            runningBalance -= evt.amount;
                          }
                          balanceMap.set(idx, Math.max(0, runningBalance));
                        });

                        // Reverse the balance map indices to match display order
                        const displayBalances: number[] = [];
                        for (let i = chronological.length - 1; i >= 0; i--) {
                          displayBalances.push(balanceMap.get(i)!);
                        }

                        return events.map((evt, idx) => (
                          <div key={`${evt.type}-${evt.date}-${idx}`} className="relative flex gap-3 pb-3 last:pb-0">
                            {/* Timeline connector line */}
                            {idx < events.length - 1 && (
                              <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                            )}

                            {/* Timeline dot */}
                            <div className={`relative z-10 mt-1 h-[22px] w-[22px] shrink-0 rounded-full flex items-center justify-center border-2 ${
                              evt.type === "payment"
                                ? "border-green-500/40 bg-green-500/10"
                                : "border-destructive/40 bg-destructive/10"
                            }`}>
                              <div className={`h-2 w-2 rounded-full ${
                                evt.type === "payment" ? "bg-green-500" : "bg-destructive"
                              }`} />
                            </div>

                            {/* Event content */}
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className={`text-xs font-semibold ${
                                    evt.type === "payment" ? "text-green-500" : "text-destructive"
                                  }`}>
                                    {evt.type === "payment"
                                      ? `+${NAIRA}${evt.amount.toLocaleString("en-NG")} paid`
                                      : `${NAIRA}${evt.amount.toLocaleString("en-NG")} credit sale`
                                    }
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                                    <span>{formatDate(evt.date)} · {formatTime(evt.date)}</span>
                                    {evt.recordedBy && (
                                      <>
                                        <span>·</span>
                                        <span className="flex items-center gap-0.5">
                                          <User className="h-2.5 w-2.5" />
                                          {evt.recordedBy}
                                        </span>
                                      </>
                                    )}
                                    {evt.reference && (
                                      <>
                                        <span>·</span>
                                        <span className="font-mono">{evt.reference}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Running balance after this event */}
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] h-5 px-1.5 shrink-0 font-mono ${
                                    displayBalances[idx] === 0
                                      ? "border-green-500/30 text-green-500"
                                      : "border-muted-foreground/30 text-muted-foreground"
                                  }`}
                                >
                                  Bal: {NAIRA}{displayBalances[idx]?.toLocaleString("en-NG") ?? "0"}
                                </Badge>
                              </div>

                              {evt.notes && (
                                <p className="text-[10px] text-muted-foreground italic truncate">
                                  "{evt.notes}"
                                </p>
                              )}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
