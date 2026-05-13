import * as nodemailer from "nodemailer";
import { defineSecret } from "firebase-functions/params";
import { getBaseEmailTemplate } from "./email-template";

// Define secrets for Zoho credentials
const ZOHO_EMAIL = defineSecret("ZOHO_EMAIL");
const ZOHO_PASSWORD = defineSecret("ZOHO_PASSWORD");

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  fromName?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export const sendEmailViaZoho = async (options: EmailOptions) => {
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
    html: options.html || getBaseEmailTemplate({ 
      title: options.subject, 
      message: options.text,
      actionUrl: options.actionUrl,
      actionLabel: options.actionLabel
    }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email via Zoho:", error);
    throw error;
  }
};
