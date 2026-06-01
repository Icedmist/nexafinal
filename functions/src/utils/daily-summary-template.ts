import { getBaseEmailTemplate } from "./email-template";

export interface DailySummaryData {
  storeName: string;
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  topSellingItems: { name: string; qty: number; revenue: number }[];
  salesByPaymentMethod: Record<string, { count: number; total: number }>;
  totalRefunds: number;
  refundAmount: number;
  newCustomers: number;
  staffSalesLeader: { name: string; sales: number; revenue: number } | null;
  lowStockItems: { name: string; qty: number }[];
  activityHighlights: string[];
}

const NAIRA = "₦";
const fmt = (n: number) => `${NAIRA}${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

export const getDailySummaryEmailTemplate = (data: DailySummaryData) => {
  // Build the KPI cards row
  const kpiHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td style="padding: 8px;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 0.05em;">Total Sales</div>
            <div style="font-size: 28px; font-weight: 800; color: #166534; margin-top: 4px;">${data.totalSales}</div>
            <div style="font-size: 13px; font-weight: 600; color: #16a34a;">${fmt(data.totalRevenue)}</div>
          </div>
        </td>
        <td style="padding: 8px;">
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.05em;">Expenses</div>
            <div style="font-size: 28px; font-weight: 800; color: #991b1b; margin-top: 4px;">${fmt(data.totalExpenses)}</div>
          </div>
        </td>
        <td style="padding: 8px;">
          <div style="background: ${data.netProfit >= 0 ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${data.netProfit >= 0 ? '#bbf7d0' : '#fecaca'}; border-radius: 12px; padding: 20px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: ${data.netProfit >= 0 ? '#15803d' : '#b91c1c'}; text-transform: uppercase; letter-spacing: 0.05em;">Net Profit</div>
            <div style="font-size: 28px; font-weight: 800; color: ${data.netProfit >= 0 ? '#166534' : '#991b1b'}; margin-top: 4px;">${fmt(data.netProfit)}</div>
          </div>
        </td>
      </tr>
    </table>
  `;

  // Top selling items table
  const topItemsHtml = data.topSellingItems.length > 0 ? `
    <div style="margin: 24px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">🏆 Top Selling Items</div>
      <table class="receipt-table">
        <thead>
          <tr>
            <th>Product</th>
            <th style="text-align: center;">Qty Sold</th>
            <th style="text-align: right;">Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${data.topSellingItems.slice(0, 5).map((item, i) => `
            <tr>
              <td>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•'} ${item.name}</td>
              <td style="text-align: center;">${item.qty}</td>
              <td style="text-align: right;">${fmt(item.revenue)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  // Payment methods breakdown
  const paymentEntries = Object.entries(data.salesByPaymentMethod);
  const paymentHtml = paymentEntries.length > 0 ? `
    <div style="margin: 24px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">💳 Payment Breakdown</div>
      <table class="receipt-table">
        <thead>
          <tr>
            <th>Method</th>
            <th style="text-align: center;">Transactions</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${paymentEntries.map(([method, info]) => `
            <tr>
              <td style="text-transform: capitalize;">${method}</td>
              <td style="text-align: center;">${info.count}</td>
              <td style="text-align: right;">${fmt(info.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  // Staff leader
  const staffHtml = data.staffSalesLeader ? `
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin: 24px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.05em;">⭐ Staff Sales Leader</div>
      <div style="font-size: 18px; font-weight: 800; color: #1e3a8a; margin-top: 8px;">${data.staffSalesLeader.name}</div>
      <div style="font-size: 13px; color: #3b82f6; margin-top: 4px;">${data.staffSalesLeader.sales} sales &bull; ${fmt(data.staffSalesLeader.revenue)} revenue</div>
    </div>
  ` : '';

  // Low stock alerts
  const lowStockHtml = data.lowStockItems.length > 0 ? `
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 24px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.05em;">⚠️ Low Stock Alerts (${data.lowStockItems.length} items)</div>
      <div style="margin-top: 8px; font-size: 14px; color: #78350f;">
        ${data.lowStockItems.slice(0, 8).map(item => `<span style="display: inline-block; background: #fef3c7; border-radius: 6px; padding: 4px 10px; margin: 2px 4px; font-size: 12px; font-weight: 600;">${item.name} (${item.qty} left)</span>`).join('')}
      </div>
    </div>
  ` : '';

  // Refunds
  const refundsHtml = data.totalRefunds > 0 ? `
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 24px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.05em;">↩️ Refunds Today</div>
      <div style="font-size: 16px; font-weight: 700; color: #991b1b; margin-top: 8px;">${data.totalRefunds} refund${data.totalRefunds > 1 ? 's' : ''} &bull; ${fmt(data.refundAmount)}</div>
    </div>
  ` : '';

  // Combine all custom HTML
  const combinedHtml = kpiHtml + topItemsHtml + paymentHtml + staffHtml + refundsHtml + lowStockHtml;

  return getBaseEmailTemplate({
    title: `Daily Activity Summary — ${data.date}`,
    message: `Here's your end-of-day report for <strong>${data.storeName}</strong>.`,
    type: "report",
    metadata: {
      "Shop Name": data.storeName,
      "Report Date": data.date,
      "Total Transactions": String(data.totalSales),
      "New Customers": String(data.newCustomers),
    },
    htmlContent: combinedHtml,
    footerText: "This is an automated daily summary from Nexa Store OS. You can manage notification preferences in Settings.",
    actionUrl: "https://nexastoreos.com/app/dashboard",
    actionLabel: "Open Dashboard",
  });
};
