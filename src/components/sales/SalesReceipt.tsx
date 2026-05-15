import { useState } from "react";
import { format } from "date-fns";
import { Printer, Download, MessageCircle, UserCircle, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { SaleTransaction } from "@/types/inventory";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useBusiness } from "@/contexts/BusinessContext";
import { useTenant } from "@/contexts/TenantContext";

const NAIRA = "₦";

function fmtNgn(amount: number): string {
  return `${NAIRA}${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function buildReceiptText(sale: SaleTransaction, storeName: string, address: string, branchName?: string): string {
  const lines: string[] = [];
  lines.push(`🧾 *${storeName.toUpperCase()}*`);
  if (branchName) lines.push(`*Branch: ${branchName}*`);
  lines.push(`Order: #${sale.id.slice(-8).toUpperCase()}`);
  lines.push(`Date: ${format(new Date(sale.createdAt), "dd MMM, HH:mm")}`);
  if (sale.recordedByName) lines.push(`Staff: ${sale.recordedByName}`);
  lines.push("");
  
  sale.items.forEach((li) => {
    lines.push(`*${li.itemName}*`);
    lines.push(`${li.quantity} x ${li.unitPriceNgn.toLocaleString()} = ${li.totalPriceNgn?.toLocaleString() || (li.unitPriceNgn * li.quantity).toLocaleString()}`);
  });
  
  lines.push("");
  lines.push(`*TOTAL: ${NAIRA}${sale.totalNgn.toLocaleString()}*`);
  lines.push("");
  lines.push("Thank you for your purchase! 🙏");
  lines.push("_Powered by NEXA OS_");
  return lines.join("\n");
}

