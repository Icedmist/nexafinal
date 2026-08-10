import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Printer, Download, MessageCircle, UserCircle, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { SaleTransaction, DebtPayment, ImportedDebt } from "@/types/inventory";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBusiness } from "@/contexts/BusinessContext";
import { useTenant } from "@/contexts/TenantContext";
import { ensureDate } from "@/lib/date-utils";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useSales, useDebtPayments, useImportedDebts } from "@/hooks/useSalesData";
import { getSaleOutstanding } from "@/lib/credit-sale";
import { cn } from "@/lib/utils";

interface DebtInfo {
  remainingThisSale: number;
  totalOutstanding: number;
  payments: DebtPayment[];
}

function buildDebtInfo(
  sale: SaleTransaction,
  allSales: SaleTransaction[],
  payments: DebtPayment[],
  importedDebts: ImportedDebt[]
): DebtInfo | null {
  const phone = sale.customerPhone?.trim().toLowerCase();
  if (!phone) return null;

  const totalSaleOutstanding = allSales
    .filter((s) => s.customerPhone?.trim().toLowerCase() === phone)
    .reduce((sum, s) => sum + getSaleOutstanding(s), 0);

  const importedTotal = importedDebts
    .filter((d) => d.customerPhone?.trim().toLowerCase() === phone)
    .reduce((sum, d) => sum + (Number(d.amountNgn) || 0), 0);

  const paid = payments
    .filter((p) => p.customerPhone?.trim().toLowerCase() === phone)
    .reduce((sum, p) => sum + (Number(p.amountNgn) || 0), 0);

  const outstanding = Math.max(0, totalSaleOutstanding + importedTotal - paid);
  if (outstanding === 0 && getSaleOutstanding(sale) === 0) return null;

  return {
    remainingThisSale: getSaleOutstanding(sale),
    totalOutstanding: outstanding,
    payments: payments
      .filter((p) => p.customerPhone?.trim().toLowerCase() === phone)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  };
}


const NAIRA = "₦";

