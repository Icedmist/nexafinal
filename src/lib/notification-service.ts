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
  storeId?: string,
  branchId?: string | null,
  metadata?: Record<string, any>
) => {
  try {
    const logData: Record<string, any> = {
      type,
      title,
      message,
      userId,
      userEmail,
      storeId: storeId || null,
      branchId: branchId || null,
      createdAt: serverTimestamp(),
    };
    if (metadata !== undefined) {
      // Filter out any undefined values within metadata itself
      const cleanMeta: Record<string, any> = {};
      for (const [k, v] of Object.entries(metadata)) {
        if (v !== undefined) cleanMeta[k] = v;
      }
      if (Object.keys(cleanMeta).length > 0) {
        logData.metadata = cleanMeta;
      }
    }
    await addDoc(collection(db, "activity_logs"), logData);

    // Placeholder for real email sending
    // In production, this would trigger a Firebase Cloud Function that sends an email via SendGrid/Mailgun
    console.log(`[Email Notification] To: admin@store.com | Subject: ${title} | Body: ${message}`);
    
  } catch (err) {
    console.error("Failed to log activity notification:", err);
  }
};
