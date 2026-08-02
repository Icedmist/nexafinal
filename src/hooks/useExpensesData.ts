import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useEffectiveBranch } from "@/hooks/useEffectiveBranch";
import { useDemo } from "@/hooks/useDemo";
import { Expense } from "@/types/finance";
import { isAdminRole } from "@/lib/roles";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useExpenses(): QueryResult<Expense[]> {
  const { user, claims, claimsReady } = useAuth();
  const { storeId } = useBusiness();
  const { isDemo } = useDemo();
  const { effectiveBranchId, canJumpBranch } = useEffectiveBranch();
  const [data, setData] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isDemo) {
      setData([]);
      setIsLoading(false);
      return;
    }

    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) {
        setData([]);
        setIsLoading(false);
      }
      return;
    }

    const isAdmin = isAdminRole(claims?.role) && !canJumpBranch;
    const userBranchId = canJumpBranch ? effectiveBranchId : claims?.branchId;

    let q = query(
      collection(db, "expenses"),
      where("storeId", "==", storeId)
    );

    if (!isAdmin && userBranchId) {
      q = query(q, where("branchId", "==", userBranchId));
    }

    q = query(q, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expenses: Expense[] = [];
      snapshot.forEach((doc) => {
        expenses.push({ ...doc.data(), id: doc.id } as Expense);
      });

      let filtered = expenses;

      setData(filtered);
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isDemo, user, storeId, claimsReady, claims?.branchId, canJumpBranch, effectiveBranchId]);

  return { data, isLoading, error };
}

export function useExpensesMutations() {
  const { user, claims } = useAuth();
  const { storeId } = useBusiness();
  const { effectiveBranchId, canJumpBranch } = useEffectiveBranch();

  const addExpense = async (expense: Omit<Expense, "id" | "ownerId">) => {
    if (!user || !storeId) throw new Error("Authentication required");
    return await addDoc(collection(db, "expenses"), {
      ...expense,
      storeId,
      branchId: canJumpBranch ? effectiveBranchId : (claims?.branchId || null),
      ownerId: user.uid,
      recordedBy: user.uid,
      recordedByName: user.displayName || user.email?.split("@")[0] || "Unknown Staff",
    });
  };

  const deleteExpense = async (id: string) => {
    if (!user || !storeId) throw new Error("Authentication required");
    return await deleteDoc(doc(db, "expenses", id));
  };

  return { addExpense, deleteExpense };
}