function fmtNgn(amount: number): string {
  return `${NAIRA}${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function buildReceiptText(sale: SaleTransaction, storeName: string, address: string, branchName?: string, storePhone?: string, debtInfo?: DebtInfo): string {
  const outstanding = getSaleOutstanding(sale);
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
    if (outstanding > 0) {
      lines.push(`*⚠️ BALANCE DUE (DEBT): ${fmtNgn(outstanding)}*`);
    } else if ((sale as any).creditAddedNgn > 0) {
      lines.push(`*🎁 Store Credit Added: ${fmtNgn((sale as any).creditAddedNgn)}*`);
    } else {
      lines.push(`Change: ${fmtNgn(sale.changeGivenNgn || 0)}`);
    }
  }
  
  if (outstanding > 0) {
    lines.push("");
    lines.push("_⚠️ PARTIAL PAYMENT — Balance outstanding_");
  }

  // Transaction Status
  lines.push("");
  lines.push("─────────────────");
  const remainBal = outstanding;
  if (sale.isCreditSale && (!sale.amountPaidNgn || sale.amountPaidNgn <= 0)) {
    lines.push("*🔴 STATUS: UNPAID — FULL DEBT*");
    lines.push(`Outstanding: ${fmtNgn(remainBal)}`);
  } else if (sale.isCreditSale && sale.amountPaidNgn && sale.amountPaidNgn > 0 && remainBal > 0) {
    lines.push("*🟡 STATUS: PARTIAL PAYMENT*");
    lines.push(`Paid: ${fmtNgn(sale.amountPaidNgn)} · Remaining: ${fmtNgn(remainBal)}`);
  } else {
    lines.push("*🟢 STATUS: PAID IN FULL*");
    lines.push(`Total: ${fmtNgn(sale.totalNgn)}`);
  }

  if (debtInfo) {
    lines.push("");
    lines.push("─────────────────");
    lines.push("*📋 DEBT & PAYMENTS*");
    lines.push(`Balance remaining (this sale): ${fmtNgn(debtInfo.remainingThisSale)}`);
    if (debtInfo.payments.length > 0) {
      lines.push("");
      lines.push("*Payments received:*");
      debtInfo.payments.forEach((p) => {
        const when = format(ensureDate(p.createdAt), "dd MMM yyyy, HH:mm");
        const via = p.paymentMethod ? ` (${p.paymentMethod})` : "";
        lines.push(`• ${fmtNgn(p.amountNgn)}${via} — ${when}`);
      });
    } else {
      lines.push("No debt payments recorded yet.");
    }
    lines.push(`*Total debt across all sales: ${fmtNgn(debtInfo.totalOutstanding)}*`);
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
  receiptFooter?: string,
  debtInfo?: DebtInfo
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
  estimatedHeight += 22; // Transaction status banner

  // Debt & payments section
  if (debtInfo) {
    estimatedHeight += 15;
    const paymentLines = debtInfo.payments.length > 0 ? debtInfo.payments.length * 4 : 4;
    estimatedHeight += Math.max(10, paymentLines);
  }
  
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
    const outstanding = getSaleOutstanding(sale);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Amount Paid:", lm, y);
    doc.text(fmtNgn(sale.amountPaidNgn), rm, y, { align: "right" });
    y += 4;
    if (outstanding > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 80, 0);
      doc.text("BALANCE DUE (DEBT):", lm, y);
      doc.text(fmtNgn(outstanding), rm, y, { align: "right" });
      doc.setTextColor(0);
      y += 5;
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.text("** PARTIAL PAYMENT — Balance outstanding **", w / 2, y, { align: "center" });
      doc.setFontSize(8);
      y += 5;
    } else if ((sale as any).creditAddedNgn > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 120, 60);
      doc.text("Store Credit Added:", lm, y);
      doc.text(fmtNgn((sale as any).creditAddedNgn), rm, y, { align: "right" });
      doc.setTextColor(0);
      y += 6;
    } else {
      doc.text("Change Given:", lm, y);
      doc.text(fmtNgn(sale.changeGivenNgn || 0), rm, y, { align: "right" });
      y += 6;
    }
  }

  y += 5;

  // ── TRANSACTION STATUS BANNER ──
  {
    const outstanding = getSaleOutstanding(sale);
    const isPaid = !sale.isCreditSale && outstanding <= 0;
    const isPartial = sale.isCreditSale && sale.amountPaidNgn && sale.amountPaidNgn > 0 && outstanding > 0;
    const isFullDebt = sale.isCreditSale && (!sale.amountPaidNgn || sale.amountPaidNgn <= 0);

    // Banner background
    const bgR = isPaid ? 6 : isPartial ? 200 : 180;
    const bgG = isPaid ? 150 : isPartial ? 120 : 50;
    const bgB = isPaid ? 84 : isPartial ? 0 : 0;
    doc.setFillColor(bgR, bgG, bgB);
    doc.roundedRect(lm, y, rm - lm, 14, 2, 2, "F");

    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    let statusLabel = "PAID IN FULL";
    let statusDetail = `Total: ${fmtNgn(sale.totalNgn)}`;
    if (isFullDebt) {
      statusLabel = "⚠ UNPAID — FULL DEBT";
      statusDetail = `Outstanding: ${fmtNgn(outstanding)}`;
    } else if (isPartial) {
      statusLabel = "⚠ PARTIAL PAYMENT";
      statusDetail = `Paid: ${fmtNgn(sale.amountPaidNgn!)} · Remaining: ${fmtNgn(outstanding)}`;
    }

    doc.text(statusLabel, w / 2, y + 5.5, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(statusDetail, w / 2, y + 10.5, { align: "center" });
    doc.setTextColor(0);
    y += 18;
  }

  // Debt & payments section
  if (debtInfo) {
    doc.setLineWidth(0.3);
    doc.line(lm, y, rm, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("DEBT & PAYMENTS", lm, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.text("Balance remaining (this sale):", lm, y);
    doc.setFont("helvetica", "bold");
    doc.text(fmtNgn(debtInfo.remainingThisSale), rm, y, { align: "right" });
    y += 5;
    doc.setFont("helvetica", "normal");

    if (debtInfo.payments.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Payments received:", lm, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      debtInfo.payments.forEach((p) => {
        const when = format(ensureDate(p.createdAt), "dd MMM yyyy");
        const via = p.paymentMethod ? ` (${p.paymentMethod})` : "";
        doc.setFontSize(6.5);
        doc.text(`${fmtNgn(p.amountNgn)}${via}  ${when}`, lm + 2, y);
        y += 4;
      });
      doc.setFontSize(8);
    } else {
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "italic");
      doc.text("No debt payments recorded yet.", lm + 2, y);
      y += 4;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
    }

    doc.setLineWidth(0.1);
    doc.line(lm, y - 1, rm, y - 1);
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 80, 0);
    doc.text("Total debt across all sales:", lm, y);
    doc.text(fmtNgn(debtInfo.totalOutstanding), rm, y, { align: "right" });
    doc.setTextColor(0);
    y += 6;
  }

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
  const businessType = profile?.businessType || "retail";
  const { store } = useTenant();
  const { user } = useAuth();


  const storeName = profile?.storeDetails?.name || "NEXA Store";
  const branch = store?.branches?.find(b => b.id === sale.branchId);
  const address = branch?.location || profile?.storeDetails?.address || "";
  const storePhone = profile?.storeDetails?.phone || "";

  const { data: allSales } = useSales();
  const { data: payments } = useDebtPayments();
  const { data: importedDebts } = useImportedDebts();

  const debtInfo = useMemo(
    () => buildDebtInfo(sale, allSales || [], payments || [], importedDebts || []),
    [sale, allSales, payments, importedDebts]
  );
  const outstanding = getSaleOutstanding(sale);

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
        profile?.storeDetails?.receiptFooter,
        debtInfo || undefined
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
    const text = buildReceiptText(sale, storeName, address, branch?.name, profile?.storeDetails?.phone, debtInfo || undefined);
    let phone = sale.customerPhone?.replace(/\D/g, "") ?? "";
    
    if (!phone) {
      const inputPhone = window.prompt("Enter customer WhatsApp/Phone number (with country code, e.g. 2348012345678):");
      if (inputPhone === null) return; // User cancelled
      phone = inputPhone.replace(/\D/g, "");
    }

    if (!phone) {
      toast.error("A WhatsApp number is required to send the receipt.");
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <Dialog open={!!sale} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md p-1.5 sm:p-3 border-none bg-transparent shadow-none overflow-hidden flex items-center justify-center">

          {sale && (
            <div className="nexa-card bg-card flex flex-col max-h-[90vh] relative overflow-hidden w-full mx-auto shadow-2xl">
               <ScrollArea className="flex-1 w-full overflow-y-auto">
                <div className="p-3 sm:p-4 space-y-3">
                   {/* Decorative background element */}
                   <div className={cn(
                     "absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl -z-10",
                     businessType === "restaurant" ? "bg-emerald-600/5" : "bg-primary/5"
                   )} />
                   
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        businessType === "restaurant" ? "bg-emerald-600/10 text-emerald-600" : "bg-primary/10 text-primary"
                      )}>
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <DialogTitle className="text-lg font-black tracking-tight text-foreground uppercase">Receipt</DialogTitle>
                        {(address || storePhone) && <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest break-words leading-snug">{[address, storePhone && `Tel: ${storePhone}`].filter(Boolean).join(" • ")}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/20 p-3 space-y-2 relative overflow-hidden">
                    <div className={cn(
                      "absolute top-0 left-0 h-1 w-full",
                      businessType === "restaurant" ? "bg-emerald-600" : "bg-primary"
                    )} />
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest shrink-0">Transaction ID</span>
                      <span className="font-mono font-black text-xs text-foreground bg-background px-2 py-1 rounded-lg border truncate">#{sale.id.slice(-8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest shrink-0">Timestamp</span>
                      <span className="font-bold text-[11px] text-foreground text-right">{format(ensureDate(sale.createdAt), "dd MMM yyyy, HH:mm")}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2 pt-2 border-t border-border/50">
                      <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest shrink-0">Payment Method</span>
                      <Badge variant="outline" className={cn(
                        "capitalize font-black text-[10px] tracking-wider px-3",
                        businessType === "restaurant" ? "bg-emerald-600/5 border-emerald-600/20 text-emerald-600" : "bg-primary/5 border-primary/20 text-primary"
                      )}>
                        {(sale as any).paymentMethod || "cash"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center gap-2 pt-2 border-t border-border/50">
                      <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest shrink-0">Cashier</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <UserCircle className={cn("h-3.5 w-3.5 shrink-0", businessType === "restaurant" ? "text-emerald-600" : "text-primary")} />
                        <span className="font-black text-xs text-foreground uppercase tracking-tight truncate">
                          {sale.recordedByName || user?.displayName || user?.email?.split('@')[0] || "Cashier"}
                        </span>
                      </div>
                    </div>

                  </div>

                  {sale.customerName && (
                    <div className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm">
                      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Customer</p>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-black min-w-0 truncate">{sale.customerName}</span>
                        <div className="flex flex-col items-end shrink-0">
                          {sale.customerPhone && (
                            <span className="text-[10px] font-mono text-muted-foreground font-bold">{sale.customerPhone}</span>
                          )}
                          {sale.customerEmail && (
                            <span className="text-[9px] text-muted-foreground break-all">{sale.customerEmail}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">Line Items</h4>
                    <div className="space-y-2">
                      {sale.items.map((li, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/40 bg-muted/5 hover:bg-muted/10 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black truncate text-foreground">{li.itemName}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
                              <span>{li.quantity} {li.selectedUnit || "unit"}(s) @ {fmtNgn(li.unitPriceNgn)}</span>
                              {li.customPriceNgn !== undefined && (
                                <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 rounded border border-amber-500/20">Custom Price</span>
                              )}
                            </p>
                          </div>
                          <span className="font-mono text-sm font-black text-foreground shrink-0">{fmtNgn(li.unitPriceNgn * li.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 px-1">
                    {sale.subtotalNgn && (sale.discountAmountNgn || sale.taxAmountNgn) && (
                      <div className="rounded-xl border border-border/50 bg-muted/5 p-3 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          <span>Subtotal</span>
                          <span className="font-mono text-foreground">{fmtNgn(sale.subtotalNgn)}</span>
                        </div>
                        {sale.discountAmountNgn && (
                          <div className={cn(
                            "flex justify-between text-xs font-bold uppercase tracking-widest",
                            businessType === "restaurant" ? "text-emerald-600" : "text-primary"
                          )}>
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

                    <div className={cn(
                      "rounded-2xl p-4 shadow-lg space-y-3",
                      businessType === "restaurant"
                        ? "bg-emerald-600 text-white shadow-emerald-500/20"
                        : "bg-primary text-primary-foreground shadow-primary/20"
                    )}>
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Total Amount Due</p>
                          <p className="text-[7px] font-bold opacity-60 italic uppercase tracking-tighter">VAT inclusive (if applicable)</p>
                        </div>
                        <span className="text-xl sm:text-2xl font-black font-mono tracking-tighter break-words">{fmtNgn(sale.totalNgn)}</span>
                      </div>

                      {sale.amountPaidNgn && (
                        <div className={cn(
                          "pt-3 border-t space-y-2",
                          businessType === "restaurant" ? "border-white/20" : "border-primary-foreground/20"
                        )}>
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-90">
                            <span>Amount Paid</span>
                            <span className="font-mono">{fmtNgn(sale.amountPaidNgn)}</span>
                          </div>
                          {outstanding > 0 ? (
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest bg-white/10 rounded-lg px-2 py-1.5">
                              <span className="flex items-center gap-1">⚠️ Balance Due (Debt)</span>
                              <span className="font-mono">{fmtNgn(outstanding)}</span>
                            </div>
                          ) : (sale as any).creditAddedNgn > 0 ? (
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 rounded-lg px-2 py-1.5">
                              <span>🎁 Store Credit Added</span>
                              <span className="font-mono">{fmtNgn((sale as any).creditAddedNgn)}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest opacity-90">
                              <span>Change Given</span>
                              <span className="font-mono">{fmtNgn(sale.changeGivenNgn || 0)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {debtInfo && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Wallet className={cn("h-4 w-4", businessType === "restaurant" ? "text-emerald-600" : "text-amber-600")} />
                        <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Debt & Payments</h4>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span>Balance remaining (this sale)</span>
                        <span className="font-mono text-amber-600 dark:text-amber-400">{fmtNgn(debtInfo.remainingThisSale)}</span>
                      </div>
                      {debtInfo.payments.length > 0 ? (
                        <div className="space-y-1 pt-1 border-t border-amber-500/20">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Payments received</p>
                          {debtInfo.payments.map((p) => (
                            <div key={p.id} className="flex justify-between items-center text-[10px]">
                              <span className="font-mono font-bold">{fmtNgn(p.amountNgn)}{p.paymentMethod ? ` (${p.paymentMethod})` : ""}</span>
                              <span className="text-[9px] text-muted-foreground font-bold">{format(ensureDate(p.createdAt), "dd MMM yyyy, HH:mm")}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">No debt payments recorded yet.</p>
                      )}
                      <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest bg-amber-500/10 rounded-lg px-2 py-1.5 border border-amber-500/20">
                        <span className="flex items-center gap-1">💳 Total debt across all sales</span>
                        <span className="font-mono">{fmtNgn(debtInfo.totalOutstanding)}</span>
                      </div>
                    </div>
                  )}

                  {profile?.storeDetails?.receiptFooter && (
                    <p className="text-[10px] text-center font-bold text-muted-foreground italic px-4">
                      "{profile.storeDetails.receiptFooter}"
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 pb-2">
                    <Button 
                      variant="outline"
                      className="gap-2 rounded-xl h-11 font-black uppercase text-[10px] tracking-widest border hover:bg-muted/50"
                      onClick={handlePrint}
                    >
                      <Printer className="h-5 w-5" /> Print
                    </Button>
                    <Button 
                      variant="outline"
                      className="gap-2 rounded-xl h-11 font-black uppercase text-[10px] tracking-widest border hover:bg-muted/50"
                      onClick={handleDownloadPDF}
                      disabled={downloading}
                    >
                      <Download className="h-5 w-5" /> PDF
                    </Button>
                    <Button 
                      className="col-span-2 gap-2 rounded-xl h-11 font-black uppercase text-[10px] tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                      onClick={handleWhatsAppText}
                    >
                      <MessageCircle className="h-5 w-5" /> Send to WhatsApp
                    </Button>
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
          {storePhone && <p className="text-[10px]">TEL: {storePhone}</p>}
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
                <span>AMOUNT PAID:</span>
                <span>{fmtNgn(sale.amountPaidNgn)}</span>
              </div>
              {outstanding > 0 ? (
                <>
                  <div className="flex justify-between font-black">
                    <span>BALANCE DUE (DEBT):</span>
                    <span>{fmtNgn(outstanding)}</span>
                  </div>
                  <p className="text-[9px] italic text-center mt-1">** PARTIAL PAYMENT — Balance outstanding **</p>
                </>
              ) : (sale as any).creditAddedNgn > 0 ? (
                <div className="flex justify-between font-black text-emerald-600">
                  <span>STORE CREDIT ADDED:</span>
                  <span>{fmtNgn((sale as any).creditAddedNgn)}</span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span>CHANGE:</span>
                  <span>{fmtNgn(sale.changeGivenNgn || 0)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {debtInfo && (
          <div className="border-t border-black border-dashed pt-2 mt-2 space-y-1 text-[10px]">
            <p className="font-black uppercase">DEBT &amp; PAYMENTS</p>
            <div className="flex justify-between">
              <span>BALANCE REMAINING (THIS SALE):</span>
              <span className="font-bold">{fmtNgn(debtInfo.remainingThisSale)}</span>
            </div>
            {debtInfo.payments.length > 0 ? (
              <div className="px-1 space-y-0.5">
                <span className="font-bold">PAYMENTS RECEIVED:</span>
                {debtInfo.payments.map((p) => (
                  <div key={p.id} className="flex justify-between">
                    <span>{fmtNgn(p.amountNgn)}{p.paymentMethod ? ` (${p.paymentMethod})` : ""}</span>
                    <span>{format(ensureDate(p.createdAt), "dd MMM yyyy, HH:mm")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="italic">NO DEBT PAYMENTS RECORDED YET</p>
            )}
            <div className="flex justify-between font-black">
              <span>TOTAL DEBT ACROSS ALL SALES:</span>
              <span>{fmtNgn(debtInfo.totalOutstanding)}</span>
            </div>
          </div>
        )}

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
