import { useMemo, useState } from "react";
import {
  Wallet, Search, Plus, ArrowDownLeft, ArrowUpRight, Mail, Phone, User, History, ShieldCheck, MapPin, StickyNote,
} from "lucide-react";
import {
  useSales, useDebtPayments, useImportedDebts, useCustomerBalances, useCreditTopups,
  useSalesMutations,
} from "@/hooks/useSalesData";
import { useLocations } from "@/hooks/useInventoryData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/skeletons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CreditTopup } from "@/types/inventory";

const NAIRA = "₦";

const TOPUP_TYPE_LABELS: Record<CreditTopup["type"], { label: string; credit: boolean }> = {
  topup: { label: "Top-up", credit: true },
  sale_deduction: { label: "Sale deduction", credit: false },
  overpay_credit: { label: "Overpay → credit", credit: true },
  adjustment: { label: "Adjustment", credit: false },
};

const METHOD_LABELS: Record<string, { label: string; className: string }> = {
  manual: { label: "Manual", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  overpay: { label: "From sale overpay", className: "bg-sky-500/10 text-sky-700 border-sky-500/30" },
  sale_deduction: { label: "Sale deduction", className: "bg-red-500/10 text-red-700 border-red-500/30" },
  adjustment: { label: "Adjustment", className: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
};

interface KnownCustomer {
  name: string;
  phone: string;
  email?: string;
}

interface CreditEntry {
  key: string;
  name: string;
  phone: string;
  email?: string;
  balanceNgn: number;
}

export default StoreCreditsPage;

function StoreCreditsPage() {
  const { data: sales } = useSales();
  const { data: payments } = useDebtPayments();
  const { data: importedDebts } = useImportedDebts();
  const { data: balances, isLoading: balancesLoading, error: balancesError } = useCustomerBalances();
  const { data: topups, isLoading: topupsLoading } = useCreditTopups();
  const { data: locations } = useLocations();
  const { topUpCustomerCredit } = useSalesMutations();

  const branchNames = useMemo(() => {
    const m = new Map<string, string>();
    (locations || []).forEach((l) => m.set(l.id, l.name));
    return m;
  }, [locations]);

  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<CreditEntry | null>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const directory: KnownCustomer[] = useMemo(() => {
    const map = new Map<string, KnownCustomer>();
    const upsert = (phone: string, name?: string, email?: string) => {
      const p = phone?.trim();
      if (!p) return;
      const key = p.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        if (!existing.email && email) existing.email = email;
        if (!existing.name && name?.trim()) existing.name = name.trim();
      } else {
        map.set(key, { name: name?.trim() || "Customer", phone: p, email });
      }
    };
    for (const s of sales) upsert(s.customerPhone || "", s.customerName || "", s.customerEmail || undefined);
    for (const p of payments) upsert(p.customerPhone || "", p.customerName || "");
    for (const d of importedDebts) upsert(d.customerPhone || "", d.customerName || "");
    return Array.from(map.values());
  }, [sales, payments, importedDebts]);

  const entries: CreditEntry[] = useMemo(() => {
    const map = new Map<string, CreditEntry>();
    for (const b of balances || []) {
      const phone = b.customerPhone?.trim();
      if (!phone) continue;
      map.set(phone.toLowerCase(), {
        key: phone,
        name: b.customerName?.trim() || "Customer",
        phone,
        balanceNgn: Number(b.balanceNgn) || 0,
      });
    }
    for (const c of directory) {
      const phone = c.phone?.trim();
      if (!phone) continue;
      const existing = map.get(phone.toLowerCase());
      if (existing) {
        if (!existing.email && c.email) existing.email = c.email;
        if (existing.name === "Customer" && c.name?.trim()) existing.name = c.name.trim();
      } else {
        map.set(phone.toLowerCase(), {
          key: phone,
          name: c.name?.trim() || "Customer",
          phone,
          email: c.email,
          balanceNgn: 0,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [balances, directory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.phone.toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q)
    );
  }, [entries, search]);

  const totalOutstanding = (balances || []).reduce((sum, b) => sum + (Number(b.balanceNgn) || 0), 0);
  const customersWithCredit = (balances || []).filter((b) => Number(b.balanceNgn) > 0).length;

  const openTopUp = (e: CreditEntry) => {
    setTarget(e);
    setAmount("");
    setNotes("");
  };

  const submitTopUp = async (phone: string, name: string) => {
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid top-up amount");
      return;
    }
    setSubmitting(true);
    try {
      const result = await topUpCustomerCredit({
        customerPhone: phone,
        customerName: name,
        amountNgn: amt,
        notes: notes.trim() || undefined,
      });
      if (result.clearedDebt > 0) {
        toast.success(
          `${NAIRA}${amt.toLocaleString("en-NG")} added — ${NAIRA}${result.clearedDebt.toLocaleString("en-NG")} cleared ${name}'s debt`
        );
      } else {
        toast.success(`${NAIRA}${amt.toLocaleString("en-NG")} added to ${name}'s credit`);
      }
      setTarget(null);
      setAmount("");
      setNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to top up credit");
    } finally {
      setSubmitting(false);
    }
  };

  const submitManual = async () => {
    const amt = Number(manualAmount);
    const phone = manualPhone.trim();
    if (phone.length < 6) {
      toast.error("Enter a valid phone number (at least 6 digits)");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid top-up amount");
      return;
    }
    setManualSubmitting(true);
    try {
      const result = await topUpCustomerCredit({
        customerPhone: phone,
        customerName: manualName.trim() || undefined,
        amountNgn: amt,
        notes: manualNotes.trim() || undefined,
      });
      if (result.clearedDebt > 0) {
        toast.success(
          `${NAIRA}${amt.toLocaleString("en-NG")} added — ${NAIRA}${result.clearedDebt.toLocaleString("en-NG")} cleared existing debt`
        );
      } else {
        toast.success(`${NAIRA}${amt.toLocaleString("en-NG")} added to credit`);
      }
      setManualName("");
      setManualPhone("");
      setManualAmount("");
      setManualNotes("");
      setSearch("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to top up credit");
    } finally {
      setManualSubmitting(false);
    }
  };

  const recentTopups = (topups || []).slice(0, 50);

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Wallet className="h-6 w-6 text-emerald-600" />
            Store Credits
          </h1>
          <p className="text-sm text-muted-foreground">
            Prepaid balances customers hold with the store. Top up any customer — even a brand-new one — and the amount is deducted from their purchases later.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Live store-wide credit wallet
        </Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="p-3">
          <CardContent className="p-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Customers with Credit</p>
            <p className="mt-1 text-2xl font-black font-mono text-foreground">{customersWithCredit}</p>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardContent className="p-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Held on Credit</p>
            <p className="mt-1 text-2xl font-black font-mono text-emerald-600">{NAIRA}{totalOutstanding.toLocaleString("en-NG")}</p>
          </CardContent>
        </Card>
        <Card className="p-3 col-span-2 sm:col-span-1">
          <CardContent className="p-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Known Customers</p>
            <p className="mt-1 text-2xl font-black font-mono text-foreground">{directory.length}</p>
          </CardContent>
        </Card>
        <Card className="p-3 col-span-2 sm:col-span-1">
          <CardContent className="p-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ledger Entries</p>
            <p className="mt-1 text-2xl font-black font-mono text-foreground">{(topups || []).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Manually add credit to a brand-new customer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" />
            Manually add credit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Add credit for a customer who has never bought anything yet. They'll appear here once the credit is added. If the customer already owes the store, the top-up first clears that debt and the remainder becomes spendable credit.
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Input
              placeholder="Customer name (optional)"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="h-9"
            />
            <Input
              placeholder="Phone number"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              className="h-9 font-mono"
            />
            <Input
              type="number"
              placeholder={`Amount (${NAIRA})`}
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              className="h-9 font-mono"
            />
            <Button
              onClick={submitManual}
              disabled={manualSubmitting}
              className="h-9 gap-1 shrink-0 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <ArrowUpRight className="h-4 w-4" />
              {manualSubmitting ? "Adding…" : "Add credit"}
            </Button>
          </div>
          <div className="relative mt-2">
            <StickyNote className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Note / reminder (optional) — e.g. 'Balance from a refund, keep receipt for tax'"
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Directory + top-up */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            Customer directory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          {balancesLoading ? (
            <ListSkeleton items={6} />
          ) : balancesError ? (
            <div className="py-10 text-center text-sm text-destructive">
              Couldn't load credit balances: {balancesError.message}
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No customers yet"
              description={'Complete sales with a customer phone number, or use "Manually add credit" above to create one.'}
            />
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No customers match your search.
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filtered.map((e) => (
                <div key={e.key} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{e.name || "Customer"}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                        <Phone className="h-3 w-3" />{e.phone || "No phone"}
                      </p>
                      {e.email && (
                        <Badge variant="outline" className="text-[10px] h-4 py-0 font-normal gap-1 opacity-80">
                          <Mail className="h-3 w-3" />{e.email}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-mono font-black shrink-0",
                      e.balanceNgn > 0 ? "text-emerald-600" : "text-muted-foreground"
                    )}
                  >
                    {e.balanceNgn > 0 && <ArrowDownLeft className="inline h-3.5 w-3.5 mr-1" />}
                    {NAIRA}{(e.balanceNgn || 0).toLocaleString("en-NG")}
                  </span>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => openTopUp(e)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Top Up
                  </Button>
                </div>
              ))}
            </div>
          )}

          {target && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold flex items-center gap-1.5">
                  <User className="h-4 w-4 text-emerald-600" />Top up {target.name || "Customer"}
                </span>
                <span className="text-muted-foreground font-mono">{target.phone}</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={`Top-up amount (${NAIRA})`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 font-mono"
                  autoFocus
                />
                <Button
                  onClick={() => submitTopUp(target.phone, target.name)}
                  disabled={submitting}
                  className="h-9 gap-1 shrink-0 bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  {submitting ? "Adding…" : "Credit"}
                </Button>
                <Button variant="ghost" size="sm" className="h-9" onClick={() => setTarget(null)}>
                  Cancel
                </Button>
              </div>
              <div className="relative">
                <StickyNote className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Note / reminder (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                If {target.name || "this customer"} already owes the store, the top-up pays down that debt first; the remainder is added to credit.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ledger history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Recent movements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topupsLoading ? (
            <ListSkeleton items={6} />
          ) : recentTopups.length === 0 ? (
            <EmptyState
              icon={History}
              title="No movements yet"
              description="Top-ups, sale deductions, and overpay credits will show up here."
            />
          ) : (
            <div className="space-y-2">
              {recentTopups.map((t) => {
                const meta = TOPUP_TYPE_LABELS[t.type] || { label: t.type, credit: t.amountNgn > 0 };
                const credit = t.amountNgn > 0;
                const methodMeta = t.method ? METHOD_LABELS[t.method] : null;
                const methodLabel = methodMeta?.label || meta.label;
                const branchLabel = t.branchId && t.branchId !== "none"
                  ? (branchNames.get(t.branchId) || t.branchId)
                  : "Admin";
                return (
                  <div key={t.id} className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        t.amountNgn === 0 ? "bg-amber-500/10 text-amber-700" : credit ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                      )}
                    >
                      {t.amountNgn === 0 ? <ShieldCheck className="h-4 w-4" /> : credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-semibold truncate">{t.customerName || "Customer"}</p>
                        <Badge variant="outline" className={cn("text-[10px] h-4 py-0 font-normal", methodMeta?.className)}>
                          {methodLabel}
                        </Badge>
                        {t.debtClearedNgn ? (
                          <Badge className="text-[10px] h-4 py-0 font-normal gap-1 bg-amber-600/15 text-amber-700 border border-amber-600/30">
                            <ShieldCheck className="h-3 w-3" /> {NAIRA}{t.debtClearedNgn.toLocaleString("en-NG")} cleared debt
                          </Badge>
                        ) : null}
                      </div>
                      <p className="flex flex-wrap items-center gap-x-1.5 text-[10px] text-muted-foreground font-mono mt-0.5">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{t.customerPhone || "—"}</span>
                        <span className="opacity-60">•</span>
                        <span>{t.createdAt ? new Date(t.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—"}</span>
                        {t.recordedByName ? <span className="opacity-60">• by {t.recordedByName}</span> : null}
                        <span className="opacity-60">•</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{branchLabel}</span>
                      </p>
                      {t.notes ? (
                        <p className="flex items-start gap-1 text-[10px] text-muted-foreground italic">
                          <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />{t.notes}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-mono font-black shrink-0",
                        t.amountNgn === 0 ? "text-muted-foreground" : credit ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {t.amountNgn === 0 ? "₦0" : `${credit ? "+" : "−"}${NAIRA}${Math.abs(t.amountNgn).toLocaleString("en-NG")}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
