import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import type { Staff } from "@/types/tenant";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useStaff(): QueryResult<Staff[]> {
  const { user } = useAuth();
  const [data, setData] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setData([]);
      setIsLoading(false);
      return;
    }

    // Admins can see all staff for their store
    // For now, we assume ownerId is the admin's UID
    const q = query(
      collection(db, "staff"),
      where("ownerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staff: Staff[] = [];
      snapshot.forEach((doc) => {
        staff.push({ id: doc.id, ...doc.data() } as any);
      });
      setData(staff);
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { data, isLoading, error };
}

export function useStaffMutations() {
  const { user } = useAuth();

  const addStaff = async (staffData: Partial<Staff>) => {
    if (!user) throw new Error("Unauthorized");
    return addDoc(collection(db, "staff"), {
      ...staffData,
      ownerId: user.uid,
      createdAt: new Date().toISOString(),
      isActive: true,
    });
  };

  const updateStaff = async (staffId: string, updates: Partial<Staff>) => {
    const staffRef = doc(db, "staff", staffId);
    return updateDoc(staffRef, updates);
  };

  return { addStaff, updateStaff };
}
