import { format } from "date-fns";
import type { SaleTransaction, DebtPayment } from "@/types/inventory";

const NAIRA = "₦";

function fmtNgn(amount: number): string {
  return `${NAIRA}${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

// 1. SALES HISTORY REPORT GENERATOR
export async function exportSalesHistoryPDF(
  sales: SaleTransaction[],
  storeName: string,
  filterDescription: string = "All Records"
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header Theme Color - Premium Nexa Dark (Slate/Indigo mix)
  const headerColor = [22, 28, 45]; // HSL Tailored Dark Slate

  // DRAW BRANDED TITLE BANNER
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.rect(0, 0, pageW, 40, "F");

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), margin, 18);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(190, 200, 220);
  doc.text(`SALES TRANSACTION LOG REPORT  |  ${filterDescription.toUpperCase()}`, margin, 26);
  doc.text(`Generated on ${format(new Date(), "dd MMM yyyy, HH:mm")}`, margin, 32);

  // METRICS WIDGET BOXES
  const totalRev = sales.reduce((sum, s) => sum + s.totalNgn, 0);
  const totalQty = sales.reduce((sum, s) => sum + s.items.reduce((a, li) => a + li.quantity, 0), 0);
  
  // Widget border/bg
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(220, 225, 230);
  doc.roundedRect(margin, 48, pageW - 2 * margin, 20, 3, 3, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 120);
  doc.text("TOTAL REVENUE", margin + 10, 56);
  doc.text("TRANSACTIONS", margin + 70, 56);
  doc.text("ITEMS SOLD", margin + 130, 56);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(fmtNgn(totalRev), margin + 10, 62);
  doc.text(String(sales.length), margin + 70, 62);
  doc.text(String(totalQty), margin + 130, 62);

  // TABLE HEADERS
  let currentY = 82;
  const colWidths = [35, 30, 45, 35, 35]; // Date, ID, Customer, Payment, Amount
  const headers = ["DATE & TIME", "TRANSACTION ID", "CUSTOMER", "PAYMENT TYPE", "TOTAL AMOUNT"];

  doc.setFillColor(22, 28, 45);
  doc.rect(margin, currentY, pageW - 2 * margin, 8, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  
  let currentX = margin;
  headers.forEach((h, idx) => {
    // right align the last column
    if (idx === headers.length - 1) {
      doc.text(h, pageW - margin - 5, currentY + 5.5, { align: "right" });
    } else {
      doc.text(h, currentX + 4, currentY + 5.5);
    }
    currentX += colWidths[idx];
  });

  // TABLE ROWS
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  
  sales.forEach((sale, index) => {
    currentY += 8.5;
    
    // Add page if near bottom
    if (currentY > pageH - 20) {
      doc.addPage();
      currentY = 20;

      // Repeat header on new page
      doc.setFillColor(22, 28, 45);
      doc.rect(margin, currentY, pageW - 2 * margin, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      
      let newX = margin;
      headers.forEach((h, idx) => {
        if (idx === headers.length - 1) {
          doc.text(h, pageW - margin - 5, currentY + 5.5, { align: "right" });
        } else {
          doc.text(h, newX + 4, currentY + 5.5);
        }
        newX += colWidths[idx];
      });
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      currentY += 8.5;
    }

    // Alternating background colors
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, currentY - 1.5, pageW - 2 * margin, 8.5, "F");
    }

    // Row borders
    doc.setDrawColor(240, 242, 245);
    doc.line(margin, currentY + 7, pageW - margin, currentY + 7);

    // Data cells
    doc.setTextColor(15, 23, 42);
    const dateStr = format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm");
    const saleId = `#${sale.id.slice(-8).toUpperCase()}`;
    const customer = sale.customerName || "Walk-in Customer";
    const payment = sale.isCreditSale ? "Debit" : ((sale as any).paymentMethod || "Cash").toUpperCase();
    const totalVal = fmtNgn(sale.totalNgn);

    doc.text(dateStr, margin + 4, currentY + 4);
    doc.text(saleId, margin + colWidths[0] + 4, currentY + 4);
    doc.text(customer.slice(0, 22), margin + colWidths[0] + colWidths[1] + 4, currentY + 4);
    doc.text(payment, margin + colWidths[0] + colWidths[1] + colWidths[2] + 4, currentY + 4);
    
    doc.setFont("Helvetica", "bold");
    doc.text(totalVal, pageW - margin - 5, currentY + 4, { align: "right" });
    doc.setFont("Helvetica", "normal");
  });

  // Footer branding
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 155, 160);
    doc.text(`Nexa Store OS  |  Secure Cloud POS  |  Page ${i} of ${totalPages}`, pageW / 2, pageH - 8, { align: "center" });
  }

  doc.save(`sales-history-${new Date().getTime()}.pdf`);
}

