import { useEffect, useState } from "react";
import { FileDown, UserPlus, Upload, Plus, Trash2, Users, FileSpreadsheet } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CSVImportSheet, type ImportField } from "@/components/data/CSVImportSheet";

const NAIRA = "₦";

const importFields: ImportField[] = [
  { key: "customerName", label: "Customer Name", required: true },
  { key: "customerPhone", label: "Phone" },
  { key: "amountNgn", label: "Amount Owed", numeric: true, required: true },
];

interface PendingDebtor {
  customerName: string;
  customerPhone: string;
  amountNgn: string;
}

interface DebtorImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (debtors: Array<{
    customerName: string;
    customerPhone: string;
    amountNgn: number;
    notes?: string;
    source: "csv" | "manual";
  }>) => Promise<{ created: number; failed: number }>;
}

export function DebtorImportModal({ open, onOpenChange, onImport }: DebtorImportModalProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "csv">("manual");
  const [csvOpen, setCsvOpen] = useState(false);
  const [pending, setPending] = useState<PendingDebtor[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab("manual");
      setCsvOpen(false);
      setPending([]);
    }
  }, [open]);

  const addManual = () => {
    if (!name.trim()) {
      toast.error("Enter the debtor's name");
      return;
    }
    const amt = Number(amount);
    if (isNaN(amt) || amt < 0) {
      toast.error("Enter a valid amount owed");
      return;
    }
    setPending((prev) => [
      ...prev,
      { customerName: name.trim(), customerPhone: phone.trim(), amountNgn: amount || "0" },
    ]);
    setName("");
    setPhone("");
    setAmount("");
  };

  const removePending = (idx: number) => {
    setPending((prev) => prev.filter((_, i) => i !== idx));
  };

  const downloadTemplate = () => {
    const csv = [
      "Customer Name,Phone,Amount Owed",
      "John Doe,08012345678,5000",
      "",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexa_debtors_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitManual = async () => {
    if (pending.length === 0) {
      toast.error("Add at least one debtor first");
      return;
    }
    setSubmitting(true);
    try {
      const rows = pending.map((p) => ({
        customerName: p.customerName,
        customerPhone: p.customerPhone,
        amountNgn: Number(p.amountNgn) || 0,
        source: "manual" as const,
      }));
      const result = await onImport(rows);
      if (result.created > 0) {
        toast.success(`Added ${result.created} debtor${result.created !== 1 ? "s" : ""}`);
        setPending([]);
        onOpenChange(false);
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} debtor${result.failed !== 1 ? "s" : ""} could not be saved`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add debtors");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Import / Add Debtors
            </DialogTitle>
            <DialogDescription>
              Migrate your existing list of debtors with their opening balances — via CSV upload or manual entry.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "csv")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" className="text-xs">Manual Entry</TabsTrigger>
              <TabsTrigger value="csv" className="text-xs">CSV Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <div className="rounded-xl border border-border p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Customer Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Phone</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Amount Owed ({NAIRA})</label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="h-9 font-mono"
                  />
                </div>
                <Button onClick={addManual} variant="outline" className="w-full gap-2 h-9" size="sm">
                  <Plus className="h-4 w-4" />
                  Add to List
                </Button>
              </div>

              {pending.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {pending.length} debtor{pending.length !== 1 ? "s" : ""} added
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pending.map((d, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{d.customerName}</p>
                          <p className="text-[10px] text-muted-foreground">{d.customerPhone || "No phone"}</p>
                        </div>
                        <span className="text-sm font-mono font-bold text-destructive shrink-0">
                          {NAIRA}{Number(d.amountNgn).toLocaleString("en-NG")}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removePending(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="csv" className="space-y-4">
              <button
                type="button"
                onClick={() => setCsvOpen(true)}
                className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/60 p-10 text-center transition-all hover:border-primary/50 hover:bg-muted/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold flex items-center justify-center gap-2">
                    <Upload className="h-4 w-4" /> Upload Debtor CSV
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Columns: Customer Name, Phone, Amount Owed
                  </p>
                </div>
              </button>
              <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <Users className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Use a CSV with headers <span className="font-mono">Customer Name</span>, <span className="font-mono">Phone</span>, and <span className="font-mono">Amount Owed</span>. Column mapping is done in the upload wizard.</p>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={downloadTemplate}>
                <FileDown className="h-4 w-4" />
                Download Debtor CSV Template
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            {activeTab === "manual" && (
              <Button onClick={submitManual} disabled={submitting || pending.length === 0} className="gap-2">
                <FileDown className="h-4 w-4" />
                {submitting ? "Adding…" : `Add ${pending.length > 0 ? pending.length : ""} Debtor${pending.length !== 1 ? "s" : ""}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CSVImportSheet
        open={csvOpen}
        onOpenChange={setCsvOpen}
        fields={importFields}
        entityName="debtors"
        onImport={async (rows) => {
          const debtors = rows.map((r) => ({
            customerName: r.customerName || "",
            customerPhone: r.customerPhone || "",
            amountNgn: Number(r.amountNgn) || 0,
            source: "csv" as const,
          }));
          try {
            const result = await onImport(debtors);
            if (result.created > 0) {
              toast.success(`Imported ${result.created} debtor${result.created !== 1 ? "s" : ""}`);
              onOpenChange(false);
            }
            if (result.failed > 0) {
              toast.warning(`${result.failed} row${result.failed !== 1 ? "s" : ""} failed to save`);
            }
            return result;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to import debtors";
            toast.error(msg);
            return { created: 0, failed: debtors.length, error: msg };
          }
        }}
      />
    </>
  );
}