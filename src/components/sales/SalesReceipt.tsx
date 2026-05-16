import { useState } from "react";
import { format } from "date-fns";
import { Printer, Download, MessageCircle, UserCircle, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { SaleTransaction } from "@/types/inventory";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBusiness } from "@/contexts/BusinessContext";
import { useTenant } from "@/contexts/TenantContext";
import { ensureDate } from "@/lib/date-utils";
import { useAuth } from "@/contexts/FirebaseAuthContext";


const NAIRA = "₦";

function fmtNgn(amount: number): string {
  return `${NAIRA}${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function buildReceiptText(sale: SaleTransaction, storeName: string, address: string, branchName?: string, storePhone?: string): string {
  const lines: string[] = [];
  lines.push(`🧾 *${storeName}*`);
  if (branchName) lines.push(`*Branch: ${branchName}*`);
  if (address) lines.push(`_${address}_`);
  if (storePhone) lines.push(`Tel: ${storePhone}`);
  lines.push(`Receipt #${sale.id.slice(-8).toUpperCase()}`);
  lines.push(`Date: ${format(ensureDate(sale.createdAt), "dd MMM yyyy, HH:mm")}`);
  lines.push(`Payment: ${(sale.paymentMethod || "CASH").toUpperCase()}`);
  if (sale.recordedByName) lines.push(`Cashier: ${sale.recordedByName}`);
  
  lines.push("");
  lines.push("*CUSTOMER DETAILS*");
  if (sale.customerName) lines.push(`Name: ${sale.customerName}`);
  if (sale.customerPhone) lines.push(`Phone: ${sale.customerPhone}`);
  if (sale.customerEmail) lines.push(`Email: ${sale.customerEmail}`);
  
  lines.push("");
  lines.push("─────────────────");
  lines.push("*ITEMS BOUGHT*");
  sale.items.forEach((li) => {
    const unitInfo = li.selectedUnit && li.selectedUnit !== "each" && li.selectedUnit !== "piece" ? ` (${li.selectedUnit})` : "";
    lines.push(`*${li.itemName}${unitInfo}*`);
    lines.push(`SKU: ${li.sku}`);
    lines.push(`${li.quantity} x ${li.unitPriceNgn.toLocaleString()} = ${(li.unitPriceNgn * li.quantity).toLocaleString()}`);
  });
  lines.push("─────────────────");
  
  if (sale.subtotalNgn && (sale.discountAmountNgn || sale.taxAmountNgn)) {
    lines.push(`Subtotal: ${fmtNgn(sale.subtotalNgn)}`);
    if (sale.discountAmountNgn) lines.push(`Discount: -${fmtNgn(sale.discountAmountNgn)}`);
    if (sale.taxAmountNgn) lines.push(`Tax (${sale.taxRate}%): +${fmtNgn(sale.taxAmountNgn)}`);
    lines.push("─────────────────");
  }
  
  lines.push(`*TOTAL: ${fmtNgn(sale.totalNgn)}*`);
  
  if (sale.amountPaidNgn) {
    lines.push(`Amount Paid: ${fmtNgn(sale.amountPaidNgn)}`);
    lines.push(`Change: ${fmtNgn(sale.changeGivenNgn || 0)}`);
  }
  
  lines.push("");
  lines.push("Thank you for your purchase! 🙏");
  lines.push("_Powered by NEXA OS_");
  return lines.join("\n");
}

