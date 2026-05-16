import { useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import type { Notification as InAppNotification } from "@/types/inventory";

export function useDeviceNotifications() {
  const { user } = useAuth();
  const { storeId } = useBusiness();

  useEffect(() => {
    // Only proceed if browser supports Notifications and user is authenticated
    if (!user || !storeId || !("Notification" in window)) return;

    // We only want to notify about notifications created AFTER the app was opened
    // to avoid spamming the user with old unread notifications on load.
    const hookStartTime = Date.now();

    const q = query(
      collection(db, "notifications"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // If permission isn't granted, we can't show notifications
      if (Notification.permission !== "granted") return;

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data() as InAppNotification;
          
          // Firestore Timestamps need conversion to Millis for comparison
          const createdAtMillis = data.createdAt instanceof Timestamp 
            ? data.createdAt.toMillis() 
            : (typeof data.createdAt === 'number' ? data.createdAt : 0);

          // Only notify if:
          // 1. Notification was created after this hook instance started
          // 2. Notification is marked as unread
          if (createdAtMillis > hookStartTime && !data.isRead) {
            try {
              new Notification(data.title || "Store Alert", {
                body: data.message,
                icon: "/favicon.ico",
                tag: change.doc.id, // Prevent duplicate notifications for same ID
                silent: false,
              });
            } catch (err) {
              console.error("Failed to trigger browser notification:", err);
            }
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user, storeId]);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notifications");
      return "unsupported";
    }
    
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      return "denied";
    }
  };

  const getPermissionStatus = () => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  };

  return { 
    requestPermission, 
    permission: getPermissionStatus() 
  };
}
