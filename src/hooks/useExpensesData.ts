import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { Expense, ExpenseCategory } from "@/types/finance";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useExpenses(): QueryResult<Expense[]> {
  const { user } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !storeId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "expenses"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expenses: Expense[] = [];
      snapshot.forEach((doc) => {
        expenses.push({ id: doc.id, ...doc.data() } as Expense);
      });
      setData(expenses);
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, storeId]);

  return { data, isLoading, error };
}

export function useExpensesMutations() {
  const { user } = useAuth();
  const { storeId } = useBusiness();

  const addExpense = async (expense: Omit<Expense, "id" | "ownerId">) => {
    if (!user || !storeId) throw new Error("Authentication required");
    return await addDoc(collection(db, "expenses"), {
      ...expense,
      storeId,
      ownerId: user.uid,
      recordedBy: user.uid,
    });
  };

  const deleteExpense = async (id: string) => {
    if (!user || !storeId) throw new Error("Authentication required");
    return await deleteDoc(doc(db, "expenses", id));
  };

  return { addExpense, deleteExpense };
}
