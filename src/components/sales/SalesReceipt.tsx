import { useState } from "react";
import { format } from "date-fns";
import { Printer, X, Download, MessageCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { SaleTransaction } from "@/types/inventory";

const NAIRA = "₦";

function fmtNgn(amount: number): string {
  return `${NAIRA}${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function getStoreName(businessType: string | null): string {
  const names: Record<string, string> = {
    retail: "My Retail Store",
    restaurant: "My Restaurant",
    wholesale: "My Wholesale Store",
    general: "My Store",
  };
  return businessType ? names[businessType] ?? "My Store" : "My Store";
}

function buildReceiptText(sale: SaleTransaction, storeName: string): string {
  const lines: string[] = [];
  lines.push(`🧾 *${storeName}*`);
  lines.push(`Receipt #${sale.id.slice(-8).toUpperCase()}`);
  lines.push(`Date: ${format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}`);
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
  const doc = new jsPDF({ unit: "mm", format: [80, 200] }); // receipt width

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
  doc.text(`Powered by ${storeName}`, w / 2, y, { align: "center" });

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
    <Dialog open={!!sale} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 overflow-visible border-none bg-transparent shadow-none max-w-[480px] w-full focus:outline-none">
        <div className="nexa-card nexa-glass p-6 sm:p-10 flex flex-col max-h-[95vh] overflow-y-auto items-center w-full shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-700 ease-out">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 pointer-events-none" />
            
            {/* Header actions */}
            <div className="flex items-center justify-between mb-8 print:hidden w-full relative z-10">
              <div className="flex flex-col">
                <DialogTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">
                  Store Receipt
                </DialogTitle>
                <div className="h-0.5 w-6 bg-primary/40 mt-1 rounded-full" />
              </div>
              <button 
                type="button" 
                onClick={onClose} 
                className="rounded-full p-2.5 hover:bg-muted transition-all hover:rotate-90 group"
              >
                <X className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </button>
            </div>

            {/* Success Animation / Icon */}
            <div className="mb-8 relative group">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center relative z-10 animate-in zoom-in-50 duration-700 delay-200">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/40 transform group-hover:scale-110 transition-transform duration-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-in slide-in-from-bottom-4 duration-500 delay-500"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-150 opacity-40 animate-pulse" />
            </div>

            {/* Receipt body */}
            <div className="receipt-print-area space-y-8 w-full max-w-[360px] relative z-10">
              {/* Store header */}
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black tracking-tight text-foreground leading-tight">{storeName}</h2>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                  Transaction Successful
                </div>
              </div>

              <div className="py-2 flex items-center justify-center">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>

              {/* Receipt info */}
              <div className="space-y-4 bg-muted/20 backdrop-blur-sm p-5 rounded-[2rem] border border-border/40">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground/60 font-black uppercase tracking-widest">ID Reference</span>
                  <span className="font-mono font-black text-foreground bg-background/50 px-2 py-0.5 rounded-md border border-border/30">
                    {sale.id.slice(-12).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground/60 font-black uppercase tracking-widest">Date & Time</span>
                  <span className="font-black text-foreground">
                    {format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}
                  </span>
                </div>

                {(sale.customerName || sale.customerPhone) && (
                  <div className="pt-3 border-t border-border/30 space-y-3">
                    {sale.customerName && (
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground/60 font-black uppercase tracking-widest">Customer</span>
                        <span className="font-black text-foreground">{sale.customerName}</span>
                      </div>
                    )}
                    {sale.customerPhone && (
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground/60 font-black uppercase tracking-widest">Phone</span>
                        <span className="font-mono font-black text-foreground">{sale.customerPhone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Line items */}
              <div className="space-y-5 px-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Order Summary</p>
                  <div className="h-px flex-1 ml-4 bg-border/30" />
                </div>
                <div className="space-y-5">
                  {sale.items.map((li, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-6 group/item">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-foreground group-hover/item:text-primary transition-colors">{li.itemName}</p>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                          {li.quantity} × {fmtNgn(li.unitPriceNgn)}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-black text-foreground shrink-0 mt-0.5">
                        {fmtNgn(li.unitPriceNgn * li.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="py-4">
                 <Separator className="h-px border-dashed bg-transparent border-t-2 border-border/40" />
              </div>

              {/* Totals */}
              <div className="space-y-4 text-center pb-4">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">Total Amount Paid</p>
                <div className="relative inline-block px-8 py-2">
                  <div className="text-6xl font-black font-mono tracking-tighter text-foreground">
                    {fmtNgn(sale.totalNgn)}
                  </div>
                  <div className="absolute -inset-4 bg-primary/10 blur-2xl rounded-full -z-10 animate-pulse" />
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-4 pt-6 print:hidden">
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" size="lg" onClick={handlePrint} className="h-14 rounded-2xl border-2 font-black uppercase text-[10px] tracking-[0.2em] gap-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-lg hover:shadow-primary/20">
                    <Printer className="h-4 w-4" /> Print
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleDownloadPDF} disabled={downloading} className="h-14 rounded-2xl border-2 font-black uppercase text-[10px] tracking-[0.2em] gap-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-lg hover:shadow-primary/20">
                    <Download className="h-4 w-4" /> {downloading ? "..." : "PDF"}
                  </Button>
                </div>

                {sale.customerPhone && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border/30" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">Share Receipt</p>
                      <div className="h-px flex-1 bg-border/30" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleWhatsAppText}
                        className="h-14 rounded-2xl border-2 font-black uppercase text-[10px] tracking-[0.2em] gap-2 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-md"
                      >
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleWhatsAppPDF}
                        className="h-14 rounded-2xl border-2 font-black uppercase text-[10px] tracking-[0.2em] gap-2 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-md"
                      >
                        <FileText className="h-4 w-4" /> Share PDF
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-10 text-center relative">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/20 to-transparent" />
                <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.5em] pt-6">
                  NEXA Store OS
                </p>
                <p className="text-[8px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em] mt-1">
                  Secure Digital Receipt
                </p>
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}

