import { useState, useEffect, useCallback } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useDemo } from "@/hooks/useDemo";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: any;
  ownerId?: string;
  storeId?: string;
}

export function useUsers() {
  const { user } = useAuth();
  const { storeId } = useBusiness();
  const { isDemo } = useDemo();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      setStaff([]);
      setLoading(false);
      return;
    }

    if (!user || !storeId) {
      setStaff([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "staff"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StaffMember[];
      setStaff(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, storeId]);

  const addStaff = useCallback(async (data: Omit<StaffMember, "id">) => {
    if (!user || !storeId) return;
    await addDoc(collection(db, "staff"), {
      ...data,
      ownerId: user.uid,
      storeId,
      createdAt: serverTimestamp(),
    });
  }, [user, storeId]);

  const updateStaff = useCallback(async (id: string, updates: Partial<StaffMember>) => {
    await updateDoc(doc(db, "staff", id), updates);
  }, []);

  const removeStaff = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "staff", id));
  }, []);

  return { staff, loading, addStaff, updateStaff, removeStaff };
}
