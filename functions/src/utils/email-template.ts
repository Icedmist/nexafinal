export interface EmailTemplateOptions {
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  footerText?: string;
}

export const getBaseEmailTemplate = (options: EmailTemplateOptions) => {
  const { title, message, actionUrl, actionLabel, footerText } = options;

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f8fafc;
      padding: 40px 0;
    }
    
    .main {
      background-color: #ffffff;
      margin: 0 auto;
      width: 100%;
      max-width: 600px;
      border-spacing: 0;
      color: #1e293b;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid #e2e8f0;
    }
    
    .header {
      background-color: #0f172a;
      padding: 40px 0;
      text-align: center;
    }
    
    .logo {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.15em;
      color: #3b82f6;
      margin: 0;
      text-transform: uppercase;
    }
    
    .content {
      padding: 48px 40px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      background-color: #eff6ff;
      color: #3b82f6;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 24px;
    }
    
    .title {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 16px 0;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }
    
    .message {
      font-size: 16px;
      line-height: 1.6;
      color: #475569;
      margin: 0;
    }
    
    .action-container {
      margin-top: 40px;
      text-align: left;
    }
    
    .button {
      background-color: #3b82f6;
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 15px;
      display: inline-block;
      text-align: center;
      transition: all 0.2s ease;
    }
    
    .divider {
      height: 1px;
      background-color: #e2e8f0;
      margin: 40px 0;
    }
    
    .security-note {
      background-color: #f1f5f9;
      border-radius: 16px;
      padding: 24px;
      border-left: 4px solid #3b82f6;
    }
    
    .security-note-title {
      margin: 0;
      color: #0f172a;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
    }
    
    .security-note-text {
      margin: 8px 0 0 0;
      color: #64748b;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .footer {
      padding: 40px;
      text-align: center;
    }
    
    .footer-text {
      color: #94a3b8;
      font-size: 13px;
      margin: 0;
    }
    
    .copyright {
      color: #cbd5e1;
      font-size: 12px;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main">
      <tr>
        <td class="header">
          <div class="logo">NEXA OS</div>
        </td>
      </tr>
      <tr>
        <td class="content">
          <div class="status-badge">System Notification</div>
          <h1 class="title">${title}</h1>
          <div class="message">
            ${message.replace(/\n/g, "<br>")}
          </div>
          
          ${actionUrl && actionLabel ? `
          <div class="action-container">
            <a href="${actionUrl}" class="button">${actionLabel}</a>
          </div>
          ` : ''}
          
          <div class="divider"></div>
          
          <div class="security-note">
            <p class="security-note-title">Security & Compliance</p>
            <p class="security-note-text">
              This is a secure, automated transmission from your Nexa Store OS instance. 
              All platform activities are cryptographically logged for audit purposes.
            </p>
          </div>
        </td>
      </tr>
    </table>
    
    <div class="footer">
      <p class="footer-text">${footerText || 'Intelligent Commerce Infrastructure'}</p>
      <p class="copyright">&copy; ${new Date().getFullYear()} Nexa OS Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};
