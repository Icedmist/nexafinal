import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, writeBatch, doc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import type { SaleTransaction } from "@/types/inventory";
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

    const q = query(
      collection(db, "sales"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sales: SaleTransaction[] = [];
      snapshot.forEach((doc) => {
        sales.push({ ...doc.data(), id: doc.id } as SaleTransaction);
      });

      // Filter by branch if user is restricted
      let filtered = sales;
      const isAdmin = isAdminRole(claims?.role);
      const userBranchId = claims?.branchId;
      
      if (!isAdmin && userBranchId) {
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
      
      // Decrement stock
      batch.update(productRef, {
        currentStock: increment(-item.quantity),
        updatedAt: new Date().toISOString()
      });

      // Create movement record for history
      const movementRef = doc(collection(db, "movements"));
      batch.set(movementRef, {
        itemId: item.itemId,
        type: MovementType.Shipped,
        quantity: item.quantity,
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

  return { addSale };
}
