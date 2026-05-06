import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import type { Refund } from "@/types/finance";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useRefunds(): QueryResult<Refund[]> {
  const { user, claims, claimsReady } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<Refund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) {
        setData([]);
        setIsLoading(false);
      }
      return;
    }

    const q = query(
      collection(db, "refunds"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const refunds: Refund[] = [];
      snapshot.forEach((doc) => {
        refunds.push({ id: doc.id, ...doc.data() } as Refund);
      });

      // Filter by branch if user is restricted
      let filtered = refunds;
      const isAdmin = claims?.role === "admin";
      const userBranchId = claims?.branchId;
      
      if (!isAdmin && userBranchId) {
        filtered = filtered.filter(r => r.branchId === userBranchId);
      }

      setData(filtered);
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, storeId, claimsReady, claims?.branchId]);

  return { data, isLoading, error };
}

export function useRefundsMutations() {
  const { user, claims } = useAuth();
  const { storeId } = useBusiness();

  const addRefund = async (refund: Omit<Refund, "id" | "ownerId">) => {
    if (!user || !storeId) throw new Error("Authentication required");
    return await addDoc(collection(db, "refunds"), {
      ...refund,
      storeId,
      branchId: claims?.branchId || null,
      ownerId: user.uid,
      recordedBy: user.uid,
    });
  };

  return { addRefund };
}