async function generateReceiptPDF(
  sale: SaleTransaction, 
  storeName: string, 
  address: string, 
  branchName?: string
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: [80, 260] }); // extended receipt length

  const w = 80;
  let y = 10;
  const lm = 6; 
  const rm = w - 6; 

  // Store name
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(storeName.toUpperCase(), w / 2, y, { align: "center" });
  y += 5;

  // Branch Name
  if (branchName) {
    doc.setFontSize(9);
    doc.text(branchName, w / 2, y, { align: "center" });
    y += 4.5;
  }
  
  // Address
  if (address) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const addrLines = doc.splitTextToSize(address, rm - lm);
    doc.text(addrLines, w / 2, y, { align: "center" });
    y += (addrLines.length * 3.5);
  }

  y += 2;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("SALES RECEIPT", w / 2, y, { align: "center" });
  y += 5;

  // Header Line
  doc.setLineWidth(0.3);
  doc.setDrawColor(0);
  doc.line(lm, y, rm, y);
  y += 5;

  // Receipt details
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Receipt #:", lm, y);
  doc.setFont("helvetica", "bold");
  doc.text(sale.id.slice(-8).toUpperCase(), rm, y, { align: "right" });
  y += 4;
  
  doc.setFont("helvetica", "normal");
  doc.text("Date:", lm, y);
  doc.text(format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm"), rm, y, { align: "right" });
  y += 4;

  doc.text("Payment:", lm, y);
  doc.setFont("helvetica", "bold");
  doc.text(((sale as any).paymentMethod || "CASH").toUpperCase(), rm, y, { align: "right" });
  y += 4;

  if (sale.recordedByName) {
    doc.setFont("helvetica", "normal");
    doc.text("Cashier:", lm, y);
    doc.text(sale.recordedByName, rm, y, { align: "right" });
    y += 4;
  }

  // Customer Details Section
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.text("CUSTOMER:", lm, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  if (sale.customerName) {
    doc.text(`Name: ${sale.customerName}`, lm + 2, y);
    y += 4;
  }
  if (sale.customerPhone) {
    doc.text(`Phone: ${sale.customerPhone}`, lm + 2, y);
    y += 4;
  }
  if (!sale.customerName && !sale.customerPhone) {
    doc.text("Walk-in Customer", lm + 2, y);
    y += 4;
  }

  y += 2;
  doc.setLineWidth(0.1);
  doc.line(lm, y, rm, y);
  y += 5;

  // Items Table Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("ITEM", lm, y);
  doc.text("QTY", lm + 35, y, { align: "center" });
  doc.text("PRICE", lm + 50, y, { align: "center" });
  doc.text("TOTAL", rm, y, { align: "right" });
  y += 2;
  doc.line(lm, y, rm, y);
  y += 4;

  // Line items
  doc.setFontSize(7);
  sale.items.forEach((li) => {
    doc.setFont("helvetica", "bold");
    const nameLines = doc.splitTextToSize(li.itemName, 33);
    doc.text(nameLines, lm, y);
    
    doc.setFont("helvetica", "normal");
    doc.text(li.quantity.toString(), lm + 35, y, { align: "center" });
    doc.text(li.unitPriceNgn.toLocaleString(), lm + 50, y, { align: "center" });
    doc.text((li.unitPriceNgn * li.quantity).toLocaleString(), rm, y, { align: "right" });
    
    y += Math.max(nameLines.length * 3.5, 4);
  });

  // Total
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(lm, y, rm, y);
  y += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL DUE", lm, y);
  doc.text(fmtNgn(sale.totalNgn), rm, y, { align: "right" });
  y += 10;

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Thank you for your business!", w / 2, y, { align: "center" });
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text(storeName.toUpperCase(), w / 2, y, { align: "center" });
  y += 4;
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("POWERED BY NEXA OS", w / 2, y, { align: "center" });

  return doc.output("blob");
}

interface SalesReceiptProps {
  sale: SaleTransaction;
  onClose: () => void;
}

export function SalesReceipt({ sale, onClose }: SalesReceiptProps) {
  const { profile } = useBusiness();
  const { store } = useTenant();

  const storeName = profile?.storeDetails?.name || "NEXA Store";
  const branch = store?.branches?.find(b => b.id === sale.branchId);
  const address = branch?.location || profile?.storeDetails?.address || "";

  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const blob = await generateReceiptPDF(sale, storeName, address, branch?.name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${sale.id.slice(-8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Receipt downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsAppText = () => {
    const text = buildReceiptText(sale, storeName, address, branch?.name);
    const cleaned = sale.customerPhone?.replace(/\D/g, "") ?? "";
    const intlPhone = cleaned.startsWith("0") ? `234${cleaned.slice(1)}` : cleaned;
    const url = `https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleWhatsAppPDF = async () => {
    const text = buildReceiptText(sale, storeName, address, branch?.name);
    const cleaned = sale.customerPhone?.replace(/\D/g, "") ?? "";
    const intlPhone = cleaned.startsWith("0") ? `234${cleaned.slice(1)}` : cleaned;
    
    try {
      const blob = await generateReceiptPDF(sale, storeName, address, branch?.name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${sale.id.slice(-8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    
    const waUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(text + "\n\n📎 PDF receipt attached separately")}`;
    window.open(waUrl, "_blank");
  };
  return (
    <>
      <Dialog open={!!sale} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md p-0 border-none bg-transparent shadow-none">
          {sale && (
            <div className="nexa-card bg-card p-8 space-y-6 relative overflow-hidden">
               {/* Decorative background element */}
               <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
               
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black tracking-tight text-foreground uppercase">Receipt</DialogTitle>
                    {address && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{address}</p>}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border-2 border-border bg-muted/20 p-5 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 h-1 w-full bg-primary" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Transaction ID</span>
                  <span className="font-mono font-black text-sm text-foreground bg-background px-2 py-1 rounded-lg border">#{sale.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Timestamp</span>
                  <span className="font-bold text-xs text-foreground">{format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Payment Method</span>
                  <Badge variant="outline" className="capitalize font-black text-[10px] tracking-wider bg-primary/5 border-primary/20 text-primary px-3">
                    {(sale as any).paymentMethod || "cash"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Cashier</span>
                  <div className="flex items-center gap-1.5">
                    <UserCircle className="h-3.5 w-3.5 text-primary" />
                    <span className="font-black text-xs text-foreground uppercase tracking-tight">{sale.recordedByName || "System"}</span>
                  </div>
                </div>
              </div>

              {sale.customerName && (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-sm">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Customer</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black">{sale.customerName}</span>
                    {sale.customerPhone && (
                      <span className="text-[10px] font-mono text-muted-foreground font-bold">{sale.customerPhone}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Line Items</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {sale.items.map((li, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-2xl border-2 border-border/40 bg-muted/5 hover:bg-muted/10 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate text-foreground">{li.itemName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{li.quantity} UNIT(S) @ {fmtNgn(li.unitPriceNgn)}</p>
                      </div>
                      <span className="font-mono text-sm font-black text-foreground shrink-0">{fmtNgn(li.unitPriceNgn * li.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-primary text-primary-foreground p-6 flex justify-between items-center shadow-xl shadow-primary/20">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Amount Paid</p>
                  <p className="text-xs font-bold opacity-60 italic">VAT inclusive (if applicable)</p>
                </div>
                <span className="text-3xl font-black font-mono tracking-tighter">{fmtNgn(sale.totalNgn)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button 
                  variant="outline"
                  className="gap-2 rounded-2xl h-14 font-black uppercase text-xs tracking-widest border-2 hover:bg-muted/50"
                  onClick={handlePrint}
                >
                  <Printer className="h-5 w-5" /> Print
                </Button>
                <Button 
                  variant="outline"
                  className="gap-2 rounded-2xl h-14 font-black uppercase text-xs tracking-widest border-2 hover:bg-muted/50"
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                >
                  <Download className="h-5 w-5" /> PDF
                </Button>
                {sale.customerPhone && (
                  <Button 
                    className="col-span-2 gap-3 rounded-2xl h-14 font-black uppercase text-xs tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                    onClick={handleWhatsAppText}
                  >
                    <MessageCircle className="h-5 w-5" /> Send to WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden Print-Only View optimized for 80mm thermal printers */}
      <div className="hidden print:block receipt-print-view font-mono text-black p-4">
        <div className="text-center space-y-1 mb-6">
          <h1 className="text-xl font-bold uppercase">{storeName}</h1>
          {address && <p className="text-[9px] uppercase">{address}</p>}
          <p className="text-[10px]">SALES RECEIPT</p>
        </div>

        <div className="text-[10px] space-y-1 mb-4">
          <div className="flex justify-between">
            <span>RECEIPT #:</span>
            <span className="font-bold">{sale.id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>DATE:</span>
            <span>{format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}</span>
          </div>
          <div className="flex justify-between">
            <span>PAYMENT:</span>
            <span className="font-bold">{((sale as any).paymentMethod || "CASH").toUpperCase()}</span>
          </div>
          {sale.recordedByName && (
            <div className="flex justify-between">
              <span>CASHIER:</span>
              <span>{sale.recordedByName.toUpperCase()}</span>
            </div>
          )}
        </div>

        <div className="border-y border-black border-dashed py-3 my-4">
          <div className="text-[10px] space-y-3">
            {sale.items.map((li, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span className="flex-1">{li.itemName.toUpperCase()}</span>
                  <span>{fmtNgn(li.unitPriceNgn * li.quantity)}</span>
                </div>
                <div className="text-[9px] opacity-80 pl-2">
                  {li.quantity} x {fmtNgn(li.unitPriceNgn)}
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

        <div className="text-center text-[10px] space-y-2 mt-10">
          <p>THANK YOU FOR YOUR PATRONAGE! 🙏</p>
          <p className="font-bold opacity-30">POWERED BY NEXA STORE OS</p>
        </div>
      </div>
    </>
  );
}