// 2. CUSTOMER DIRECTORY PDF REPORT
interface CustomerReportRecord {
  name: string;
  phone: string;
  totalSpent: number;
  transactionCount: number;
  lastPurchase: string;
}

export async function exportCustomersPDF(customers: CustomerReportRecord[], storeName: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header Banner
  doc.setFillColor(22, 28, 45);
  doc.rect(0, 0, pageW, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), margin, 18);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(190, 200, 220);
  doc.text(`SAVED CUSTOMERS LEDGER DIRECTORY`, margin, 26);
  doc.text(`Generated on ${format(new Date(), "dd MMM yyyy, HH:mm")}`, margin, 32);

  // Widget Cards
  const totalCustomers = customers.length;
  const totalSpentAll = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(220, 225, 230);
  doc.roundedRect(margin, 48, pageW - 2 * margin, 20, 3, 3, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 120);
  doc.text("TOTAL DIRECTORY COUNT", margin + 15, 56);
  doc.text("AGGREGATED CUSTOMER VALUATION", margin + 105, 56);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalCustomers} Active Customers`, margin + 15, 62);
  doc.text(fmtNgn(totalSpentAll), margin + 105, 62);

  // Headers
  let currentY = 82;
  const colWidths = [60, 40, 40, 40]; // Name, Phone, Orders, Total Spent
  const headers = ["CUSTOMER NAME", "PHONE NUMBER", "SALES RECORDED", "TOTAL VALUE SPENT"];

  doc.setFillColor(22, 28, 45);
  doc.rect(margin, currentY, pageW - 2 * margin, 8, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  let currentX = margin;
  headers.forEach((h, idx) => {
    if (idx === headers.length - 1) {
      doc.text(h, pageW - margin - 5, currentY + 5.5, { align: "right" });
    } else {
      doc.text(h, currentX + 4, currentY + 5.5);
    }
    currentX += colWidths[idx];
  });

  // Table Body
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);

  customers.forEach((c, index) => {
    currentY += 8.5;

    if (currentY > pageH - 20) {
      doc.addPage();
      currentY = 20;

      doc.setFillColor(22, 28, 45);
      doc.rect(margin, currentY, pageW - 2 * margin, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(255, 255, 255);

      let newX = margin;
      headers.forEach((h, idx) => {
        if (idx === headers.length - 1) {
          doc.text(h, pageW - margin - 5, currentY + 5.5, { align: "right" });
        } else {
          doc.text(h, newX + 4, currentY + 5.5);
        }
        newX += colWidths[idx];
      });
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      currentY += 8.5;
    }

    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, currentY - 1.5, pageW - 2 * margin, 8.5, "F");
    }

    doc.setDrawColor(240, 242, 245);
    doc.line(margin, currentY + 7, pageW - margin, currentY + 7);

    doc.setTextColor(15, 23, 42);
    doc.text(c.name, margin + 4, currentY + 4);
    doc.text(c.phone, margin + colWidths[0] + 4, currentY + 4);
    doc.text(`${c.transactionCount} order${c.transactionCount > 1 ? "s" : ""}`, margin + colWidths[0] + colWidths[1] + 4, currentY + 4);
    
    doc.setFont("Helvetica", "bold");
    doc.text(fmtNgn(c.totalSpent), pageW - margin - 5, currentY + 4, { align: "right" });
    doc.setFont("Helvetica", "normal");
  });

  // Footer branding
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 155, 160);
    doc.text(`Nexa Store OS  |  Customer Directory Ledger  |  Page ${i} of ${totalPages}`, pageW / 2, pageH - 8, { align: "center" });
  }

  doc.save(`customer-directory-${new Date().getTime()}.pdf`);
}

// 3. STAFF PERFORMANCE PDF REPORT
interface StaffPerformanceRecord {
  uid: string;
  name: string;
  email: string;
  role: string;
  branchName: string;
  totalSales: number;
  transactionCount: number;
  avgTransaction: number;
}

export async function exportStaffPerformancePDF(metrics: StaffPerformanceRecord[], storeName: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header Banner
  doc.setFillColor(22, 28, 45);
  doc.rect(0, 0, pageW, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), margin, 18);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(190, 200, 220);
  doc.text(`STAFF SALES PERFORMANCE LEADERBOARD REPORT`, margin, 26);
  doc.text(`Generated on ${format(new Date(), "dd MMM yyyy, HH:mm")}`, margin, 32);

  // Widget Cards
  const topPerformer = metrics[0]?.name || "N/A";
  const totalRevenue = metrics.reduce((sum, s) => sum + s.totalSales, 0);

  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(220, 225, 230);
  doc.roundedRect(margin, 48, pageW - 2 * margin, 20, 3, 3, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 120);
  doc.text("TOTAL COLLECTIVE STAFF REVENUE", margin + 15, 56);
  doc.text("TOP OUTSTANDING PERFORMER", margin + 105, 56);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(fmtNgn(totalRevenue), margin + 15, 62);
  doc.text(topPerformer, margin + 105, 62);

  // Headers
  let currentY = 82;
  const colWidths = [45, 35, 30, 30, 40]; // Name, Role, Branch, Sales Count, Avg Ticket, Total Sales
  const headers = ["STAFF NAME", "USER ROLE", "ASSIGNED BRANCH", "SALES", "AVG TRANSACTION", "TOTAL REVENUE"];

  doc.setFillColor(22, 28, 45);
  doc.rect(margin, currentY, pageW - 2 * margin, 8, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  let currentX = margin;
  headers.forEach((h, idx) => {
    if (idx === headers.length - 1) {
      doc.text(h, pageW - margin - 5, currentY + 5.5, { align: "right" });
    } else {
      doc.text(h, currentX + 4, currentY + 5.5);
    }
    currentX += colWidths[idx];
  });

  // Table Body
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);

  metrics.forEach((m, index) => {
    currentY += 8.5;

    if (currentY > pageH - 20) {
      doc.addPage();
      currentY = 20;

      doc.setFillColor(22, 28, 45);
      doc.rect(margin, currentY, pageW - 2 * margin, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(255, 255, 255);

      let newX = margin;
      headers.forEach((h, idx) => {
        if (idx === headers.length - 1) {
          doc.text(h, pageW - margin - 5, currentY + 5.5, { align: "right" });
        } else {
          doc.text(h, newX + 4, currentY + 5.5);
        }
        newX += colWidths[idx];
      });
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      currentY += 8.5;
    }

    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, currentY - 1.5, pageW - 2 * margin, 8.5, "F");
    }

    doc.setDrawColor(240, 242, 245);
    doc.line(margin, currentY + 7, pageW - margin, currentY + 7);

    doc.setTextColor(15, 23, 42);
    doc.text(m.name, margin + 4, currentY + 4);
    doc.text(m.role.toUpperCase(), margin + colWidths[0] + 4, currentY + 4);
    doc.text(m.branchName, margin + colWidths[0] + colWidths[1] + 4, currentY + 4);
    doc.text(String(m.transactionCount), margin + colWidths[0] + colWidths[1] + colWidths[2] + 4, currentY + 4);
    doc.text(fmtNgn(m.avgTransaction), margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 4, currentY + 4);
    
    doc.setFont("Helvetica", "bold");
    doc.text(fmtNgn(m.totalSales), pageW - margin - 5, currentY + 4, { align: "right" });
    doc.setFont("Helvetica", "normal");
  });

  // Footer branding
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 155, 160);
    doc.text(`Nexa Store OS  |  Staff Roster Performance Analytics  |  Page ${i} of ${totalPages}`, pageW / 2, pageH - 8, { align: "center" });
  }

  doc.save(`staff-performance-${new Date().getTime()}.pdf`);
}

// 4. DEBT CLEARING HISTORY REPORT GENERATOR
export async function exportDebtHistoryPDF(
  payments: DebtPayment[],
  storeName: string,
  filterDescription: string = "All Records"
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header Theme Color - Premium Nexa Dark (Slate/Indigo mix)
  const headerColor = [22, 28, 45]; // HSL Tailored Dark Slate

  // DRAW BRANDED TITLE BANNER
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.rect(0, 0, pageW, 40, "F");

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), margin, 18);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(190, 200, 220);
  doc.text(`DEBT CLEARING HISTORY REPORT  |  ${filterDescription.toUpperCase()}`, margin, 26);
  doc.text(`Generated on ${format(new Date(), "dd MMM yyyy, HH:mm")}`, margin, 32);

  // METRICS WIDGET BOXES
  const totalCleared = payments.reduce((sum, p) => sum + p.amountNgn, 0);
  const paymentCount = payments.length;
  const uniqueCustomers = new Set(payments.map(p => p.customerPhone?.trim())).size;

  // Widget border/bg
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(220, 225, 230);
  doc.roundedRect(margin, 48, pageW - 2 * margin, 20, 3, 3, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 120);
  doc.text("TOTAL DEBT CLEARED", margin + 15, 56);
  doc.text("TOTAL PAYMENTS LOGGED", margin + 75, 56);
  doc.text("ACTIVE PAYING CUSTOMERS", margin + 135, 56);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(fmtNgn(totalCleared), margin + 15, 62);
  doc.text(String(paymentCount), margin + 75, 62);
  doc.text(`${uniqueCustomers} Customers`, margin + 135, 62);

  // TABLE HEADERS
  let currentY = 82;
  const colWidths = [35, 45, 35, 35, 30]; // Date, Customer, Staff, Notes, Amount
  const headers = ["DATE & TIME", "CUSTOMER NAME", "RECORDED BY", "NOTES / REMARKS", "AMOUNT CLEARED"];

  doc.setFillColor(22, 28, 45);
  doc.rect(margin, currentY, pageW - 2 * margin, 8, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  let currentX = margin;
  headers.forEach((h, idx) => {
    // right align the last column
    if (idx === headers.length - 1) {
      doc.text(h, pageW - margin - 5, currentY + 5.5, { align: "right" });
    } else {
      doc.text(h, currentX + 4, currentY + 5.5);
    }
    currentX += colWidths[idx];
  });

  // TABLE ROWS
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);

  payments.forEach((payment, index) => {
    currentY += 8.5;

    // Add page if near bottom
    if (currentY > pageH - 20) {
      doc.addPage();
      currentY = 20;

      // Repeat header on new page
      doc.setFillColor(22, 28, 45);
      doc.rect(margin, currentY, pageW - 2 * margin, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(255, 255, 255);

      let newX = margin;
      headers.forEach((h, idx) => {
        if (idx === headers.length - 1) {
          doc.text(h, pageW - margin - 5, currentY + 5.5, { align: "right" });
        } else {
          doc.text(h, newX + 4, currentY + 5.5);
        }
        newX += colWidths[idx];
      });
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      currentY += 8.5;
    }

    // Alternating background colors
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, currentY - 1.5, pageW - 2 * margin, 8.5, "F");
    }

    // Row borders
    doc.setDrawColor(240, 242, 245);
    doc.line(margin, currentY + 7, pageW - margin, currentY + 7);

    // Data cells
    doc.setTextColor(15, 23, 42);
    const dateStr = format(new Date(payment.createdAt), "dd MMM yyyy, HH:mm");
    const customer = `${payment.customerName || "Customer"}${payment.customerPhone ? ` (${payment.customerPhone})` : ""}`;
    const staff = payment.recordedByName || "Staff";
    const notes = payment.notes || "—";
    const amountVal = fmtNgn(payment.amountNgn);

    doc.text(dateStr, margin + 4, currentY + 4);
    doc.text(customer.slice(0, 25), margin + colWidths[0] + 4, currentY + 4);
    doc.text(staff.slice(0, 18), margin + colWidths[0] + colWidths[1] + 4, currentY + 4);
    doc.text(notes.slice(0, 18), margin + colWidths[0] + colWidths[1] + colWidths[2] + 4, currentY + 4);

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(34, 197, 94); // Green 500
    doc.text(amountVal, pageW - margin - 5, currentY + 4, { align: "right" });
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(15, 23, 42);
  });

  // Footer branding
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 155, 160);
    doc.text(`Nexa Store OS  |  Debt Clearing Ledger  |  Page ${i} of ${totalPages}`, pageW / 2, pageH - 8, { align: "center" });
  }

  doc.save(`debt-clearing-history-${new Date().getTime()}.pdf`);
}

// 5. INDIVIDUAL CUSTOMER DEBT STATEMENT PDF REPORT
export interface DebtStatementEvent {
  type: "credit" | "payment";
  date: string;
  amount: number;
  reference?: string;
  notes?: string;
  recordedBy?: string;
  branchName?: string;
}

export interface DebtStatementRecord {
  name: string;
  phone: string;
  branchName?: string;
  totalCreditSales: number;
  totalPayments: number;
  currentBalance: number;
  events: DebtStatementEvent[];
}

export async function exportDebtStatementPDF(record: DebtStatementRecord, storeName: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header Banner
  doc.setFillColor(22, 28, 45);
  doc.rect(0, 0, pageW, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), margin, 18);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(190, 200, 220);
  doc.text(`CUSTOMER DEBT STATEMENT  |  ${record.name.toUpperCase()}`, margin, 26);
  doc.text(`Generated on ${format(new Date(), "dd MMM yyyy, HH:mm")}`, margin, 32);

  // Customer info strip
  doc.setFillColor(245, 246, 248);
  doc.roundedRect(margin, 46, pageW - 2 * margin, 14, 3, 3, "F");
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 70, 80);
  doc.text(`Customer: ${record.name || "—"}     Phone: ${record.phone || "—"}`, margin + 6, 54);

  if (record.branchName) {
    doc.setFontSize(8);
    doc.setTextColor(100, 110, 120);
    doc.text(`Branch: ${record.branchName}`, pageW / 2, 54);
    doc.setFontSize(9);
    doc.setTextColor(60, 70, 80);
  }

  // METRICS WIDGET BOXES
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(220, 225, 230);
  doc.roundedRect(margin, 68, pageW - 2 * margin, 20, 3, 3, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 120);
  doc.text("TOTAL CREDIT EXTENDED", margin + 12, 76);
  doc.text("TOTAL PAYMENTS RECEIVED", margin + 72, 76);
  doc.text("OUTSTANDING BALANCE", margin + 132, 76);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(fmtNgn(record.totalCreditSales), margin + 12, 82);
  doc.text(fmtNgn(record.totalPayments), margin + 72, 82);
  doc.setTextColor(record.currentBalance > 0 ? 220 : 34, record.currentBalance > 0 ? 38 : 197, record.currentBalance > 0 ? 38 : 94);
  doc.text(fmtNgn(record.currentBalance), margin + 132, 82);

  // SIMPLE ACTIVITY LIST — plain-language lines instead of a dense table
  let currentY = 102;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(60, 70, 80);
  doc.text("DEBT ACTIVITY", margin, currentY);
  doc.setFont("Helvetica", "normal");
  currentY += 6;

  doc.setDrawColor(240, 242, 245);
  doc.line(margin, currentY, pageW - margin, currentY);
  currentY += 6;

  const chronological = [...record.events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  chronological.forEach((evt) => {
    const dateStr = format(new Date(evt.date), "dd MMM yyyy");
    const phrase = evt.type === "credit"
      ? `Bought items worth ${fmtNgn(evt.amount)}`
      : `Paid ${fmtNgn(evt.amount)}`;
    const byLine = evt.branchName || evt.recordedBy
      ? `  (${[evt.branchName, evt.recordedBy && `by ${evt.recordedBy}`].filter(Boolean).join(" · ")})`
      : "";

    if (currentY > pageH - 55) {
      doc.addPage();
      currentY = 25;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont("Helvetica", "bold");
    doc.text(phrase, margin, currentY);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 110, 120);
    doc.text(`${dateStr}${byLine}`, pageW - margin, currentY, { align: "right" });

    currentY += 5;
    doc.setDrawColor(240, 242, 245);
    doc.line(margin, currentY, pageW - margin, currentY);
    currentY += 7;
  });

  // FINAL BALANCE SUMMARY
  if (currentY > pageH - 45) {
    doc.addPage();
    currentY = 25;
  }

  doc.setDrawColor(200, 205, 210);
  doc.line(margin, currentY, pageW - margin, currentY);
  currentY += 6;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total bought worth: ${fmtNgn(record.totalCreditSales)}`, margin, currentY);
  doc.text(`Total paid: ${fmtNgn(record.totalPayments)}`, pageW / 2, currentY);
  currentY += 7;
  doc.setTextColor(record.currentBalance > 0 ? 220 : 34, record.currentBalance > 0 ? 38 : 197, record.currentBalance > 0 ? 38 : 94);
  doc.text(`Total balance: ${fmtNgn(record.currentBalance)}`, margin, currentY);
  doc.setFont("Helvetica", "normal");

  // Footer branding
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 155, 160);
    doc.text(`Nexa Store OS  |  Customer Debt Statement  |  Page ${i} of ${totalPages}`, pageW / 2, pageH - 8, { align: "center" });
  }

  doc.save(`debt-statement-${record.name.replace(/\s+/g, "-").toLowerCase() || "customer"}-${new Date().getTime()}.pdf`);
}

