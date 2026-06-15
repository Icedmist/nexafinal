import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, doc, writeBatch, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import type { Refund } from "@/types/finance";
import { isAdminRole } from "@/lib/roles";
import { notifyActivity } from "@/lib/notification-service";

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

    const isAdmin = isAdminRole(claims?.role);
    const userBranchId = claims?.branchId;

    let q = query(
      collection(db, "refunds"),
      where("storeId", "==", storeId)
    );

    if (!isAdmin && userBranchId) {
      q = query(q, where("branchId", "==", userBranchId));
    }

    q = query(q, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const refunds: Refund[] = [];
      snapshot.forEach((doc) => {
        refunds.push({ id: doc.id, ...doc.data() } as Refund);
      });

      const filtered = refunds;

      setData(filtered);
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, storeId, claimsReady, claims?.branchId, claims?.role]);

  return { data, isLoading, error };
}

export function useRefundsMutations() {
  const { user, claims } = useAuth();
  const { storeId } = useBusiness();

  const addRefund = async (refund: Omit<Refund, "id">) => {
    if (!user || !storeId) throw new Error("Authentication required");

    // Build the document payload, only including proofImageUrl if it exists
    const payload: any = {
      ...refund,
      storeId,
      branchId: claims?.branchId || null,
      ownerId: user.uid,
      recordedBy: user.uid,
      recordedByName: user.displayName || user.email || "Staff",
    };

    // Clean up undefined optional fields so Firestore doesn't store them as null/undefined
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    const batch = writeBatch(db);
    const refundRef = doc(collection(db, "refunds"));

    // 1. Create Refund Document
    batch.set(refundRef, payload);

    // 2. Increment product currentStock (base quantity = refund.quantity * conversionFactor)
    const productRef = doc(db, "products", refund.itemId);
    const conversionFactor = refund.conversionFactor || 1;
    const incrementAmount = refund.quantity * conversionFactor;

    batch.update(productRef, {
      currentStock: increment(incrementAmount),
      updatedAt: new Date().toISOString()
    });

    // 3. Create stock movement record
    const movementRef = doc(collection(db, "movements"));
    batch.set(movementRef, {
      itemId: refund.itemId,
      type: "received", // MovementType.Received
      quantity: incrementAmount,
      unitUsed: refund.selectedUnit || null,
      reference: `Refund: ${refundRef.id}`,
      notes: `Returned from Sale ${refund.saleId}. Reason: ${refund.reason}${refund.notes ? ` - ${refund.notes}` : ""}`,
      storeId,
      branchId: claims?.branchId || null,
      ownerId: user.uid,
      performedBy: user.uid,
      performedByName: user.displayName || user.email || "Staff",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await batch.commit();

    // 4. Trigger Notification
    try {
      await notifyActivity({
        type: "movement",
        category: "inventory",
        severity: "low",
        title: "Product Refunded",
        message: `${refund.quantity} ${refund.selectedUnit || "units"} of ${refund.itemName} refunded.`,
        userId: user.uid,
        userEmail: user.email || "",
        storeId,
        branchId: claims?.branchId || undefined,
        metadata: { refundId: refundRef.id, itemId: refund.itemId, qty: refund.quantity }
      });
    } catch (err) {
      console.error("Failed to log activity notification for refund:", err);
    }

    return refundRef;
  };

  return { addRefund };
}
