import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, orderBy, writeBatch, doc, increment, setDoc, getDoc, getDocs, getDocFromCache, updateDoc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useEffectiveBranch } from "@/hooks/useEffectiveBranch";
import { useDemo } from "@/hooks/useDemo";
import type { SaleTransaction, DebtPayment, ImportedDebt, CustomerBalance, CreditTopup } from "@/types/inventory";
import { MovementType } from "@/types/inventory";
import { isAdminRole } from "@/lib/roles";
import { notifyActivity, notifyInventoryAlert } from "@/lib/notification-service";
import { cleanFirestoreData } from "@/utils/cleanFirestoreData";
import { getSaleOutstanding } from "@/lib/credit-sale";
import { functions } from "@/lib/firebase";

/**
 * Feature 11: prefer the server-side ledger callables when online. Cloud
 * Functions own the authoritative stock deduction / debt settlement, which
 * removes the client-side write races. On any failure (offline, function not
 * yet deployed, permission) we fall back to the local write path so sales are
 * never blocked — matching the offline-first plan.
 */
async function callWithFallback<TResult>(
  name: string,
  payload: Record<string, unknown>,
  fallback: () => Promise<TResult>
): Promise<TResult> {
  try {
    const { httpsCallable } = await import("firebase/functions");
    const fn = httpsCallable(functions, name);
    const res = await fn(payload);
    return res.data as TResult;
  } catch {
    return fallback();
  }
}

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Sales records created before the `recordsale` ledger started persisting line
 * items carry only `itemIds`, not an `items` array. Normalize on read so any UI
 * that renders sale.items can iterate safely instead of crashing.
 */
export function normalizeSale<T extends { items?: unknown }>(raw: T): T {
  return { ...raw, items: Array.isArray(raw.items) ? raw.items : [] };
}