async function generateReceiptPDF(
  sale: SaleTransaction, 
  storeName: string, 
  address: string, 
  branchName?: string,
  storePhone?: string,
  receiptFooter?: string
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  
  // 1. Calculate height dynamically
  const w = 80;
  const lm = 6;
  const rm = w - 6;
  
  // Create a temporary doc to measure text wrapping
  const tempDoc = new jsPDF({ unit: "mm", format: [80, 500] });
  let estimatedHeight = 20; // Start with top padding
  
  // Header section
  estimatedHeight += 15; // Store name
  if (branchName) estimatedHeight += 5;
  if (address) {
    const addrLines = tempDoc.splitTextToSize(address, rm - lm);
    estimatedHeight += (addrLines.length * 4);
  }
  if (storePhone) estimatedHeight += 5;
  estimatedHeight += 10; // Title & Header Line
  
  // Receipt details
  estimatedHeight += 15; // ID, Date, Payment
  if (sale.recordedByName) estimatedHeight += 5;
  
  // Customer
  estimatedHeight += 5; // Label
  if (sale.customerName) {
    const nameLines = tempDoc.splitTextToSize(`Name: ${sale.customerName}`, rm - (lm + 2));
    estimatedHeight += (nameLines.length * 4);
  }
  if (sale.customerPhone) estimatedHeight += 4;
  if (sale.customerEmail) {
    const emailLines = tempDoc.splitTextToSize(`Email: ${sale.customerEmail}`, rm - (lm + 2));
    estimatedHeight += (emailLines.length * 4);
  }
  if (!sale.customerName && !sale.customerPhone && !sale.customerEmail) estimatedHeight += 4;
  estimatedHeight += 10; // Line & Table Header
  
  // Items
  sale.items.forEach((li) => {
    const itemNameWithUnit = `${li.itemName}${li.selectedUnit && li.selectedUnit !== "each" ? ` (${li.selectedUnit})` : ""}`;
    const nameLines = tempDoc.splitTextToSize(itemNameWithUnit, 40);
    estimatedHeight += (nameLines.length * 5); // Item name lines
    estimatedHeight += 5; // SKU and Price line
  });

  
  // Totals
  estimatedHeight += 10; // Subtotal/Tax line
  if (sale.subtotalNgn && (sale.discountAmountNgn || sale.taxAmountNgn)) estimatedHeight += 20;
  estimatedHeight += 12; // Grand total
  if (sale.amountPaidNgn) estimatedHeight += 15;
  
  // Footer
  estimatedHeight += 15;
  if (receiptFooter) {
    const footerLines = tempDoc.splitTextToSize(receiptFooter, rm - lm);
    estimatedHeight += (footerLines.length * 5);
  }
  estimatedHeight += 15; // Powered by
  
  // 2. Create the actual document with calculated height
  const finalHeight = estimatedHeight + 40; // Add a generous buffer
  const doc = new jsPDF({ unit: "mm", format: [w, finalHeight] });

  let y = 10;

  // Store name
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(storeName.toUpperCase(), w / 2, y, { align: "center" });
  y += 6;

  // Branch Name
  if (branchName) {
    doc.setFontSize(9);
    doc.text(branchName, w / 2, y, { align: "center" });
    y += 5;
  }
  
  // Address
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  if (address) {
    const addrLines = doc.splitTextToSize(address, rm - lm);
    doc.text(addrLines, w / 2, y, { align: "center" });
    y += (addrLines.length * 3.5);
  }

  // Store Phone
  if (storePhone) {
    doc.text(`TEL: ${storePhone}`, w / 2, y, { align: "center" });
    y += 4;
  }

  y += 3;
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
  doc.text(format(ensureDate(sale.createdAt), "dd MMM yyyy, HH:mm"), rm, y, { align: "right" });
  y += 4;

  doc.text("Payment:", lm, y);
  doc.setFont("helvetica", "bold");
  doc.text(((sale.paymentMethod || "CASH")).toUpperCase(), rm, y, { align: "right" });
  y += 4;

  if (sale.recordedByName) {
    doc.setFont("helvetica", "normal");
    doc.text("Cashier:", lm, y);
    doc.setFont("helvetica", "bold");
    doc.text(sale.recordedByName.toUpperCase(), rm, y, { align: "right" });
    y += 4;
  }

  // Customer Details Section
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.text("CUSTOMER:", lm, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  if (sale.customerName) {
    const nameLines = doc.splitTextToSize(`Name: ${sale.customerName}`, rm - (lm + 2));
    doc.text(nameLines, lm + 2, y);
    y += (nameLines.length * 4);
  }
  if (sale.customerPhone) {
    doc.text(`Phone: ${sale.customerPhone}`, lm + 2, y);
    y += 4;
  }
  if (sale.customerEmail) {
    const emailLines = doc.splitTextToSize(`Email: ${sale.customerEmail}`, rm - (lm + 2));
    doc.text(emailLines, lm + 2, y);
    y += (emailLines.length * 4);
  }
  if (!sale.customerName && !sale.customerPhone && !sale.customerEmail) {
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
  doc.text("QTY", lm + 38, y, { align: "center" });
  doc.text("PRICE", lm + 52, y, { align: "center" });
  doc.text("TOTAL", rm, y, { align: "right" });
  y += 2;
  doc.line(lm, y, rm, y);
  y += 4;

  // Line items
  doc.setFontSize(7.5);
  sale.items.forEach((li) => {
    doc.setFont("helvetica", "bold");
    const itemNameWithUnit = `${li.itemName}${li.selectedUnit && li.selectedUnit !== "each" ? ` (${li.selectedUnit})` : ""}`;
    const nameLines = doc.splitTextToSize(itemNameWithUnit, 38);
    doc.text(nameLines, lm, y);
    
    const nameHeight = nameLines.length * 4;
    
    doc.setFont("helvetica", "normal");
    doc.text(li.quantity.toString(), lm + 38, y, { align: "center" });
    doc.text(li.unitPriceNgn.toLocaleString(), lm + 52, y, { align: "center" });
    doc.text((li.unitPriceNgn * li.quantity).toLocaleString(), rm, y, { align: "right" });
    
    y += nameHeight;
    
    // Add SKU on a new line
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.text(`SKU: ${li.sku || 'N/A'}`, lm, y);
    doc.setFontSize(7.5);
    y += 5;
  });


  // Financial Summary
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(lm, y, rm, y);
  y += 5;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");

  if (sale.subtotalNgn && (sale.discountAmountNgn || sale.taxAmountNgn)) {
    doc.text("Subtotal:", lm, y);
    doc.text(sale.subtotalNgn.toLocaleString(), rm, y, { align: "right" });
    y += 4;

    if (sale.discountAmountNgn) {
      doc.text("Discount:", lm, y);
      doc.text(`-${sale.discountAmountNgn.toLocaleString()}`, rm, y, { align: "right" });
      y += 4;
    }

    if (sale.taxAmountNgn) {
      doc.text(`Tax (${sale.taxRate}%):`, lm, y);
      doc.text(`+${sale.taxAmountNgn.toLocaleString()}`, rm, y, { align: "right" });
      y += 4;
    }
    
    doc.setLineWidth(0.1);
    doc.line(lm, y - 1, rm, y - 1);
    y += 2;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL DUE", lm, y);
  doc.text(fmtNgn(sale.totalNgn), rm, y, { align: "right" });
  y += 6;

  if (sale.amountPaidNgn) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Amount Paid:", lm, y);
    doc.text(fmtNgn(sale.amountPaidNgn), rm, y, { align: "right" });
    y += 4;
    doc.text("Change Given:", lm, y);
    doc.text(fmtNgn(sale.changeGivenNgn || 0), rm, y, { align: "right" });
    y += 6;
  }

  y += 5;

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Thank you for your business!", w / 2, y, { align: "center" });
  y += 5;

  if (receiptFooter) {
    doc.setFontSize(7);
    const footerLines = doc.splitTextToSize(receiptFooter, rm - lm);
    doc.text(footerLines, w / 2, y, { align: "center" });
    y += (footerLines.length * 4);
  }

  y += 3;
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
  const { user } = useAuth();


  const storeName = profile?.storeDetails?.name || "NEXA Store";
  const branch = store?.branches?.find(b => b.id === sale.branchId);
  const address = branch?.location || profile?.storeDetails?.address || "";

  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const blob = await generateReceiptPDF(
        sale, 
        storeName, 
        address, 
        branch?.name,
        profile?.storeDetails?.phone,
        profile?.storeDetails?.receiptFooter
      );
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
    const text = buildReceiptText(sale, storeName, address, branch?.name, profile?.storeDetails?.phone);
    const phone = sale.customerPhone?.replace(/\D/g, "") ?? "";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <Dialog open={!!sale} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md p-4 border-none bg-transparent shadow-none overflow-hidden flex items-center justify-center">

          {sale && (
            <div className="nexa-card bg-card flex flex-col max-h-[90vh] relative overflow-hidden w-[96vw] sm:w-full mx-auto shadow-2xl">
               <ScrollArea className="flex-1 w-full overflow-y-auto">
                <div className="p-4 sm:p-8 space-y-6">
                   {/* Decorative background element */}
                   <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/5 blur-3xl -z-10" />
                   
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
                      <span className="font-bold text-xs text-foreground">{format(ensureDate(sale.createdAt), "dd MMM yyyy, HH:mm")}</span>
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
                        <span className="font-black text-xs text-foreground uppercase tracking-tight">
                          {sale.recordedByName || user?.displayName || user?.email?.split('@')[0] || "Cashier"}
                        </span>
                      </div>
                    </div>

                  </div>

                  {sale.customerName && (
                    <div className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-sm">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Customer</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-black">{sale.customerName}</span>
                        <div className="flex flex-col items-end">
                          {sale.customerPhone && (
                            <span className="text-[10px] font-mono text-muted-foreground font-bold">{sale.customerPhone}</span>
                          )}
                          {sale.customerEmail && (
                            <span className="text-[9px] text-muted-foreground">{sale.customerEmail}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Line Items</h4>
                    <div className="space-y-2">
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

                  <div className="space-y-3 px-1">
                    {sale.subtotalNgn && (sale.discountAmountNgn || sale.taxAmountNgn) && (
                      <div className="rounded-2xl border border-border/50 bg-muted/5 p-4 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          <span>Subtotal</span>
                          <span className="font-mono text-foreground">{fmtNgn(sale.subtotalNgn)}</span>
                        </div>
                        {sale.discountAmountNgn && (
                          <div className="flex justify-between text-xs font-bold text-primary uppercase tracking-widest">
                            <span>Discount</span>
                            <span className="font-mono">-{fmtNgn(sale.discountAmountNgn)}</span>
                          </div>
                        )}
                        {sale.taxAmountNgn && (
                          <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            <span>Tax ({sale.taxRate}%)</span>
                            <span className="font-mono">+{fmtNgn(sale.taxAmountNgn)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="rounded-3xl bg-primary text-primary-foreground p-6 shadow-xl shadow-primary/20 space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Amount Due</p>
                          <p className="text-[8px] font-bold opacity-60 italic uppercase tracking-tighter">VAT inclusive (if applicable)</p>
                        </div>
                        <span className="text-3xl font-black font-mono tracking-tighter">{fmtNgn(sale.totalNgn)}</span>
                      </div>

                      {sale.amountPaidNgn && (
                        <div className="pt-3 border-t border-primary-foreground/20 space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-90">
                            <span>Amount Paid</span>
                            <span className="font-mono">{fmtNgn(sale.amountPaidNgn)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-90">
                            <span>Change Given</span>
                            <span className="font-mono">{fmtNgn(sale.changeGivenNgn || 0)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {profile?.storeDetails?.receiptFooter && (
                    <p className="text-[10px] text-center font-bold text-muted-foreground italic px-4">
                      "{profile.storeDetails.receiptFooter}"
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2 pb-4">
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
              </ScrollArea>
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
            <span>{format(ensureDate(sale.createdAt), "dd MMM yyyy, HH:mm")}</span>
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
              <div key={idx} className="space-y-0.5 border-b border-dashed border-border/40 pb-1 last:border-0">
                <div className="flex justify-between font-bold text-[11px]">
                  <span className="flex-1">{li.itemName.toUpperCase()}</span>
                  <span>{fmtNgn(li.unitPriceNgn * li.quantity)}</span>
                </div>
                <div className="flex justify-between text-[9px] opacity-80 px-1">
                  <span>{li.quantity} {li.selectedUnit || "unit"} × {fmtNgn(li.unitPriceNgn)}</span>
                  <span className="font-mono">{li.sku}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1 mb-8">
          {sale.subtotalNgn && (sale.discountAmountNgn || sale.taxAmountNgn) && (
            <div className="text-[10px] border-t border-black border-dotted pt-2 space-y-1">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{fmtNgn(sale.subtotalNgn)}</span>
              </div>
              {sale.discountAmountNgn && (
                <div className="flex justify-between">
                  <span>DISCOUNT:</span>
                  <span>-{fmtNgn(sale.discountAmountNgn)}</span>
                </div>
              )}
              {sale.taxAmountNgn && (
                <div className="flex justify-between">
                  <span>TAX ({sale.taxRate}%):</span>
                  <span>+{fmtNgn(sale.taxAmountNgn)}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-between items-center text-lg font-bold border-t border-black pt-2">
            <span>TOTAL</span>
            <span>{fmtNgn(sale.totalNgn)}</span>
          </div>
          {sale.amountPaidNgn && (
            <div className="text-[10px] space-y-1 pt-2 border-t border-black border-dotted">
              <div className="flex justify-between">
                <span>CASH PAID:</span>
                <span>{fmtNgn(sale.amountPaidNgn)}</span>
              </div>
              <div className="flex justify-between">
                <span>CHANGE:</span>
                <span>{fmtNgn(sale.changeGivenNgn || 0)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-[10px] space-y-2 mt-10">
          <p>THANK YOU FOR YOUR PATRONAGE! 🙏</p>
          {profile?.storeDetails?.receiptFooter && (
             <p className="italic font-bold">"{profile.storeDetails.receiptFooter.toUpperCase()}"</p>
          )}
          <p className="font-bold opacity-30">POWERED BY NEXA STORE OS</p>
        </div>
      </div>
    </>
  );
}
