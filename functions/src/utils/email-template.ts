export interface EmailTemplateOptions {
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  footerText?: string;
  type?: "security" | "info" | "alert" | "success" | "receipt" | "report";
  metadata?: Record<string, string>;
}

const typeColors = {
  security: "#3b82f6",
  info: "#6366f1",
  alert: "#f43f5e",
  success: "#10b981",
  receipt: "#f59e0b",
  report: "#8b5cf6",
};

export const getBaseEmailTemplate = (options: EmailTemplateOptions) => {
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
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: #050505;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #050505;
      padding: 60px 0;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #0a0a0a;
      background-image: 
        radial-gradient(circle at 0% 0%, ${accentColor}10 0%, transparent 40%),
        radial-gradient(circle at 100% 100%, ${accentColor}05 0%, transparent 40%);
      border-radius: 40px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.05);
      box-shadow: 0 40px 120px -20px rgba(0, 0, 0, 0.8);
    }
    
    .header {
      padding: 64px 64px 40px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }
    
    .logo-container {
      display: inline-block;
      margin-bottom: 0;
    }

    .logo {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.5em;
      color: #ffffff;
      text-transform: uppercase;
      padding: 8px 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.02);
    }
    
    .content {
      padding: 48px 64px 64px;
    }
    
    .type-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 32px;
    }

    .type-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${accentColor};
      box-shadow: 0 0 12px ${accentColor};
    }

    .type-label {
      font-size: 12px;
      font-weight: 700;
      color: ${accentColor};
      text-transform: uppercase;
      letter-spacing: 0.2em;
    }
    
    h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 42px;
      font-weight: 700;
      line-height: 1.1;
      margin: 0 0 32px;
      color: #ffffff;
      letter-spacing: -0.05em;
    }
    
    .message {
      font-size: 18px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 48px;
      font-weight: 400;
    }
    
    .metadata-box {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 24px;
      padding: 32px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      margin-bottom: 48px;
    }

    .metadata-row {
      display: block;
      margin-bottom: 24px;
    }

    .metadata-row:last-child {
      margin-bottom: 0;
    }

    .metadata-key {
      font-size: 11px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-bottom: 8px;
      display: block;
    }

    .metadata-val {
      font-size: 16px;
      font-weight: 500;
      color: #f8fafc;
    }
    
    .button-container {
      margin: 64px 0 0;
      text-align: left;
    }
    
    .button {
      display: inline-block;
      padding: 24px 48px;
      background: #ffffff;
      color: #000000 !important;
      text-decoration: none !important;
      border-radius: 100px;
      font-size: 16px;
      font-weight: 700;
      text-align: center;
      transition: transform 0.2s ease;
    }
    
    .divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.05);
      margin: 64px 0;
    }
    
    .footer {
      padding: 0 64px 64px;
    }
    
    .footer-brand {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: #334155;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }

    .footer-text {
      font-size: 13px;
      color: #475569;
      line-height: 1.6;
      margin: 0;
    }
    
    .footer-links {
      margin-top: 40px;
      padding-top: 40px;
      border-top: 1px solid rgba(255, 255, 255, 0.03);
    }
    
    .footer-links a {
      color: #64748b;
      text-decoration: none;
      margin-right: 24px;
      font-size: 12px;
      font-weight: 600;
    }

    @media only screen and (max-width: 640px) {
      .wrapper {
        padding: 0;
      }
      .container {
        border-radius: 0;
        border: none;
      }
      .header, .content, .footer {
        padding: 48px 32px;
      }
      h1 {
        font-size: 32px;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container">
          <div class="logo">NEXA CORE</div>
        </div>
      </div>
      
      <div class="content">
        <div class="type-indicator">
          <div class="type-dot"></div>
          <div class="type-label">${type.replace('_', ' ')} protocol</div>
        </div>
        
        <h1>${title}</h1>
        
        <div class="message">${message.replace(/\n/g, "<br>")}</div>
        
        ${metadata ? `
        <div class="metadata-box">
          ${Object.entries(metadata).map(([key, value]) => `
            <div class="metadata-row">
              <span class="metadata-key">${key}</span>
              <span class="metadata-val">${value}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${actionUrl && actionLabel ? `
        <div class="button-container">
          <a href="${actionUrl}" class="button">${actionLabel}</a>
        </div>
        ` : ''}
      </div>
      
      <div class="footer">
        <div class="footer-brand">Autonomous Enterprise Network</div>
        <p class="footer-text">${footerText || "This transmission is automated and part of the Nexa OS Core event pipeline. Security level: High."}</p>
        
        <div class="footer-links">
          <a href="#">System Console</a>
          <a href="#">Security Center</a>
          <a href="#">Support</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

export const getReceiptEmailTemplate = (order: any, store: any) => {
  const total = order.total || 0;
  
  return getBaseEmailTemplate({
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

export const getAlertEmailTemplate = (alert: { 
  title: string; 
  severity: string; 
  details: string;
  actionUrl?: string;
  actionLabel?: string;
  performedBy?: string;
}) => {
  const severityToType: Record<string, "alert" | "security" | "info"> = {
    critical: "alert",
    high: "alert",
    medium: "info",
  };

  return getBaseEmailTemplate({
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

export const getReportEmailTemplate = (report: { title: string; period: string; summary: string }) => {
  return getBaseEmailTemplate({
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
