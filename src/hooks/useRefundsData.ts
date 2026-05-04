import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";

export interface Refund {
  id: string;
  saleId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  amountNgn: number;
  reason: string;
  notes?: string;
  createdAt: string;
  ownerId: string;
}

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useRefunds(): QueryResult<Refund[]> {
  const { user } = useAuth();
  const { ownerId } = useBusiness();
  const [data, setData] = useState<Refund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !ownerId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "refunds"),
      where("ownerId", "==", ownerId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const refunds: Refund[] = [];
      snapshot.forEach((doc) => {
        refunds.push({ id: doc.id, ...doc.data() } as Refund);
      });
      setData(refunds);
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, ownerId]);

  return { data, isLoading, error };
}

export function useRefundsMutations() {
  const { user } = useAuth();
  const { ownerId } = useBusiness();

  const addRefund = async (refund: Omit<Refund, "id" | "ownerId">) => {
    if (!user || !ownerId) throw new Error("Authentication required");
    return await addDoc(collection(db, "refunds"), {
      ...refund,
      ownerId,
      recordedBy: user.uid,
    });
  };

  return { addRefund };
}
