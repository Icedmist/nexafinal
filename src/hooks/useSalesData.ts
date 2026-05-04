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
  const { user } = useAuth();
  const { ownerId } = useBusiness();
  const [data, setData] = useState<SaleTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !ownerId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "sales"),
      where("ownerId", "==", ownerId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sales: SaleTransaction[] = [];
      snapshot.forEach((doc) => {
        sales.push({ id: doc.id, ...doc.data() } as SaleTransaction);
      });
      setData(sales);
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

export function useSalesMutations() {
  const { user } = useAuth();
  const { ownerId } = useBusiness();

  const addSale = async (sale: Omit<SaleTransaction, "id">) => {
    if (!user || !ownerId) {
      throw new Error("Authentication required to record sales. Please sign in.");
    }
    return await addDoc(collection(db, "sales"), {
      ...sale,
      ownerId: ownerId,
      recordedBy: user.uid,
    });
  };

  return { addSale };
}
