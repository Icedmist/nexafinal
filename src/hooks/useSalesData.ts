import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, writeBatch, doc, increment, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import type { SaleTransaction, DebtPayment } from "@/types/inventory";
import { MovementType } from "@/types/inventory";
import { isAdminRole } from "@/lib/roles";

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

    const isAdmin = isAdminRole(claims?.role);
    const userBranchId = claims?.branchId;

    let q = query(
      collection(db, "sales"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc")
    );

    if (!isAdmin) {
      q = query(q, where("branchId", "==", userBranchId || "none"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sales: SaleTransaction[] = [];
      snapshot.forEach((doc) => {
        sales.push({ ...doc.data(), id: doc.id } as SaleTransaction);
      });

      setData(sales);
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

export function useDebtPayments(): QueryResult<DebtPayment[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<DebtPayment[]>([]);
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

    const isAdmin = isAdminRole(claims?.role);
    const userBranchId = claims?.branchId;

    let q = query(
      collection(db, "debt_payments"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc")
    );

    if (!isAdmin) {
      q = query(q, where("branchId", "==", userBranchId || "none"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const payments: DebtPayment[] = [];
      snapshot.forEach((doc) => {
        payments.push({ ...doc.data(), id: doc.id } as DebtPayment);
      });

      setData(payments);
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

    const batch = writeBatch(db);
    
    // 1. Create Sale Document
    const saleRef = doc(collection(db, "sales"));
    const saleData = {
      ...sale,
      itemIds: sale.items.map((i) => i.itemId),
      storeId: storeId,
      branchId: claims?.branchId || null,
      ownerId: user.uid,
      recordedBy: user.uid,
      recordedByName: user.displayName || user.email?.split("@")[0] || "Unknown Staff",
    };
    batch.set(saleRef, saleData);

    // 2. Update Product Inventory and Record Movements
    sale.items.forEach((item) => {
      const productRef = doc(db, "products", item.itemId);
      
      // Calculate real decrement amount based on unit conversion
      const conversionFactor = (item as any).conversionFactor || 1;
      const decrementAmount = item.quantity * conversionFactor;

      // Decrement stock
      batch.update(productRef, {
        currentStock: increment(-decrementAmount),
        updatedAt: new Date().toISOString()
      });

      // Create movement record for history
      const movementRef = doc(collection(db, "movements"));
      batch.set(movementRef, {
        itemId: item.itemId,
        type: MovementType.Shipped,
        quantity: decrementAmount, // Store base quantity in movements
        unitUsed: (item as any).selectedUnit || null,
        reference: `Sale: ${saleRef.id}`,
        notes: `Customer: ${sale.customerName || "Walk-in"}`,
        storeId: storeId,
        branchId: claims?.branchId || null,
        ownerId: user.uid,
        performedBy: user.uid,
        performedByName: user.displayName || user.email?.split("@")[0] || "Staff",
        createdAt: new Date().toISOString()
      });
    });


    await batch.commit();
    return { id: saleRef.id };
  };

  const recordDebtPayment = async (payment: { 
    customerPhone: string; 
    customerName: string; 
    amountNgn: number; 
    notes?: string;
  }) => {
    if (!user || !storeId) throw new Error("Authentication required");
    
    const paymentRef = doc(collection(db, "debt_payments"));
    const paymentData = {
      ...payment,
      storeId,
      branchId: claims?.branchId || null,
      recordedBy: user.uid,
      recordedByName: user.displayName || user.email?.split("@")[0] || "Staff",
      createdAt: new Date().toISOString(),
    };

    await setDoc(paymentRef, paymentData);
    return paymentRef.id;
  };

  return { addSale, recordDebtPayment };
}
