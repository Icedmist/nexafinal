"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportEmailTemplate = exports.getAlertEmailTemplate = exports.getReceiptEmailTemplate = exports.getBaseEmailTemplate = void 0;
const typeColors = {
    security: "#2563eb",
    info: "#16a34a", // Native Green
    alert: "#dc2626",
    success: "#16a34a", // Native Green
    receipt: "#16a34a", // Native Green
    report: "#16a34a", // Native Green
};
const getBaseEmailTemplate = (options) => {
    const { title, message, actionUrl, actionLabel, footerText, type = "info", metadata, htmlContent } = options;
    const accentColor = typeColors[type] || typeColors.info;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      -webkit-font-smoothing: antialiased;
    }
    
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f9fafb;
      padding: 40px 0;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    .header {
      padding: 32px;
      text-align: center;
      background-color: #ffffff;
      border-bottom: 1px solid #f3f4f6;
    }
    
    .content {
      padding: 40px;
    }
    
    h1 {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
      margin: 0 0 16px;
      color: #111827;
    }
    
    .message {
      font-size: 16px;
      line-height: 1.6;
      color: #4b5563;
      margin: 0 0 32px;
    }
    
    .metadata-box {
      background: #f9fafb;
      border-radius: 12px;
      padding: 24px;
      border: 1px solid #f3f4f6;
      margin-bottom: 32px;
    }

    .metadata-row {
      margin-bottom: 12px;
    }

    .metadata-row:last-child {
      margin-bottom: 0;
    }

    .metadata-key {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
      display: block;
    }

    .metadata-val {
      font-size: 15px;
      font-weight: 500;
      color: #111827;
    }
    
    .button-container {
      margin: 32px 0 0;
      text-align: center;
    }
    
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: ${accentColor};
      color: #ffffff !important;
      text-decoration: none !important;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      text-align: center;
    }
    
    .footer {
      padding: 32px;
      background-color: #f9fafb;
      border-top: 1px solid #f3f4f6;
      text-align: center;
    }
    
    .footer-text {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.5;
      margin: 0;
    }
    
    /* Table styles */
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
    }
    .receipt-table th {
      text-align: left;
      font-size: 12px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      border-bottom: 2px solid #f3f4f6;
      padding: 12px 8px;
    }
    .receipt-table td {
      padding: 12px 8px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
      color: #374151;
    }
    .receipt-table .total-row td {
      border-top: 2px solid #f3f4f6;
      border-bottom: none;
      font-weight: 700;
      font-size: 16px;
      color: #111827;
      padding-top: 20px;
    }

    @media only screen and (max-width: 640px) {
      .wrapper {
        padding: 0;
      }
      .container {
        border-radius: 0;
        border: none;
      }
      .content {
        padding: 32px 24px;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div style="font-size: 20px; font-weight: 800; color: ${accentColor}; letter-spacing: -0.02em;">
          ${options.metadata?.["Shop Name"] || "RECEIPT"}
        </div>
      </div>
      
      <div class="content">
        <h1>${title}</h1>
        
        <div class="message">${message.replace(/\n/g, "<br>")}</div>
        
        ${htmlContent || ""}

        ${metadata ? `
        <div class="metadata-box">
          ${Object.entries(metadata).map(([key, value]) => {
        if (key === "Shop Name")
            return ""; // Already in header
        return `
            <div class="metadata-row">
              <span class="metadata-key">${key}</span>
              <span class="metadata-val">${value}</span>
            </div>
            `;
    }).join('')}
        </div>
        ` : ''}

        ${actionUrl && actionLabel ? `
        <div class="button-container">
          <a href="${actionUrl}" class="button">${actionLabel}</a>
        </div>
        ` : ''}
      </div>
      
      <div class="footer">
        <p class="footer-text">${footerText || "Thank you for your business! We hope to see you again soon."}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};
exports.getBaseEmailTemplate = getBaseEmailTemplate;
const getReceiptEmailTemplate = (sale, store) => {
    const items = sale.items || [];
    const total = sale.totalNgn || 0;
    const itemsHtml = `
    <table class="receipt-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item) => `
          <tr>
            <td>${item.itemName}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">₦${item.unitPriceNgn.toLocaleString()}</td>
            <td style="text-align: right;">₦${(item.quantity * item.unitPriceNgn).toLocaleString()}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="2"></td>
          <td style="text-align: right;">TOTAL</td>
          <td style="text-align: right;">₦${total.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  `;
    return (0, exports.getBaseEmailTemplate)({
        title: "Sale Receipt",
        message: `Hi ${sale.customerName || "Customer"},\nThank you for shopping at <strong>${store.name}</strong>. Here is the summary of your purchase.`,
        type: "receipt",
        metadata: {
            "Shop Name": store.name,
            "Store Contact": store.storeDetails?.phone || "N/A",
            "Customer": sale.customerName || "Walk-in",
            "Customer Email": sale.customerEmail || "N/A",
            "Date & Time": new Date(sale.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }),
            "Cashier": sale.recordedByName || "Staff",
            "Payment Status": sale.isCreditSale ? "Outstanding (Credit Sale)" : "Paid",
        },
        htmlContent: itemsHtml,
        footerText: "We value your patronage. Have a wonderful day!"
    });
};
exports.getReceiptEmailTemplate = getReceiptEmailTemplate;
const getAlertEmailTemplate = (alert) => {
    const severityToType = {
        critical: "alert",
        high: "alert",
        medium: "info",
    };
    return (0, exports.getBaseEmailTemplate)({
        title: alert.title,
        message: alert.details,
        type: severityToType[alert.severity] || "info",
        metadata: {
            "Severity": alert.severity.toUpperCase(),
            "Performed By": alert.performedBy || "System",
            "Timestamp": new Date().toLocaleString(),
        },
        actionUrl: alert.actionUrl,
        actionLabel: alert.actionLabel || "View in Dashboard",
    });
};
exports.getAlertEmailTemplate = getAlertEmailTemplate;
const getReportEmailTemplate = (report) => {
    return (0, exports.getBaseEmailTemplate)({
        title: report.title,
        message: report.summary,
        type: "report",
        metadata: {
            "Reporting Period": report.period,
            "Generated At": new Date().toLocaleString(),
            "Status": "Verified"
        },
        actionUrl: "https://nexa-os.com/analytics",
        actionLabel: "Open Full Analytics"
    });
};
exports.getReportEmailTemplate = getReportEmailTemplate;
//# sourceMappingURL=email-template.js.map