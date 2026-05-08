"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBaseEmailTemplate = void 0;
const getBaseEmailTemplate = (options) => {
    const { title, message, actionUrl, actionLabel } = options;
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px; background-color: #0f172a; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">NEXA OS</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 700;">${title}</h2>
              <p style="margin: 0; color: #475569; font-size: 16px; line-height: 1.6;">
                ${message.replace(/\n/g, "<br>")}
              </p>
              
              ${actionUrl && actionLabel ? `
              <table border="0" cellspacing="0" cellpadding="0" style="margin-top: 32px;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #2563eb;">
                    <a href="${actionUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                      ${actionLabel}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f1f5f9; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px; font-weight: 500;">
                Sent via your Nexa OS Store Dashboard
              </p>
              <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 11px;">
                &copy; ${new Date().getFullYear()} Nexa OS. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};
exports.getBaseEmailTemplate = getBaseEmailTemplate;
//# sourceMappingURL=email-template.js.map