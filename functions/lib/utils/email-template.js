"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportEmailTemplate = exports.getAlertEmailTemplate = exports.getReceiptEmailTemplate = exports.getBaseEmailTemplate = void 0;
const typeColors = {
    security: "#3b82f6",
    info: "#6366f1",
    alert: "#f43f5e",
    success: "#10b981",
    receipt: "#f59e0b",
    report: "#8b5cf6",
};
const getBaseEmailTemplate = (options) => {
    const { title, message, actionUrl, actionLabel, footerText, type = "info", metadata } = options;
    const accentColor = typeColors[type] || typeColors.info;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: #020617;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f8fafc;
      -webkit-font-smoothing: antialiased;
    }
    
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #020617;
      padding: 40px 0;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #0f172a;
      background-image: linear-gradient(145deg, #0f172a 0%, #020617 100%);
      border-radius: 32px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.5);
    }
    
    .header {
      padding: 48px 48px 32px;
      text-align: center;
      background: radial-gradient(circle at top center, ${accentColor}15 0%, transparent 70%);
    }
    
    .logo-container {
      display: inline-block;
      margin-bottom: 24px;
    }

    .logo {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0.3em;
      color: #ffffff;
      text-transform: uppercase;
      background: linear-gradient(to right, ${accentColor}, #ffffff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .content {
      padding: 0 48px 48px;
    }
    
    .type-badge {
      display: inline-block;
      padding: 6px 14px;
      background: ${accentColor}15;
      border: 1px solid ${accentColor}40;
      border-radius: 100px;
      font-size: 10px;
      font-weight: 800;
      color: ${accentColor};
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-bottom: 24px;
    }
    
    h1 {
      font-size: 32px;
      font-weight: 800;
      line-height: 1.2;
      margin: 0 0 24px;
      color: #ffffff;
      letter-spacing: -0.04em;
    }
    
    .message {
      font-size: 16px;
      line-height: 1.8;
      color: #cbd5e1;
      margin: 0 0 32px;
    }
    
    .button-container {
      margin: 40px 0;
      text-align: center;
    }
    
    .button {
      display: inline-block;
      padding: 20px 40px;
      background: ${accentColor};
      background: linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%);
      color: #ffffff !important;
      text-decoration: none !important;
      border-radius: 20px;
      font-size: 15px;
      font-weight: 800;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      box-shadow: 0 20px 40px -10px ${accentColor}60;
    }
    
    .metadata-grid {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 24px;
      padding: 32px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      margin: 32px 0;
    }

    .metadata-item {
      margin-bottom: 20px;
    }

    .metadata-label {
      font-size: 10px;
      font-weight: 800;
      color: ${accentColor};
      text-transform: uppercase;
      letter-spacing: 0.2em;
      margin-bottom: 6px;
      display: block;
    }

    .metadata-value {
      font-size: 15px;
      font-weight: 600;
      color: #f8fafc;
    }
    
    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent);
      margin: 48px 0;
    }
    
    .info-card {
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
      border-radius: 24px;
      padding: 32px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      text-align: center;
    }

    .info-card-text {
      font-size: 13px;
      line-height: 1.7;
      color: #94a3b8;
      margin: 0;
    }
    
    .footer {
      padding: 48px;
      background: rgba(0, 0, 0, 0.3);
      text-align: center;
    }
    
    .footer-text {
      font-size: 12px;
      font-weight: 500;
      color: #475569;
      line-height: 1.8;
      margin: 0;
    }
    
    .footer-links {
      margin-top: 32px;
    }
    
    .footer-links a {
      color: #64748b;
      text-decoration: none;
      margin: 0 16px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }

    .copyright {
      margin-top: 40px;
      font-size: 10px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.3em;
    }

    @media only screen and (max-width: 640px) {
      .container {
        border-radius: 0;
      }
      .header, .content, .footer {
        padding: 40px 24px;
      }
      h1 {
        font-size: 28px;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container">
          <span class="logo">NEXA OS</span>
        </div>
      </div>
      
      <div class="content">
        <div class="type-badge">${type.toUpperCase()} VERIFIED</div>
        <h1>${title}</h1>
        <div class="message">${message.replace(/\n/g, "<br>")}</div>
        
        ${metadata ? `
        <div class="metadata-grid">
          ${Object.entries(metadata).map(([key, value]) => `
            <div class="metadata-item">
              <span class="metadata-label">${key}</span>
              <span class="metadata-value">${value}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${actionUrl && actionLabel ? `
        <div class="button-container">
          <a href="${actionUrl}" class="button">${actionLabel}</a>
        </div>
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="info-card">
          <p class="info-card-text">
            This secure dispatch was generated by Nexa OS Core. 
            Transmissions are encrypted and logged for compliance.
          </p>
        </div>
      </div>
      
      <div class="footer">
        <p class="footer-text">${footerText || "Autonomous Enterprise Infrastructure & Commerce Intelligence"}</p>
        <div class="footer-links">
          <a href="#">Network Status</a>
          <a href="#">Security Protocol</a>
          <a href="#">Privacy Engine</a>
        </div>
        <div class="copyright">
          &copy; ${new Date().getFullYear()} NEXA OS CORE &bull; GLOBAL OPERATIONS
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};
exports.getBaseEmailTemplate = getBaseEmailTemplate;
const getReceiptEmailTemplate = (order, store) => {
    const items = order.items || [];
    const total = order.total || 0;
    return (0, exports.getBaseEmailTemplate)({
        title: `Receipt from ${store.name}`,
        message: `Thank you for your purchase at ${store.name}. Your order has been processed successfully.`,
        type: "receipt",
        metadata: {
            "Order ID": order.id,
            "Date": new Date(order.createdAt).toLocaleString(),
            "Total Amount": `$${total.toFixed(2)}`,
            "Payment Method": order.paymentMethod || "N/A"
        },
        actionUrl: `https://${store.slug}.nexa-os.com/orders/${order.id}`,
        actionLabel: "View Full Receipt"
    });
};
exports.getReceiptEmailTemplate = getReceiptEmailTemplate;
const getAlertEmailTemplate = (alert) => {
    return (0, exports.getBaseEmailTemplate)({
        title: alert.title,
        message: alert.details,
        type: alert.severity === "high" ? "alert" : "info",
        metadata: {
            "Severity": alert.severity.toUpperCase(),
            "Timestamp": new Date().toLocaleString(),
            "System Component": "Nexa Security Engine"
        }
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