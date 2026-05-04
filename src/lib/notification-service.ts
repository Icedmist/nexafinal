import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type NotificationType = "login" | "sale" | "movement" | "inventory_alert" | "staff_onboarding";

export interface ActivityNotification {
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  userEmail: string;
  metadata?: Record<string, any>;
  createdAt: any;
}

export const notifyActivity = async (
  type: NotificationType,
  title: string,
  message: string,
  userId: string,
  userEmail: string,
  metadata?: Record<string, any>
) => {
  try {
    await addDoc(collection(db, "activity_logs"), {
      type,
      title,
      message,
      userId,
      userEmail,
      metadata,
      createdAt: serverTimestamp(),
    });

    // Placeholder for real email sending
    // In production, this would trigger a Firebase Cloud Function that sends an email via SendGrid/Mailgun
    console.log(`[Email Notification] To: admin@store.com | Subject: ${title} | Body: ${message}`);
    
  } catch (err) {
    console.error("Failed to log activity notification:", err);
  }
};
