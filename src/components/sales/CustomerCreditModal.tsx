import { useMemo, useState } from "react";
import { Wallet, Search, Plus, ArrowDownLeft, ArrowUpRight, Mail, User, Phone } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CustomerBalance } from "@/types/inventory";

const NAIRA = "₦";

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

interface CustomerCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balances: CustomerBalance[];
  /** Every known customer (from sales / debt payments / imported debtors). */
  customers: KnownCustomer[];
  onTopUp: (args: { customerPhone: string; customerName?: string; amountNgn: number }) => Promise<unknown>;
}

/**
 * Store-wide customer credit ledger: search any existing customer (by name,
 * phone, or email), see their prepaid balance, and top them up — the amount is
 * deducted from their purchases later.
 */
export function CustomerCreditModal({ open, onOpenChange, balances, customers, onTopUp }: CustomerCreditModalProps) {
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<CreditEntry | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const entries: CreditEntry[] = useMemo(() => {
    const map = new Map<string, CreditEntry>();
    for (const b of balances) {
      const phone = b.customerPhone?.trim();
      if (!phone) continue;
      map.set(phone.toLowerCase(), {
        key: phone,
        name: b.customerName?.trim() || "Customer",
        phone,
        balanceNgn: Number(b.balanceNgn) || 0,
      });
    }
    for (const c of customers) {
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
  }, [balances, customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.phone.toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q)
    );
  }, [entries, search]);

  const totalOutstanding = balances.reduce((sum, b) => sum + (Number(b.balanceNgn) || 0), 0);

  const openTopUp = (e: CreditEntry) => {
    setTarget(e);
    setAmount("");
  };

  const submitTopUp = async () => {
    if (!target) return;
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid top-up amount");
      return;
    }
    setSubmitting(true);
    try {
      await onTopUp({
        customerPhone: target.phone,
        customerName: target.name,
        amountNgn: amt,
      });
      toast.success(`${NAIRA}${amt.toLocaleString("en-NG")} added to ${target.name}'s credit`);
      setTarget(null);
      setAmount("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to top up credit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Customer Store Credit
          </DialogTitle>
          <DialogDescription>
            Prepaid balances customers have with the store. Search an existing customer by name, phone, or email, then top them up — the amount is deducted from their purchases later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Customers with Credit</p>
            <p className="mt-1 text-2xl font-black font-mono text-foreground">{balances.length}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Held on Credit</p>
            <p className="mt-1 text-2xl font-black font-mono text-emerald-600">{NAIRA}{totalOutstanding.toLocaleString("en-NG")}</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No customers found yet. Complete sales with a customer phone number, then top them up here.
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No customers match your search.
            </div>
          ) : (
            <div className="space-y-2">
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
        </div>

        {target && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 mt-3">
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
              <Button onClick={submitTopUp} disabled={submitting} className="h-9 gap-1 shrink-0 bg-emerald-700 hover:bg-emerald-800 text-white">
                <ArrowUpRight className="h-4 w-4" />
                {submitting ? "Adding…" : "Credit"}
              </Button>
              <Button variant="ghost" size="sm" className="h-9" onClick={() => setTarget(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
