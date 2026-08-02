import { useEffect, useMemo, useState } from "react";
import { FileDown, User, Users, Download, FileText } from "lucide-react";
import type { SaleTransaction, DebtPayment } from "@/types/inventory";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { normalizePhone } from "@/lib/utils";
import { useBusiness } from "@/contexts/BusinessContext";
import { exportDebtStatementPDF, exportDebtorsLedgerPDF } from "@/lib/pdf-export";
import { getSaleOutstanding } from "@/lib/credit-sale";

const NAIRA = "₦";

interface DebtReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sales: SaleTransaction[];
  payments: DebtPayment[];
  customer?: { name: string; phone: string } | null;
}

interface DebtProfile {
  key: string;
  name: string;
  phone: string;
  totalCreditSales: number;
  totalPayments: number;
  currentBalance: number;
  events: Array<{
    type: "credit" | "payment";
    date: string;
    amount: number;
    reference?: string;
    notes?: string;
    recordedBy?: string;
  }>;
}

export function DebtReportModal({ open, onOpenChange, sales, payments, customer }: DebtReportModalProps) {
  const { profile } = useBusiness();
  const storeName = profile?.storeDetails?.name || "Nexa POS";
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [downloading, setDownloading] = useState<"statement" | "ledger" | null>(null);

  const profiles = useMemo(() => {
    const map = new Map<string, DebtProfile>();

    for (const sale of sales) {
      if (!sale.isCreditSale) continue;
      const phone = sale.customerPhone?.trim();
      if (!phone) continue;
      const key = normalizePhone(phone);

      const existing = map.get(key);
      if (existing) {
        existing.totalCreditSales += getSaleOutstanding(sale);
        existing.events.push({
          type: "credit",
          date: sale.createdAt,
          amount: getSaleOutstanding(sale),
          reference: `Sale #${sale.id?.slice(-6) || "—"}`,
        });
        if (sale.customerName?.trim()) existing.name = sale.customerName.trim();
      } else {
        map.set(key, {
          key,
          name: sale.customerName?.trim() || "Customer",
          phone,
          totalCreditSales: getSaleOutstanding(sale),
          totalPayments: 0,
          currentBalance: 0,
          events: [{
            type: "credit",
            date: sale.createdAt,
            amount: getSaleOutstanding(sale),
            reference: `Sale #${sale.id?.slice(-6) || "—"}`,
          }],
        });
      }
    }

    for (const payment of payments) {
      const phone = payment.customerPhone?.trim();
      if (!phone) continue;
      const key = normalizePhone(phone);

      const existing = map.get(key);
      if (existing) {
        existing.totalPayments += payment.amountNgn;
        existing.events.push({
          type: "payment",
          date: payment.createdAt,
          amount: payment.amountNgn,
          recordedBy: payment.recordedByName || "Staff",
          notes: payment.notes,
        });
        if (payment.customerName?.trim()) existing.name = payment.customerName.trim();
      } else {
        map.set(key, {
          key,
          name: payment.customerName?.trim() || "Customer",
          phone,
          totalCreditSales: 0,
          totalPayments: payment.amountNgn,
          currentBalance: 0,
          events: [{
            type: "payment",
            date: payment.createdAt,
            amount: payment.amountNgn,
            recordedBy: payment.recordedByName || "Staff",
            notes: payment.notes,
          }],
        });
      }
    }

    for (const p of map.values()) {
      p.currentBalance = Math.max(0, p.totalCreditSales - p.totalPayments);
    }

    return Array.from(map.values()).sort((a, b) => b.currentBalance - a.currentBalance);
  }, [sales, payments]);

  const selectedProfile = profiles.find((p) => p.key === selectedKey) || null;

  useEffect(() => {
    if (open) {
      if (customer?.phone) {
        setSelectedKey(normalizePhone(customer.phone));
      } else if (!selectedKey) {
        setSelectedKey("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setDownloading(null);
    }
    onOpenChange(next);
  };

  const handleDownloadStatement = async () => {
    if (!selectedProfile) {
      toast.error("Select a customer first");
      return;
    }
    setDownloading("statement");
    try {
      await exportDebtStatementPDF(selectedProfile, storeName);
      toast.success(`Debt statement downloaded for ${selectedProfile.name}`);
    } catch (err) {
      console.error("Debt statement export error:", err);
      toast.error("Failed to generate debt statement");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadLedger = async () => {
    setDownloading("ledger");
    try {
      await exportDebtorsLedgerPDF(profiles, storeName);
      toast.success(`Debtors ledger downloaded (${profiles.length} customers)`);
    } catch (err) {
      console.error("Debtors ledger export error:", err);
      toast.error("Failed to generate debtors ledger");
    } finally {
      setDownloading(null);
    }
  };

  const debtors = profiles.filter((p) => p.currentBalance > 0);
  const totalOutstanding = debtors.reduce((sum, p) => sum + p.currentBalance, 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Download Debt Reports
          </DialogTitle>
          <DialogDescription>
            Export PDF debt statements for a single customer or the full debtors ledger for all customers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Individual customer statement */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Individual Customer Statement</p>
                <p className="text-xs text-muted-foreground">
                  Credit sales, payments, and running balance for one customer.
                </p>
              </div>
            </div>

            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder={customer ? `Download report for ${customer.name}` : "Select a customer…"} />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.key} value={p.key} className="text-xs">
                    {p.name} · {NAIRA}{p.currentBalance.toLocaleString("en-NG")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedProfile && (
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
                <span className="font-medium">Outstanding balance</span>
                <span className={`font-mono font-bold ${selectedProfile.currentBalance > 0 ? "text-destructive" : "text-green-600"}`}>
                  {NAIRA}{selectedProfile.currentBalance.toLocaleString("en-NG")}
                </span>
              </div>
            )}

            <Button
              onClick={handleDownloadStatement}
              disabled={!selectedProfile || downloading !== null}
              className="w-full gap-2"
              size="sm"
            >
              <Download className="h-4 w-4" />
              {downloading === "statement" ? "Generating…" : "Download Statement"}
            </Button>
          </div>

          {/* All customers ledger */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">All Customers — Debtors Ledger</p>
                <p className="text-xs text-muted-foreground">
                  Full ledger with every customer's credit, payments, and outstanding balance.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/40 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Customers</p>
                <p className="text-sm font-bold font-mono">{profiles.length}</p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Outstanding</p>
                <p className="text-sm font-bold font-mono text-destructive">{NAIRA}{totalOutstanding.toLocaleString("en-NG")}</p>
              </div>
            </div>

            <Button
              onClick={handleDownloadLedger}
              disabled={profiles.length === 0 || downloading !== null}
              variant="outline"
              className="w-full gap-2"
              size="sm"
            >
              <FileText className="h-4 w-4" />
              {downloading === "ledger" ? "Generating…" : "Download Debtors Ledger"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