export function useSales(): QueryResult<SaleTransaction[]> {
  const { user, claims, claimsReady } = useAuth();
  const { storeId, ownerId } = useBusiness();
  const { isDemo } = useDemo();
  const { effectiveBranchId, canJumpBranch } = useEffectiveBranch();
  const [data, setData] = useState<SaleTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isDemo) {
      setData([]);
      setIsLoading(false);
      return;
    }

    // Wait for claims to ensure we filter correctly for branch-assigned staff
    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) {
        setData([]);
        setIsLoading(false);
      }
      return;
    }

    const isAdmin = ((isAdminRole(claims?.role)) || (user && ownerId && user.uid === ownerId)) && !canJumpBranch;
    const userBranchId = canJumpBranch ? effectiveBranchId : claims?.branchId;

    let q = query(
      collection(db, "sales"),
      where("storeId", "==", storeId)
    );

    if (!isAdmin) {
      q = query(q, where("branchId", "==", userBranchId || "none"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sales: SaleTransaction[] = [];
      snapshot.forEach((doc) => {
        sales.push(normalizeSale({ ...doc.data(), id: doc.id } as SaleTransaction));
      });

      // Sort client-side by createdAt descending to avoid composite index requirements
      sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setData(sales);
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

export function useDebtPayments(): QueryResult<DebtPayment[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId, ownerId } = useBusiness();
  const { isDemo } = useDemo();
  const { effectiveBranchId, canJumpBranch } = useEffectiveBranch();
  const [data, setData] = useState<DebtPayment[]>([]);
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

    const isAdmin = ((isAdminRole(claims?.role)) || (user && ownerId && user.uid === ownerId)) && !canJumpBranch;
    const userBranchId = canJumpBranch ? effectiveBranchId : claims?.branchId;

    let q = query(
      collection(db, "debt_payments"),
      where("storeId", "==", storeId)
    );

    if (!isAdmin) {
      q = query(q, where("branchId", "==", userBranchId || "none"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const payments: DebtPayment[] = [];
      snapshot.forEach((doc) => {
        payments.push({ ...doc.data(), id: doc.id } as DebtPayment);
      });
      
      // Sort client-side by createdAt descending to avoid composite index requirements
      payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setData(payments);
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

export function useImportedDebts(): QueryResult<ImportedDebt[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId, ownerId } = useBusiness();
  const { isDemo } = useDemo();
  const { effectiveBranchId, canJumpBranch } = useEffectiveBranch();
  const [data, setData] = useState<ImportedDebt[]>([]);
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

    const isAdmin = ((isAdminRole(claims?.role)) || (user && ownerId && user.uid === ownerId)) && !canJumpBranch;
    const userBranchId = canJumpBranch ? effectiveBranchId : claims?.branchId;

    let q = query(
      collection(db, "debt_records"),
      where("storeId", "==", storeId)
    );

    if (!isAdmin) {
      q = query(q, where("branchId", "==", userBranchId || "none"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const debts: ImportedDebt[] = [];
      snapshot.forEach((doc) => {
        debts.push({ ...doc.data(), id: doc.id } as ImportedDebt);
      });
      debts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setData(debts);
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

/**
 * Real-time balance for a single (store, customerPhone). Returns 0 when the
 * customer has no credit account yet. Balances are store-wide (shared across
 * branches), matching how a customer's credit travels with them.
 */
export function useCustomerBalance(customerPhone: string | null): { balance: number; isLoading: boolean } {
  const { user, claimsReady } = useAuth();
  const { storeId } = useBusiness();
  const { isDemo } = useDemo();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      setBalance(0);
      setIsLoading(false);
      return;
    }
    const phone = customerPhone?.trim();
    if (!user || !storeId || !claimsReady || !phone) {
      if (!claimsReady || !user || !phone) setIsLoading(false);
      setBalance(0);
      return;
    }

    const q = query(
      collection(db, "customer_credits"),
      where("storeId", "==", storeId),
      where("customerPhone", "==", phone)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let bal = 0;
      snapshot.forEach((docc) => {
        bal = Number(docc.data().balanceNgn) || 0;
      });
      setBalance(bal);
      setIsLoading(false);
    }, (err) => {
      console.error("Customer credit balance listener error:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isDemo, user, storeId, claimsReady, customerPhone]);

  return { balance, isLoading };
}

/**
 * All active customer balances for the store, for the credit ledger screen.
 */
export function useCustomerBalances(): QueryResult<CustomerBalance[]> {
  const { user, claimsReady } = useAuth();
  const { storeId } = useBusiness();
  const { isDemo } = useDemo();
  const [data, setData] = useState<CustomerBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isDemo) {
      setData([]);
      setIsLoading(false);
      return;
    }
    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) setIsLoading(false);
      setData([]);
      return;
    }
    const q = query(
      collection(db, "customer_credits"),
      where("storeId", "==", storeId),
      orderBy("updatedAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rows: CustomerBalance[] = [];
      snapshot.forEach((docc) => rows.push({ id: docc.id, ...docc.data() } as CustomerBalance));
      setData(rows);
      setIsLoading(false);
    }, (err) => {
      console.error("Customer balances listener error:", err);
      setError(err);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [isDemo, user, storeId, claimsReady]);

  return { data, isLoading, error };
}

/**
 * Store-wide credit wallet ledger (top-ups, sale deductions, overpay credits,
 * adjustments), newest first.
 */
export function useCreditTopups(): QueryResult<CreditTopup[]> {
  const { user, claimsReady } = useAuth();
  const { storeId } = useBusiness();
  const { isDemo } = useDemo();
  const [data, setData] = useState<CreditTopup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isDemo) {
      setData([]);
      setIsLoading(false);
      return;
    }
    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) setIsLoading(false);
      setData([]);
      return;
    }
    const q = query(
      collection(db, "credit_topups"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rows: CreditTopup[] = [];
      snapshot.forEach((docc) => rows.push({ id: docc.id, ...docc.data() } as CreditTopup));
      setData(rows);
      setIsLoading(false);
    }, (err) => {
      console.error("Credit top-ups listener error:", err);
      setError(err);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [isDemo, user, storeId, claimsReady]);

  return { data, isLoading, error };
}

export function useSalesMutations() {
  const { user, claims } = useAuth();
  const { storeId, ownerId } = useBusiness();
  const { effectiveBranchId, canJumpBranch } = useEffectiveBranch();
  const effectiveBranch = canJumpBranch ? effectiveBranchId : claims?.branchId;

  const localAddSale = async (sale: Omit<SaleTransaction, "id">, opts?: { restock?: boolean }) => {
    const restock = !!opts?.restock;
    if (!user || !storeId) {
      throw new Error("Authentication required to record sales. Please sign in.");
    }

    if (!claims?.storeId && !storeId) {
      throw new Error("Store context not loaded. Please refresh and try again.");
    }

    // Store-assignment guard: non-system-admin staff can only sell from their assigned store.
    // The owner is exempt (they may view multiple stores), as are system admins (global).
    const isSystemAdmin = claims?.role === "system_admin";
    const isOwner = ownerId && user.uid === ownerId;
    if (
      !isSystemAdmin &&
      !isOwner &&
      claims?.storeId &&
      claims.storeId !== "PLATFORM" &&
      storeId &&
      claims.storeId !== storeId
    ) {
      throw new Error("You can only record sales for your assigned store. Contact your administrator if this is incorrect.");
    }

    try {
      const batch = writeBatch(db);

      // 1. Create Sale Document
      const saleRef = doc(collection(db, "sales"));
      const rawSaleData = {
        ...sale,
        itemIds: sale.items.filter((i) => i.itemId).map((i) => i.itemId),
        storeId: storeId || claims?.storeId, // CRITICAL: Must include storeId for Firestore rules
        branchId: effectiveBranch || null,
        ownerId: user.uid,
        recordedBy: user.uid,
        recordedByName: user.displayName || user.email || "Staff",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (!rawSaleData.storeId) {
        throw new Error("Unable to determine store. Please refresh the page and try again.");
      }

      const saleData = cleanFirestoreData(rawSaleData);

      // Validate that every product belongs to the same store (pre-flight check to avoid permission-denied)
      for (const item of sale.items) {
        if (item.isOutOfCatalog) continue;
        const productRef = doc(db, "products", item.itemId);
        let productSnap;
        try {
          productSnap = await getDocFromCache(productRef);
        } catch {
          productSnap = await getDoc(productRef);
        }
        if (!productSnap.exists()) {
          throw new Error(`Product not found: ${item.itemId}`);
        }
        const productData = productSnap.data() as { storeId?: string; name?: string; currentStock?: number };
        if (!productData.storeId) {
          throw new Error(`Product ${item.itemId} is missing storeId; cannot update inventory.`);
        }
        if (productData.storeId !== saleData.storeId) {
          throw new Error(`Product ${item.itemId} belongs to a different store (${productData.storeId}).`);
        }
        // Reflect the server-ledger stock guard in the offline/fallback path so
        // the client never oversells when Cloud Functions are unreachable.
        if (!restock) {
          const conversionFactor = item.conversionFactor || 1;
          const needed = item.quantity * conversionFactor;
          const available = Number(productData.currentStock) || 0;
          if (available < needed) {
            throw new Error(`Insufficient stock for ${productData.name || item.itemId}: only ${available} available, ${needed} required.`);
          }
        }
      }

      batch.set(saleRef, saleData);

      // 2. Update Product Inventory and Record Movements
      sale.items.forEach((item) => {
        if (item.isOutOfCatalog) return;
        const productRef = doc(db, "products", item.itemId);

        // Calculate real decrement amount based on unit conversion
        const conversionFactor = item.conversionFactor || 1;
        const deltaAmount = item.quantity * conversionFactor;

        // Apply stock change: sales deduct, returns (credit notes) add back.
        batch.update(productRef, {
          currentStock: increment(restock ? deltaAmount : -deltaAmount),
          updatedAt: new Date().toISOString()
        });

        // Create movement record for history
        const movementRef = doc(collection(db, "movements"));
        const movementData = cleanFirestoreData({
          itemId: item.itemId,
          type: restock ? MovementType.Received : MovementType.Shipped,
          quantity: deltaAmount,
          unitUsed: item.selectedUnit || null,
          reference: restock ? `Return: ${saleRef.id}` : `Sale: ${saleRef.id}`,
          notes: restock
            ? `Returned to stock via ${sale.customerName ? `credit note for ${sale.customerName}` : "credit note"}`
            : `Customer: ${sale.customerName || "Walk-in"}`,
          storeId: saleData.storeId,
          branchId: effectiveBranch || null,
          ownerId: user.uid,
          performedBy: user.uid,
          performedByName: user.displayName || user.email || "Staff",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        batch.set(movementRef, movementData);
      });

      await batch.commit();

      // 3. Trigger Notifications
      await notifyActivity({
        type: restock ? "movement" : "sale",
        category: restock ? "inventory" : "sales",
        severity: "low",
        title: restock ? "Product Returned to Stock" : "New Sale Recorded",
        message: restock
          ? `${saleData.recordedByName} logged a credit-note return (${saleData.totalNgn.toLocaleString()} NGN) for ${saleData.customerName || "Customer"}, stock returned to catalog.`
          : `${saleData.recordedByName} recorded a sale of ${saleData.totalNgn.toLocaleString()} NGN for ${saleData.customerName || "Walk-in Customer"}.`,
        userId: user.uid,
        userEmail: user.email || "",
        storeId: saleData.storeId,
        branchId: saleData.branchId,
        metadata: { saleId: saleRef.id, total: saleData.totalNgn }
      });

      // 4. Only check for low stock on sales (returns replenish, never reduce)
      if (!restock) {
      for (const item of sale.items) {
        if (item.isOutOfCatalog) continue;
        const productRef = doc(db, "products", item.itemId);
        let productSnap;
        try {
          productSnap = await getDocFromCache(productRef);
        } catch {
          productSnap = await getDoc(productRef);
        }
        if (productSnap.exists()) {
          const product = productSnap.data() as { currentStock?: number; reorderPoint?: number; name?: string; unit?: string };
          const currentStock = product.currentStock || 0;
          const reorderPoint = product.reorderPoint || 5; // Fallback to 5 if not set

          if (currentStock <= reorderPoint) {
             await notifyInventoryAlert({
               title: "Low Stock Alert",
               message: `${product.name} is running low (${currentStock} ${product.unit || "units"} remaining). Reorder point is ${reorderPoint}.`,
               userId: user.uid,
               userEmail: user.email || "",
               storeId: saleData.storeId as string,
               branchId: saleData.branchId || undefined,
               metadata: { itemId: item.itemId, currentStock, reorderPoint }
             });
          }
        }
      }
      }

      return { id: saleRef.id };
    } catch (error: unknown) {
      console.error("Failed to record sale:", error);
      const err = error as { code?: string; message?: string };
      if (err.code === "permission-denied") {
        throw new Error("You don't have permission to record sales. Contact your administrator.");
      }
      throw new Error(err.message || "Failed to record sale. Please check your inventory and try again.");
    }
  };

  /** Feature 11: record the sale through the server ledger when online. */
  const addSale = async (sale: Omit<SaleTransaction, "id">, opts?: { restock?: boolean }) => {
    if (!user || !storeId) {
      throw new Error("Authentication required to record sales. Please sign in.");
    }
    const result = await callWithFallback<{ id?: string; saleId?: string }>(
      "recordsale",
      { ...sale, storeId, branchId: effectiveBranch, restock: !!opts?.restock },
      async () => localAddSale(sale, opts)
    );
    return { id: result.saleId ?? result.id };
  };

  const recordDebtPayment = async (payment: { 
    customerPhone: string; 
    customerName: string; 
    amountNgn: number; 
    notes?: string;
    paymentMethod?: string;
  }) => {
    if (!user || !storeId) throw new Error("Authentication required");
    
    const paymentRef = doc(collection(db, "debt_payments"));
    const paymentData = {
      customerPhone: payment.customerPhone,
      customerName: payment.customerName,
      amountNgn: payment.amountNgn,
      ...(payment.notes ? { notes: payment.notes } : {}),
      ...(payment.paymentMethod ? { paymentMethod: payment.paymentMethod } : {}),
      storeId,
      // Normalize branchId to match queries (non-admin listeners expect "none" when no branch)
      branchId: effectiveBranch || "none",
      recordedBy: user.uid,
      recordedByName: user.displayName || user.email?.split("@")[0] || "Staff",
      createdAt: new Date().toISOString(),
    };

    await setDoc(paymentRef, paymentData);
    return paymentRef.id;
  };

  const updateSaleStatus = async (saleId: string, status: "completed" | "pending_pickup" | "picked_up") => {
    if (!user || !storeId) throw new Error("Authentication required");
    
    const saleRef = doc(db, "sales", saleId);
    await updateDoc(saleRef, {
      status,
      updatedAt: new Date().toISOString()
    });
  };

  const importDebtors = async (debtors: Array<Pick<ImportedDebt, "customerName" | "customerPhone" | "amountNgn"> & { notes?: string; source?: "csv" | "manual"; branchId?: string | null }>) => {
    if (!user || !storeId) throw new Error("Authentication required");
    if (debtors.length === 0) return { created: 0, failed: 0 };

    const now = new Date().toISOString();
    const loggedByName = user.displayName || user.email?.split("@")[0] || "Staff";

    // Respect the caller's branch scope: managers only write to their own branch.
    const branchId = canJumpBranch ? effectiveBranchId : (claims?.branchId ?? null);

    // Firestore writeBatch is capped at 500 writes.
    const results = { created: 0, failed: 0 };
    const CHUNK = 400;

    for (let i = 0; i < debtors.length; i += CHUNK) {
      const chunk = debtors.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      for (const d of chunk) {
        const amount = Number(d.amountNgn) || 0;
        if (!d.customerName?.trim()) {
          results.failed++;
          continue;
        }
        const ref = doc(collection(db, "debt_records"));
        const data = cleanFirestoreData({
          customerName: d.customerName.trim(),
          customerPhone: d.customerPhone?.trim() || "",
          amountNgn: amount,
          notes: d.notes || "",
          source: d.source || "csv",
          storeId,
          branchId: d.branchId ?? branchId ?? null,
          ownerId: user.uid,
          recordedBy: user.uid,
          recordedByName: loggedByName,
          createdAt: now,
          updatedAt: now,
        });
        batch.set(ref, data);
      }
      try {
        await batch.commit();
        results.created += chunk.length - chunk.filter((d) => !d.customerName?.trim()).length;
      } catch (err) {
        console.error("Failed to import debtors chunk:", err);
        results.failed += chunk.length;
      }
    }

    return results;
  };

  /**
   * Atomically adjust a customer's store-wide credit balance and append a ledger
   * entry. `deltaNgn` is signed (+N = add credit, -N = deduct). The balance doc
   * for (store, customerPhone) is upserted and never goes negative.
   */
  const adjustCustomerCredit = async (args: {
    customerPhone: string;
    customerName?: string;
    deltaNgn: number;
    type: CreditTopup["type"];
    method?: CreditTopup["method"];
    topupTotalNgn?: number;
    debtClearedNgn?: number;
    branchId?: string | null;
    saleId?: string;
    notes?: string;
  }) => {
    if (!user || !storeId) throw new Error("Authentication required");
    const phone = args.customerPhone?.trim();
    if (!phone || phone.length < 6) throw new Error("A valid customer phone number is required.");
    if (!args.deltaNgn && !args.debtClearedNgn) return;

    const balanceKey = `${storeId}_${phone}`;
    const balanceRef = doc(db, "customer_credits", balanceKey);
    const ledgerRef = doc(collection(db, "credit_topups"));
    const branchId = args.branchId !== undefined ? args.branchId : (canJumpBranch ? effectiveBranchId : (claims?.branchId ?? null));
    const now = new Date().toISOString();
    const loggedByName = user.displayName || user.email?.split("@")[0] || "Staff";

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(balanceRef);
      const current = snap.exists() ? Number(snap.data().balanceNgn) || 0 : 0;
      const next = current + args.deltaNgn;
      const final = Math.max(0, next);

      if (args.deltaNgn !== 0) {
        if (snap.exists()) {
          tx.update(balanceRef, {
            balanceNgn: final,
            customerName: args.customerName?.trim() || snap.data().customerName || "",
            storeId,
            updatedAt: now,
          });
        } else {
          tx.set(balanceRef, {
            customerPhone: phone,
            customerName: args.customerName?.trim() || "Customer",
            balanceNgn: final,
            storeId,
            updatedAt: now,
          });
        }
      }

      tx.set(ledgerRef, {
        customerPhone: phone,
        customerName: args.customerName?.trim() || "Customer",
        amountNgn: args.deltaNgn,
        type: args.type,
        method: args.method || null,
        topupTotalNgn: args.topupTotalNgn ?? null,
        debtClearedNgn: args.debtClearedNgn ?? null,
        storeId,
        branchId,
        saleId: args.saleId || null,
        notes: args.notes || null,
        recordedBy: user.uid,
        recordedByName: loggedByName,
        createdAt: now,
      });
    });

    return balanceRef.id;
  };

  /**
   * Customer tops up their wallet (money given to the store ahead of time).
   * Any existing debt is cleared first: the top-up pays down the customer's
   * outstanding balance before the remainder becomes spendable credit. Returns
   * how much was applied to credit and how much cleared the debt.
   */
  const localTopUpCustomerCredit = async (args: {
    customerPhone: string;
    customerName?: string;
    amountNgn: number;
    notes?: string;
  }): Promise<{ appliedToCredit: number; clearedDebt: number }> => {
    if (!user || !storeId) throw new Error("Authentication required");
    const phone = args.customerPhone?.trim();
    if (!phone || phone.length < 6) throw new Error("A valid customer phone number is required.");
    const amount = Math.abs(Number(args.amountNgn) || 0);
    if (amount <= 0) throw new Error("A top-up amount greater than zero is required.");

    // Outstanding debt = unpaid credit sales + opening debts − payments received.
    // Filtered client-side on storeId queries so no additional composite indexes
    // are required (single-field storeId filters work with default indexes).
    let debt = 0;
    const salesSnap = await getDocs(query(collection(db, "sales"), where("storeId", "==", storeId)));
    salesSnap.forEach((d) => {
      const s = d.data() as SaleTransaction;
      if (s.customerPhone?.trim() === phone && s.isCreditSale) debt += getSaleOutstanding(s);
    });
    const debtsSnap = await getDocs(query(collection(db, "debt_records"), where("storeId", "==", storeId)));
    debtsSnap.forEach((d) => {
      const x = d.data();
      if (x.customerPhone?.trim() === phone) debt += Number(x.amountNgn) || 0;
    });
    const paySnap = await getDocs(query(collection(db, "debt_payments"), where("storeId", "==", storeId)));
    paySnap.forEach((d) => {
      const x = d.data();
      if (x.customerPhone?.trim() === phone) debt -= Number(x.amountNgn) || 0;
    });

    const outstanding = Math.max(0, debt);
    const clearedDebt = Math.min(amount, outstanding);
    const toCredit = amount - clearedDebt;

    if (clearedDebt > 0) {
      await recordDebtPayment({
        customerPhone: phone,
        customerName: args.customerName?.trim() || "Customer",
        amountNgn: clearedDebt,
        paymentMethod: "store_credit",
        notes: args.notes ? `Cleared by store credit top-up: ${args.notes}` : "Cleared by store credit top-up",
      });
    }

    await adjustCustomerCredit({
      customerPhone: phone,
      customerName: args.customerName,
      deltaNgn: toCredit,
      type: "topup",
      method: "manual",
      topupTotalNgn: amount,
      debtClearedNgn: clearedDebt,
      notes: args.notes,
    });

    return { appliedToCredit: toCredit, clearedDebt };
  };

  /** Feature 11: settle top-ups through the server ledger when online. */
  const topUpCustomerCredit = async (args: {
    customerPhone: string;
    customerName?: string;
    amountNgn: number;
    notes?: string;
  }): Promise<{ appliedToCredit: number; clearedDebt: number }> => {
    if (!user || !storeId) throw new Error("Authentication required");
    return callWithFallback(
      "settlecredit",
      { ...args, storeId },
      () => localTopUpCustomerCredit(args)
    );
  };

  /**
   * Deduct `amountNgn` (up to the available balance) to pay for a sale.
   * Returns the amount actually deducted.
   */
  const applyCustomerBalanceToSale = async (args: {
    customerPhone: string;
    customerName?: string;
    amountNgn: number;
    saleId: string;
  }): Promise<number> => {
    if (!user || !storeId) throw new Error("Authentication required");
    const phone = args.customerPhone?.trim();
    if (!phone) throw new Error("A valid customer phone number is required.");
    if (!(args.amountNgn > 0)) return 0;

    const balanceRef = doc(db, "customer_credits", `${storeId}_${phone}`);
    const ledgerRef = doc(collection(db, "credit_topups"));
    const branchId = canJumpBranch ? effectiveBranchId : (claims?.branchId ?? null);
    const now = new Date().toISOString();
    const loggedByName = user.displayName || user.email?.split("@")[0] || "Staff";
    let applied = 0;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(balanceRef);
      const current = snap.exists() ? Number(snap.data().balanceNgn) || 0 : 0;
      applied = Math.min(current, args.amountNgn);
      if (applied <= 0) return;
      const next = current - applied;
      const existingName = snap.exists() ? (snap.data().customerName as string | undefined) : undefined;
      tx.update(balanceRef, {
        balanceNgn: next,
        customerName: args.customerName?.trim() || existingName || "",
        updatedAt: now,
      });
      tx.set(ledgerRef, {
        customerPhone: phone,
        customerName: args.customerName?.trim() || "Customer",
        amountNgn: -applied,
        type: "sale_deduction",
        method: "sale_deduction",
        storeId,
        branchId,
        saleId: args.saleId,
        recordedBy: user.uid,
        recordedByName: loggedByName,
        createdAt: now,
      });
    });

    return applied;
  };

  /**
   * A sale was overpaid (changeGiven > 0) for a known customer; park the excess
   * into their credit balance instead of handing it back as cash.
   */
  const addOverpayCredit = async (args: {
    customerPhone: string;
    customerName?: string;
    amountNgn: number;
    saleId: string;
  }) => {
    if (!(args.amountNgn > 0)) return;
    return adjustCustomerCredit({
      customerPhone: args.customerPhone,
      customerName: args.customerName,
      deltaNgn: Math.abs(Number(args.amountNgn) || 0),
      type: "overpay_credit",
      method: "overpay",
      saleId: args.saleId,
      notes: `Overpayment parked to credit from sale ${args.saleId}`,
    });
  };

  return { addSale, recordDebtPayment, updateSaleStatus, importDebtors, adjustCustomerCredit, topUpCustomerCredit, applyBalanceToSale: applyCustomerBalanceToSale, addOverpayCredit };
}
