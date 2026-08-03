import { useState } from "react";
import { FileText, Plus, Pencil, Trash2, FileDown, Copy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/skeletons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSalesForms, useSalesFormMutations, nextFormNumber } from "@/hooks/useSalesForms";
import { useBusiness } from "@/contexts/BusinessContext";
import { SalesFormBuilder } from "@/components/sales/SalesFormBuilder";
import type { SalesForm, FormTransactionType } from "@/types/inventory";

const NAIRA = "₦";

const FORM_TYPE_LABELS: Record<FormTransactionType, string> = {
  receipt: "Receipt",
  proforma: "Proforma Invoice",
  delivery_note: "Delivery Note",
  credit_note: "Credit Note",
};

export default FormsPage;

function FormsPage() {
  const { profile } = useBusiness();
  const businessType = profile?.businessType || "retail";
  const { data: forms, isLoading } = useSalesForms();
  const { deleteForm, bulkDeleteForms, logFormActivity } = useSalesFormMutations();

  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState<SalesForm | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = (forms || []).filter((f) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      f.formNumber.toLowerCase().includes(q) ||
      (f.customerName || "").toLowerCase().includes(q) ||
      (f.customerPhone || "").toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (form: SalesForm) => {
    try {
      await deleteForm(form.id);
      await logFormActivity("deleted", form);
      toast.success(`Form ${form.formNumber} deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete form");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      await bulkDeleteForms(ids);
      toast.success(`Deleted ${ids.length} form${ids.length !== 1 ? "s" : ""}`);
      setSelected(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete forms");
    }
  };

  const downloadPdf = async (form: SalesForm) => {
    if (form.status !== "finalized") {
      toast.error("Only finalized receipts can be printed. Finalize the form first.");
      return;
    }
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = w - margin * 2;
    let y = 18;

    const storeName = profile?.storeDetails?.name || "My Store";
    const storePhone = profile?.storeDetails?.phone || "";
    const storeAddress = profile?.storeDetails?.address || "";
    const typeLabel = FORM_TYPE_LABELS[form.formType] || "Form";
    const taxRateNum = form.taxRate || 0;
    const completed = form.status === "finalized";
    const statusLabel = completed ? "COMPLETED" : "DRAFT";

    doc.setFillColor(13, 27, 42);
    doc.rect(0, 0, w, 30, "F");
    doc.setTextColor(255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(storeName, margin, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text([storePhone, storeAddress].filter(Boolean).join("  •  "), margin, 18);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(typeLabel.toUpperCase(), margin, 26);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255);
    doc.text(`# ${form.formNumber}`, w - margin, 12, { align: "right" });
    doc.text(new Date(form.createdAt).toLocaleDateString("en-NG"), w - margin, 18, { align: "right" });
    doc.text(`Type: ${typeLabel} • ${statusLabel}`, w - margin, 26, { align: "right" });

    // Status banner
    doc.setFillColor(completed ? 6 : 180, completed ? 150 : 140, completed ? 84 : 30);
    doc.rect(margin, 31.5, contentWidth, 6, "F");
    doc.setTextColor(255);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(completed ? "TRANSACTION COMPLETED" : "DRAFT — NOT YET COMPLETED", w / 2, 36, { align: "center" });
    doc.setTextColor(20);

    y = 43;
    doc.setTextColor(20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO / CUSTOMER", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (form.customerName || form.customerPhone) {
      doc.text(form.customerName || "—", margin, y);
      y += 5;
      if (form.customerPhone) {
        doc.text(`Phone: ${form.customerPhone}`, margin, y);
        y += 5;
      }
      if (form.customerEmail) {
        doc.text(`Email: ${form.customerEmail}`, margin, y);
        y += 5;
      }
    } else {
      doc.text("Walk-in / No customer recorded", margin, y);
      y += 5;
    }
    y += 4;

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("#", margin + 2, y + 4.5);
    doc.text("ITEM", margin + 10, y + 4.5);
    doc.text("QTY", margin + contentWidth - 52, y + 4.5);
    doc.text("UNIT", margin + contentWidth - 34, y + 4.5);
    doc.text("AMOUNT", margin + contentWidth - 8, y + 4.5, { align: "right" });
    y += 9;

    doc.setFont("helvetica", "normal");
    form.items.forEach((li, idx) => {
      if (y > 265) {
        doc.addPage();
        y = 18;
      }
      doc.setFontSize(8.5);
      doc.text(String(idx + 1), margin + 2, y);
      doc.text(li.itemName.slice(0, 42), margin + 10, y);
      doc.text(String(li.quantity), margin + contentWidth - 52, y);
      doc.text(NAIRA + li.unitPriceNgn.toLocaleString("en-NG"), margin + contentWidth - 34, y);
      doc.text(NAIRA + (li.unitPriceNgn * li.quantity).toLocaleString("en-NG"), margin + contentWidth - 8, y, { align: "right" });
      y += 6;
    });
    y += 4;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal", margin + contentWidth - 60, y);
    doc.text(NAIRA + (form.subtotalNgn || 0).toLocaleString("en-NG"), margin + contentWidth - 8, y, { align: "right" });
    y += 5;
    if (form.discountAmountNgn) {
      doc.text("Discount", margin + contentWidth - 60, y);
      doc.text("-" + NAIRA + form.discountAmountNgn.toLocaleString("en-NG"), margin + contentWidth - 8, y, { align: "right" });
      y += 5;
    }
    if (form.taxAmountNgn) {
      doc.text(`VAT (${taxRateNum}%)`, margin + contentWidth - 60, y);
      doc.text("+" + NAIRA + form.taxAmountNgn.toLocaleString("en-NG"), margin + contentWidth - 8, y, { align: "right" });
      y += 5;
    }
    doc.setDrawColor(20);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL", margin + contentWidth - 60, y);
    doc.text(NAIRA + (form.totalNgn || 0).toLocaleString("en-NG"), margin + contentWidth - 8, y, { align: "right" });
    y += 8;

    if (form.notes) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text(`Notes: ${form.notes}`, margin, y);
      y += 5;
    }

    y = 276;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(
      `Generated by NEXA Store OS  •  ${storeName}  •  ${new Date(form.createdAt).toLocaleString("en-NG")}  •  Transaction type: ${typeLabel}`,
      w / 2,
      y,
      { align: "center" }
    );
    doc.text(
      `Status: ${statusLabel}  •  Recorded by: ${form.recordedByName || "Staff"}  •  ${typeLabel.toLowerCase()} document. Thank you!`,
      w / 2,
      y + 4,
      { align: "center" }
    );

    doc.save(`${form.formNumber}.pdf`);
    toast.success(`PDF downloaded for ${form.formNumber}`);
  };

  if (openForm || creating) {
    return (
      <div className="mx-auto max-w-[1400px] h-full flex flex-col px-4 md:px-0">
        <div className="flex-1 nexa-card overflow-hidden bg-background my-4">
          <SalesFormBuilder
            editingForm={openForm}
            onSaved={() => {
              setOpenForm(null);
              setCreating(false);
            }}
            onExit={() => {
              setOpenForm(null);
              setCreating(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] h-full flex flex-col px-4 md:px-0">
      <div className="flex-1 overflow-y-auto py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <FileText className={cn("h-5 w-5", businessType === "restaurant" ? "text-emerald-600" : "text-primary")} />
              Sales Forms & Receipts
            </h1>
            <p className="text-xs text-muted-foreground">
              Fill line-item documents (receipts, proforma invoices, delivery & credit notes), save them, and export as PDF.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> Delete {selected.size}
              </Button>
            )}
            <Button size="sm" onClick={() => setCreating(true)} className={cn("gap-1.5", businessType === "restaurant" && "bg-emerald-600 hover:bg-emerald-700")}>
              <Plus className="h-3.5 w-3.5" /> New Form / Receipt
            </Button>
          </div>
        </div>

        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by number, customer, phone…" className="pl-8 h-9" />
        </div>

        {isLoading ? (
          <ListSkeleton items={6} />
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={FileText}
                title="No sales forms yet"
                description="Create your first receipt, proforma invoice, delivery note, or credit note."
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Saved Forms ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filtered.map((form) => (
                <div key={form.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(form.id)}
                    onChange={() => toggleSelect(form.id)}
                    className="rounded border-border"
                  />
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{form.formNumber}</p>
                      <Badge variant="secondary" className="text-[10px]">{FORM_TYPE_LABELS[form.formType]}</Badge>
                      <Badge variant={form.status === "finalized" ? "default" : "outline"} className={cn("text-[10px]", form.status === "finalized" && "bg-emerald-600 border-emerald-600 text-white")}>
                        {form.status === "finalized" ? "Completed" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {form.customerName || "Walk-in"} {form.customerPhone ? `• ${form.customerPhone}` : ""} • {new Date(form.createdAt).toLocaleDateString("en-NG")}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-sm shrink-0">{NAIRA}{(form.totalNgn || 0).toLocaleString("en-NG")}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => setOpenForm(form)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={form.status === "finalized" ? "Download PDF" : "Only finalized receipts can be printed"}
                      disabled={form.status !== "finalized"}
                      onClick={() => downloadPdf(form)}
                    >
                      <FileDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" title="Delete" onClick={() => handleDelete(form)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
