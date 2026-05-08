"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailViaZoho = void 0;
const nodemailer = require("nodemailer");
const params_1 = require("firebase-functions/params");
const email_template_1 = require("./email-template");
// Define secrets for Zoho credentials
const ZOHO_EMAIL = (0, params_1.defineSecret)("ZOHO_EMAIL");
const ZOHO_PASSWORD = (0, params_1.defineSecret)("ZOHO_PASSWORD");
const sendEmailViaZoho = async (options) => {
    const email = ZOHO_EMAIL.value();
    const password = ZOHO_PASSWORD.value();
    const transporter = nodemailer.createTransport({
        host: "smtp.zoho.com",
        port: 465,
        secure: true, // true for port 465, false for other ports
        auth: {
            user: email,
            pass: password,
        },
    });
    const mailOptions = {
        from: `"${options.fromName || "Nexa OS"}" <${email}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || (0, email_template_1.getBaseEmailTemplate)({
            title: options.subject,
            message: options.text
        }),
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully:", info.messageId);
        return { success: true, messageId: info.messageId };
    }
    catch (error) {
        console.error("Error sending email via Zoho:", error);
        throw error;
    }
};
exports.sendEmailViaZoho = sendEmailViaZoho;
//# sourceMappingURL=email.js.map