// 6. ALL CUSTOMERS DEBTORS LEDGER PDF REPORT
export interface DebtorLedgerRecord {
  name: string;
  phone: string;
  branchName?: string;
  totalCreditSales: number;
  totalPayments: number;
  currentBalance: number;
}

export async function exportDebtorsLedgerPDF(records: DebtorLedgerRecord[], storeName: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header Banner
  doc.setFillColor(22, 28, 45);
  doc.rect(0, 0, pageW, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), margin, 18);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(190, 200, 220);
  doc.text(`DEBTORS LEDGER  |  ALL CUSTOMERS`, margin, 26);
  doc.text(`Generated on ${format(new Date(), "dd MMM yyyy, HH:mm")}`, margin, 32);

  // METRICS WIDGET BOXES
  const activeDebtors = records.filter((r) => r.currentBalance > 0).length;
  const outstanding = records.reduce((sum, r) => sum + r.currentBalance, 0);
  const totalCredit = records.reduce((sum, r) => sum + r.totalCreditSales, 0);

  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(220, 225, 230);
  doc.roundedRect(margin, 48, pageW - 2 * margin, 20, 3, 3, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 120);
  doc.text("TOTAL DEBTORS", margin + 12, 56);
  doc.text("TOTAL CREDIT EXTENDED", margin + 62, 56);
  doc.text("OUTSTANDING BALANCE", margin + 120, 56);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${records.length} Customers`, margin + 12, 62);
  doc.text(fmtNgn(totalCredit), margin + 62, 62);
  doc.setTextColor(220, 38, 38);
  doc.text(fmtNgn(outstanding), margin + 120, 62);
  doc.setTextColor(15, 23, 42);

  // TABLE HEADERS
  let currentY = 82;
  const tableLeft = margin;
  const tableRight = pageW - margin;
  // Column boundaries (left-aligned) for text cells
  const cLeft = tableLeft + 4;
  const cName = tableLeft + 60;
  const cPhone = tableLeft + 185;
  const rightCredit = tableRight - 0;
  const rightPaid = tableRight - 100;
  const rightBalance = tableRight - 210;
  const headers = ["BRANCH", "CUSTOMER NAME", "PHONE", "CREDIT EXTENDED", "PAYMENTS", "OUTSTANDING"];

  doc.setFillColor(22, 28, 45);
  doc.rect(tableLeft, currentY, tableRight - tableLeft, 8, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  doc.text(headers[0], cLeft, currentY + 5.5);
  doc.text(headers[1], cName, currentY + 5.5);
  doc.text(headers[2], cPhone, currentY + 5.5);
  doc.text(headers[3], rightCredit, currentY + 5.5, { align: "right" });
  doc.text(headers[4], rightPaid, currentY + 5.5, { align: "right" });
  doc.text(headers[5], rightBalance, currentY + 5.5, { align: "right" });

  // TABLE BODY
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);

  records.forEach((r, index) => {
    currentY += 8.5;

    if (currentY > pageH - 20) {
      doc.addPage();
      currentY = 22;
      doc.setFillColor(22, 28, 45);
      doc.rect(margin, currentY, tableRight - tableLeft, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(headers[0], cLeft, currentY + 5.5);
      doc.text(headers[1], cName, currentY + 5.5);
      doc.text(headers[2], cPhone, currentY + 5.5);
      doc.text(headers[3], rightCredit, currentY + 5.5, { align: "right" });
      doc.text(headers[4], rightPaid, currentY + 5.5, { align: "right" });
      doc.text(headers[5], rightBalance, currentY + 5.5, { align: "right" });
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      currentY += 8.5;
    }

    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, currentY - 1.5, tableRight - tableLeft, 8.5, "F");
    }

    doc.setDrawColor(240, 242, 245);
    doc.line(margin, currentY + 7, tableRight, currentY + 7);

    doc.setTextColor(15, 23, 42);
    doc.text((r.branchName || "—").slice(0, 11), cLeft, currentY + 4);
    doc.text(r.name.slice(0, 20), cName, currentY + 4);
    doc.text(r.phone || "—", cPhone, currentY + 4);

    doc.setFont("Helvetica", "bold");
    doc.text(fmtNgn(r.totalCreditSales), rightCredit, currentY + 4, { align: "right" });
    doc.text(fmtNgn(r.totalPayments), rightPaid, currentY + 4, { align: "right" });
    doc.setTextColor(r.currentBalance > 0 ? 220 : 34, r.currentBalance > 0 ? 38 : 197, r.currentBalance > 0 ? 38 : 94);
    doc.text(fmtNgn(r.currentBalance), rightBalance, currentY + 4, { align: "right" });
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(15, 23, 42);
  });

  // TOTAL ROW at the bottom of the ledger
  const totalPaid = records.reduce((sum, r) => sum + r.totalPayments, 0);
  currentY += 6;
  if (currentY > pageH - 22) {
    doc.addPage();
    currentY = 25;
  }
  doc.setFillColor(22, 28, 45);
  doc.rect(margin, currentY - 3.5, tableRight - tableLeft, 7, "F");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", cLeft, currentY);
  doc.text(fmtNgn(totalCredit), rightCredit, currentY + 2, { align: "right" });
  doc.text(fmtNgn(totalPaid), rightPaid, currentY + 2, { align: "right" });
  doc.text(fmtNgn(outstanding), rightBalance, currentY + 2, { align: "right" });

  // Footer branding
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 155, 160);
    doc.text(`Nexa Store OS  |  Debtors Ledger  |  Page ${i} of ${totalPages}`, pageW / 2, pageH - 8, { align: "center" });
  }

  doc.save(`debtors-ledger-${new Date().getTime()}.pdf`);
}
