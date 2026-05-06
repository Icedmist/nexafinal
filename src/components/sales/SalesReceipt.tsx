import { useState } from "react";
import { format } from "date-fns";
import { Printer, X, Download, MessageCircle, FileText, UserCircle, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { SaleTransaction } from "@/types/inventory";

const NAIRA = "₦";

function fmtNgn(amount: number): string {
  return `${NAIRA}${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function buildReceiptText(sale: SaleTransaction, storeName: string): string {
  const lines: string[] = [];
  lines.push(`🧾 *${storeName}*`);
  lines.push(`Receipt #${sale.id.slice(-8).toUpperCase()}`);
  lines.push(`Date: ${format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}`);
  if (sale.recordedByName) lines.push(`Cashier: ${sale.recordedByName}`);
  if (sale.customerName) lines.push(`Customer: ${sale.customerName}`);
  lines.push("");
  lines.push("─────────────────");
  sale.items.forEach((li) => {
    lines.push(`${li.itemName}`);
    lines.push(`  ${li.quantity} × ${fmtNgn(li.unitPriceNgn)} = ${fmtNgn(li.unitPriceNgn * li.quantity)}`);
  });
  lines.push("─────────────────");
  lines.push(`*TOTAL: ${fmtNgn(sale.totalNgn)}*`);
  lines.push("");
  lines.push("Thank you for your purchase! 🙏");
  return lines.join("\n");
}

async function generateReceiptPDF(sale: SaleTransaction, storeName: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: [80, 220] }); // receipt width

  const w = 80;
  let y = 10;
  const lm = 6; // left margin
  const rm = w - 6; // right margin

  // Store name
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(storeName, w / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Receipt of Purchase", w / 2, y, { align: "center" });
  y += 6;

  // Line
  doc.setDrawColor(200);
  doc.line(lm, y, rm, y);
  y += 5;

  // Receipt info
  doc.setFontSize(8);
  doc.text("Receipt #", lm, y);
  doc.setFont("helvetica", "bold");
  doc.text(sale.id.slice(-8).toUpperCase(), rm, y, { align: "right" });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text("Date", lm, y);
  doc.text(format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm"), rm, y, { align: "right" });
  y += 4;

  if (sale.recordedByName) {
    doc.text("Cashier", lm, y);
    doc.text(sale.recordedByName, rm, y, { align: "right" });
    y += 4;
  }

  if (sale.customerName) {
    doc.text("Customer", lm, y);
    doc.text(sale.customerName, rm, y, { align: "right" });
    y += 4;
  }
  if (sale.customerPhone) {
    doc.text("Phone", lm, y);
    doc.text(sale.customerPhone, rm, y, { align: "right" });
    y += 4;
  }

  y += 2;
  doc.line(lm, y, rm, y);
  y += 5;

  // Line items
  doc.setFontSize(8);
  sale.items.forEach((li) => {
    doc.setFont("helvetica", "bold");
    const name = li.itemName.length > 28 ? li.itemName.slice(0, 26) + "…" : li.itemName;
    doc.text(name, lm, y);
    y += 3.5;
    doc.setFont("helvetica", "normal");
    doc.text(`${li.quantity} x ${fmtNgn(li.unitPriceNgn)}`, lm + 2, y);
    doc.text(fmtNgn(li.unitPriceNgn * li.quantity), rm, y, { align: "right" });
    y += 5;
  });

  // Total
  doc.line(lm, y, rm, y);
  y += 5;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", lm, y);
  doc.text(fmtNgn(sale.totalNgn), rm, y, { align: "right" });
  y += 8;

  // Footer
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your purchase!", w / 2, y, { align: "center" });
  y += 3;
  doc.text(`Powered by NEXA Store OS`, w / 2, y, { align: "center" });

  return doc.output("blob");
}

interface SalesReceiptProps {
  sale: SaleTransaction;
  onClose: () => void;
}

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useBusiness } from "@/contexts/BusinessContext";

