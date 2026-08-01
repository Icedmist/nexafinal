import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type NotificationSeverity = "low" | "medium" | "high" | "critical";
export type NotificationCategory = "inventory" | "sales" | "security" | "system" | "procurement";

export interface ActivityNotification {
  type: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  userId: string;
  userEmail: string;
  storeId?: string;
  branchId?: string | null;
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  isRead?: boolean;
}

/**
 * Enhanced notification service for rich activity logging and automated alerts.
 * Logs are stored in 'activity_logs' which triggers backend email/push notifications.
 */
export const notifyActivity = async (options: {
  type: string;
  category: NotificationCategory;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  userId: string;
  userEmail: string;
  storeId?: string;
  branchId?: string | null;
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
}) => {
  const {
    type,
    category,
    severity = "low",
    title,
    message,
    userId,
    userEmail,
    storeId,
    branchId = null,
    metadata = {},
    actionUrl,
    actionLabel,
  } = options;
  // Skip logging if storeId is not provided (required for proper activity filtering)
  if (!storeId) {
    console.warn(`[Notification Engine] Skipping activity log for ${category}/${type} - no storeId provided`);
    return null;
  }
  try {
    const logData = {
      type,
      category,
      severity,
      title,
      message,
      userId,
      userEmail,
      storeId,
      branchId,
      metadata: Object.fromEntries(
        Object.entries(metadata).filter(([_, v]) => v !== undefined)
      ),
      actionUrl: actionUrl || null,
      actionLabel: actionLabel || null,
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "activity_logs"), logData);
    
    // NOTE: In-app notifications are created server-side by the `onactivitycreated`
    // trigger (functions/src/index.ts), scoped to the activity's storeId. We do NOT
    // mirror here anymore to avoid duplicate in-app notifications per activity.
    
    console.log(`[Notification Engine] Activity logged: ${category}/${type} (${severity}) - ID: ${docRef.id}`);
    
    return docRef.id;
  } catch (err) {
    console.error("Failed to log activity notification:", err);
    return null;
  }
};

/**
 * Specialized security alert notification
 */
export const notifySecurityAlert = async (options: {
  title: string;
  message: string;
  userId: string;
  userEmail: string;
  storeId: string;
  severity: "high" | "critical";
  metadata?: Record<string, any>;
}) => {
  return notifyActivity({
    ...options,
    type: "security_alert",
    category: "security",
    actionUrl: "/settings/security",
    actionLabel: "Review Security Logs"
  });
};

/**
 * Specialized inventory alert notification
 */
export const notifyInventoryAlert = async (options: {
  title: string;
  message: string;
  userId: string;
  userEmail: string;
  storeId: string;
  branchId?: string;
  metadata?: Record<string, any>;
}) => {
  return notifyActivity({
    ...options,
    type: "low_stock_alert",
    category: "inventory",
    severity: "medium",
    actionUrl: "/inventory",
    actionLabel: "Restock Inventory"
  });
};
