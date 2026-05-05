import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import type { SaleTransaction } from "@/types/inventory";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useSales(): QueryResult<SaleTransaction[]> {
  const { user, claims, claimsReady } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<SaleTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Wait for claims to ensure we filter correctly for branch-assigned staff
    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) {
        setData([]);
        setIsLoading(false);
      }
      return;
    }

    const q = query(
      collection(db, "sales"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sales: SaleTransaction[] = [];
      snapshot.forEach((doc) => {
        sales.push({ id: doc.id, ...doc.data() } as SaleTransaction);
      });

      // Filter by branch if user is restricted
      let filtered = sales;
      const userBranchId = claims?.branchId;
      if (userBranchId) {
        filtered = filtered.filter(s => s.branchId === userBranchId);
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

export function useSalesMutations() {
  const { user, claims } = useAuth();
  const { storeId } = useBusiness();

  const addSale = async (sale: Omit<SaleTransaction, "id">) => {
    if (!user || !storeId) {
      throw new Error("Authentication required to record sales. Please sign in.");
    }
    return await addDoc(collection(db, "sales"), {
      ...sale,
      storeId: storeId,
      branchId: claims?.branchId || null,
      ownerId: user.uid,
      recordedBy: user.uid,
    });
  };

  return { addSale };
}