export function SalesReceipt({ sale, onClose }: SalesReceiptProps) {
  const { profile } = useBusiness();
  const storeName = profile?.storeDetails?.name || "NEXA Store";
  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const blob = await generateReceiptPDF(sale, storeName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${sale.id.slice(-8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Receipt downloaded!");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsAppText = () => {
    const text = buildReceiptText(sale, storeName);
    const phone = sale.customerPhone?.replace(/\D/g, "") ?? "";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleWhatsAppPDF = async () => {
    const text = buildReceiptText(sale, storeName);
    const phone = sale.customerPhone?.replace(/\D/g, "") ?? "";
    try {
      const blob = await generateReceiptPDF(sale, storeName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${sale.id.slice(-8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text + "\n\n📎 PDF receipt attached separately")}`;
    window.open(waUrl, "_blank");
  };

  return (
    <>
      <Dialog open={!!sale} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 overflow-visible border-none bg-transparent shadow-none max-w-[450px] w-full focus:outline-none no-print">
        <div className="nexa-card nexa-glass p-8 sm:p-10 flex flex-col max-h-[95vh] overflow-y-auto items-center w-full shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] relative animate-in fade-in zoom-in-95 duration-500 border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5 pointer-events-none" />
            
            {/* Header actions */}
            <div className="flex items-center justify-between mb-8 print:hidden w-full relative z-10">
              <div className="flex flex-col">
                <DialogTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">
                  Transaction Receipt
                </DialogTitle>
                <div className="h-0.5 w-6 bg-primary/30 mt-1 rounded-full" />
              </div>
              <button 
                type="button" 
                onClick={onClose} 
                className="rounded-full p-2 hover:bg-white/10 transition-all group"
              >
                <X className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </button>
            </div>

            {/* Receipt Content Area */}
            <div className="receipt-print-area w-full flex flex-col items-center text-center space-y-8 relative z-10">
              
              {/* Store Logo/Name */}
              <div className="space-y-2 flex flex-col items-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 border border-primary/20">
                  <Receipt className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-3xl font-black tracking-tight text-foreground">{storeName}</h2>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">Official Purchase Record</p>
              </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Payment Successful
              </div>

              {/* Primary Info Table */}
              <div className="w-full space-y-4 py-6 border-y border-white/5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-left space-y-1">
                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Reference</p>
                    <p className="font-mono text-xs font-black text-foreground">#{sale.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Date</p>
                    <p className="text-xs font-black text-foreground">{format(new Date(sale.createdAt), "dd MMM yyyy")}</p>
                  </div>
                  <div className="text-left space-y-1">
                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Cashier</p>
                    <div className="flex items-center gap-1.5 justify-start">
                      <UserCircle className="h-3 w-3 text-primary/60" />
                      <p className="text-xs font-black text-foreground">{sale.recordedByName || "Store Assistant"}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Time</p>
                    <p className="text-xs font-black text-foreground">{format(new Date(sale.createdAt), "HH:mm")}</p>
                  </div>
                </div>
              </div>

              {/* Customer Info (Optional) */}
              {(sale.customerName || sale.customerPhone) && (
                <div className="w-full bg-white/5 rounded-2xl p-4 space-y-3">
                  <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest text-center">Customer Information</p>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-muted-foreground">Name</span>
                    <span className="text-xs font-black text-foreground">{sale.customerName || "Guest"}</span>
                  </div>
                  {sale.customerPhone && (
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-bold text-muted-foreground">Contact</span>
                      <span className="text-xs font-mono font-black text-primary">{sale.customerPhone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Items List */}
              <div className="w-full space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">Items</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
                <div className="space-y-4 text-left">
                  {sale.items.map((li, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-foreground leading-none mb-1">{li.itemName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                          {li.quantity} × {fmtNgn(li.unitPriceNgn)}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-black text-foreground">
                        {fmtNgn(li.unitPriceNgn * li.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Section */}
              <div className="w-full pt-4 space-y-6">
                <Separator className="h-px border-dashed bg-transparent border-t-2 border-white/10" />
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.4em]">Total Amount</p>
                  <div className="text-6xl font-black font-mono tracking-tighter text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                    {fmtNgn(sale.totalNgn)}
                  </div>
                </div>
                <Separator className="h-px border-dashed bg-transparent border-t-2 border-white/10" />
              </div>

              {/* Footer */}
              <div className="pt-4 space-y-3">
                <p className="text-xs font-bold text-muted-foreground">Thank you for your purchase! 🙏</p>
                <div className="flex items-center justify-center gap-2">
                   <div className="h-1 w-1 rounded-full bg-primary/30" />
                   <p className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.5em]">NEXA Store OS</p>
                   <div className="h-1 w-1 rounded-full bg-primary/30" />
                </div>
              </div>

              {/* Print Actions */}
              <div className="w-full grid grid-cols-2 gap-3 pt-6 print:hidden">
                <Button variant="outline" size="lg" onClick={handlePrint} className="h-14 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-primary hover:text-primary-foreground transition-all">
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button variant="outline" size="lg" onClick={handleDownloadPDF} disabled={downloading} className="h-14 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-primary hover:text-primary-foreground transition-all">
                  <Download className="h-4 w-4" /> {downloading ? "..." : "Save PDF"}
                </Button>
                {sale.customerPhone && (
                  <>
                    <Button variant="outline" size="lg" onClick={handleWhatsAppText} className="h-14 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest gap-2 hover:border-emerald-500 hover:text-emerald-500 transition-all col-span-1">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </Button>
                    <Button variant="outline" size="lg" onClick={handleWhatsAppPDF} className="h-14 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest gap-2 hover:border-emerald-500 hover:text-emerald-500 transition-all col-span-1">
                      <FileText className="h-4 w-4" /> Send PDF
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>

    {/* Hidden Print-Only View optimized for 80mm thermal printers */}
    <div className="hidden print:block receipt-print-view font-sans text-black">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-xl font-bold uppercase">{storeName}</h1>
        <p className="text-[10px] font-medium tracking-widest">OFFICIAL RECEIPT</p>
      </div>

      <div className="text-[10px] space-y-1 mb-4">
        <div className="flex justify-between">
          <span>Receipt #:</span>
          <span className="font-bold">{sale.id.slice(-8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}</span>
        </div>
        {sale.recordedByName && (
          <div className="flex justify-between">
            <span>Cashier:</span>
            <span>{sale.recordedByName}</span>
          </div>
        )}
        {sale.customerName && (
          <div className="flex justify-between">
            <span>Customer:</span>
            <span>{sale.customerName}</span>
          </div>
        )}
      </div>

      <div className="border-y border-black border-dashed py-3 my-4">
        <div className="text-[10px] space-y-3">
          {sale.items.map((li, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between font-bold">
                <span className="flex-1">{li.itemName}</span>
                <span>{fmtNgn(li.unitPriceNgn * li.quantity)}</span>
              </div>
              <div className="text-[9px] text-gray-600 pl-2">
                {li.quantity} × {fmtNgn(li.unitPriceNgn)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 mb-8">
        <div className="flex justify-between items-center text-lg font-bold">
          <span>TOTAL</span>
          <span>{fmtNgn(sale.totalNgn)}</span>
        </div>
      </div>

      <div className="text-center text-[9px] space-y-1 mt-10">
        <p>Thank you for your purchase! 🙏</p>
        <p className="font-bold tracking-widest opacity-50">NEXA STORE OS</p>
      </div>
    </div>
  </>
  );
}

