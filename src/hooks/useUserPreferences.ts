import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import type { NotificationPrefs } from "@/components/notifications/NotificationPreferences";

const DEFAULT_PREFS: NotificationPrefs = {
  low_stock: true,
  zero_stock: true,
  po_reminder: true,
  po_overdue: true,
  inventory_request: true,
  sale: true,
  movement: true,
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPrefs(DEFAULT_PREFS);
      setLoading(false);
      return;
    }

    const prefDocRef = doc(db, "user_preferences", user.uid);

    // Use onSnapshot for real-time updates across devices
    const unsubscribe = onSnapshot(prefDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPrefs({
          ...DEFAULT_PREFS,
          ...data.notifications,
        });
      } else {
        setPrefs(DEFAULT_PREFS);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching user preferences:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updateNotificationPrefs = async (newPrefs: Partial<NotificationPrefs>) => {
    if (!user) return;

    const prefDocRef = doc(db, "user_preferences", user.uid);
    const updatedPrefs = { ...prefs, ...newPrefs };

    try {
      await setDoc(prefDocRef, {
        notifications: updatedPrefs,
        updatedAt: new Date().toISOString(),
        userEmail: user.email,
      }, { merge: true });
      return true;
    } catch (error) {
      console.error("Error saving user preferences:", error);
      throw error;
    }
  };

  return {
    prefs,
    loading,
    updateNotificationPrefs,
  };
}
