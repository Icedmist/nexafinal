import { useState } from "react";
import { format } from "date-fns";
import { Printer, X, Download, MessageCircle, UserCircle, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { SaleTransaction } from "@/types/inventory";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useBusiness } from "@/contexts/BusinessContext";

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

  return (
    <>
      <Dialog open={!!sale} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md p-0 border-none bg-transparent shadow-none [&>button]:hidden">
          {sale && (
            <div className="nexa-card bg-card p-6 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Sale Receipt</DialogTitle>
                <button 
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-1 w-full bg-primary/20" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider">Transaction ID</span>
                  <span className="font-mono font-black text-foreground">#{sale.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider">Date & Time</span>
                  <span className="font-bold text-foreground">{format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-border/50">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider">Payment Method</span>
                  <div className="flex items-center gap-1.5">
                    <span className="capitalize font-black text-primary">{(sale as any).paymentMethod || "cash"}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-border/50">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider">Cashier</span>
                  <div className="flex items-center gap-1.5">
                    <UserCircle className="h-3 w-3 text-primary/60" />
                    <span className="font-black text-foreground">{sale.recordedByName || "Store Assistant"}</span>
                  </div>
                </div>
              </div>

              {sale.customerName && (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm border-primary/10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <UserCircle className="h-3 w-3" /> Customer Info
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black">{sale.customerName}</span>
                    {sale.customerPhone && (
                      <span className="text-xs font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">{sale.customerPhone}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Items Purchased</h4>
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {sale.items.map((li, idx) => (
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
                <span className="text-3xl font-black font-mono tracking-tighter text-primary">{fmtNgn(sale.totalNgn)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button 
                  variant="outline"
                  className="gap-2 rounded-xl h-12 font-black uppercase text-xs tracking-widest border-2"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button 
                  variant="outline"
                  className="gap-2 rounded-xl h-12 font-black uppercase text-xs tracking-widest border-2"
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                >
                  <Download className="h-4 w-4" /> PDF
                </Button>
                {sale.customerPhone && (
                  <Button 
                    variant="outline"
                    className="col-span-2 gap-2 rounded-xl h-12 font-black uppercase text-xs tracking-widest border-2 border-emerald-500/50 text-emerald-600 hover:bg-emerald-50"
                    onClick={handleWhatsAppText}
                  >
                    <MessageCircle className="h-4 w-4" /> Send via WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}
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
