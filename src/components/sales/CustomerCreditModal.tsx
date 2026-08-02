import { useState } from "react";
import { Wallet, Search, Plus, X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { CustomerBalance } from "@/types/inventory";

const NAIRA = "₦";

interface CustomerCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balances: CustomerBalance[];
  onTopUp: (args: { customerPhone: string; customerName?: string; amountNgn: number }) => Promise<unknown>;
}

/**
 * Store-wide customer credit ledger: view every customer's prepaid balance and
 * top a customer up (they pay the store ahead of purchases).
 */
export function CustomerCreditModal({ open, onOpenChange, balances, onTopUp }: CustomerCreditModalProps) {
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<CustomerBalance | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filtered = balances.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      b.customerName?.toLowerCase().includes(q) ||
      b.customerPhone?.toLowerCase().includes(q)
    );
  });

  const totalOutstanding = balances.reduce((sum, b) => sum + (Number(b.balanceNgn) || 0), 0);

  const openTopUp = (b: CustomerBalance) => {
    setTarget(b);
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
        customerPhone: target.customerPhone,
        customerName: target.customerName,
        amountNgn: amt,
      });
      toast.success(`${NAIRA}${amt.toLocaleString("en-NG")} added to ${target.customerName}'s credit`);
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
            Prepaid balances customers have with the store. Top a customer up — the amount is deducted from their purchases later.
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
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No customers have store credit yet. Top up a customer the next time they pay ahead.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{b.customerName || "Customer"}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{b.customerPhone || "No phone"}</p>
                  </div>
                  <span className="text-sm font-mono font-black text-emerald-600 shrink-0">
                    {b.balanceNgn > 0 && <ArrowDownLeft className="inline h-3.5 w-3.5 mr-1" />}
                    {NAIRA}{(Number(b.balanceNgn) || 0).toLocaleString("en-NG")}
                  </span>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => openTopUp(b)}>
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
              <span className="font-semibold">Top up {target.customerName || "Customer"}</span>
              <span className="text-muted-foreground font-mono">{target.customerPhone}</span>
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