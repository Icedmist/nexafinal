import { useCallback } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import type { Notification } from "@/types/inventory";
import { useEffect, useState } from "react";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useNotifications(): QueryResult<Notification[]> {
  const { user } = useAuth();
  const { ownerId } = useBusiness();
  const [data, setData] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !ownerId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("ownerId", "==", ownerId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
      setData(items);
      setIsLoading(false);
    }, (err) => {
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, ownerId]);

  return { data, isLoading, error };
}

export function useUnreadCount(): number {
  const { data } = useNotifications();
  return data.filter(n => !n.isRead).length;
}

export function useMarkAsRead() {
  return useCallback(async (id: string) => {
    const docRef = doc(db, "notifications", id);
    await updateDoc(docRef, { isRead: true });
  }, []);
}

export function useMarkAllAsRead() {
  const { ownerId } = useBusiness();
  return useCallback(async () => {
    if (!ownerId) return;
    const q = query(collection(db, "notifications"), where("ownerId", "==", ownerId), where("isRead", "==", false));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.update(d.ref, { isRead: true });
    });
    await batch.commit();
  }, [ownerId]);
}

export function useDismissNotification() {
  return useCallback(async (id: string) => {
    const docRef = doc(db, "notifications", id);
    await deleteDoc(docRef);
  }, []);
}
