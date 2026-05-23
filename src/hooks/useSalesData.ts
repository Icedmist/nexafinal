import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, writeBatch, doc, increment, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import type { SaleTransaction, DebtPayment } from "@/types/inventory";
import { MovementType } from "@/types/inventory";
import { isAdminRole } from "@/lib/roles";
import { notifyActivity, notifyInventoryAlert } from "@/lib/notification-service";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useSales(): QueryResult<SaleTransaction[]> {
  const { user, claims, claimsReady } = useAuth();
  const { storeId, ownerId } = useBusiness();
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

    const isAdmin = isAdminRole(claims?.role) || (user && ownerId && user.uid === ownerId);
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
  const { storeId, ownerId } = useBusiness();
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

    const isAdmin = isAdminRole(claims?.role) || (user && ownerId && user.uid === ownerId);
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

    if (!claims?.storeId && !storeId) {
      throw new Error("Store context not loaded. Please refresh and try again.");
    }

    try {
      const batch = writeBatch(db);

      // 1. Create Sale Document
      const saleRef = doc(collection(db, "sales"));
      const saleData = {
        ...sale,
        itemIds: sale.items.map((i) => i.itemId),
        storeId: storeId || claims?.storeId, // CRITICAL: Must include storeId for Firestore rules
        branchId: claims?.branchId || null,
        ownerId: user.uid,
        recordedBy: user.uid,
        recordedByName: user.displayName || user.email || "Staff",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (!saleData.storeId) {
        throw new Error("Unable to determine store. Please refresh the page and try again.");
      }

      // Validate that every product belongs to the same store (pre-flight check to avoid permission-denied)
      for (const item of sale.items) {
        const productRef = doc(db, "products", item.itemId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) {
          throw new Error(`Product not found: ${item.itemId}`);
        }
        const productData: any = productSnap.data();
        if (!productData.storeId) {
          throw new Error(`Product ${item.itemId} is missing storeId; cannot update inventory.`);
        }
        if (productData.storeId !== saleData.storeId) {
          throw new Error(`Product ${item.itemId} belongs to a different store (${productData.storeId}).`);
        }
      }

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
          quantity: decrementAmount,
          unitUsed: (item as any).selectedUnit || null,
          reference: `Sale: ${saleRef.id}`,
          notes: `Customer: ${sale.customerName || "Walk-in"}`,
          storeId: saleData.storeId,
          branchId: claims?.branchId || null,
          ownerId: user.uid,
          performedBy: user.uid,
          performedByName: user.displayName || user.email || "Staff",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      await batch.commit();

      // 3. Trigger Notifications
      await notifyActivity({
        type: "sale",
        category: "sales",
        severity: "low",
        title: "New Sale Recorded",
        message: `${saleData.recordedByName} recorded a sale of ${saleData.totalNgn.toLocaleString()} NGN for ${saleData.customerName || "Walk-in Customer"}.`,
        userId: user.uid,
        userEmail: user.email || "",
        storeId: saleData.storeId,
        branchId: saleData.branchId,
        metadata: { saleId: saleRef.id, total: saleData.totalNgn }
      });

      // 4. Check for low stock on all items in this sale
      for (const item of sale.items) {
        const productRef = doc(db, "products", item.itemId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const product = productSnap.data() as any;
          const currentStock = product.currentStock || 0;
          const reorderPoint = product.reorderPoint || 5; // Fallback to 5 if not set

          if (currentStock <= reorderPoint) {
             await notifyInventoryAlert({
               title: "Low Stock Alert",
               message: `${product.name} is running low (${currentStock} ${product.unit || "units"} remaining). Reorder point is ${reorderPoint}.`,
               userId: user.uid,
               userEmail: user.email || "",
               storeId: saleData.storeId,
               branchId: saleData.branchId || undefined,
               metadata: { itemId: item.itemId, currentStock, reorderPoint }
             });
          }
        }
      }

      return { id: saleRef.id };
    } catch (error: any) {
      console.error("Failed to record sale:", error);
      if (error?.code === "permission-denied") {
        throw new Error("You don't have permission to record sales. Contact your administrator.");
      }
      throw new Error(error?.message || "Failed to record sale. Please check your inventory and try again.");
    }
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
