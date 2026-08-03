import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useDemo } from "@/hooks/useDemo";
import { useEffectiveBranch } from "@/hooks/useEffectiveBranch";
import { cleanFirestoreData } from "@/utils/cleanFirestoreData";
import type { SalesForm, FormTransactionType } from "@/types/inventory";
import { notifyActivity } from "@/lib/notification-service";

interface QueryResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
}

/** Generate a readable form number, e.g. FORM-20260803-0007. */
export function nextFormNumber(existing: SalesForm[], type: FormTransactionType): string {
  const prefixMap: Record<FormTransactionType, string> = {
    receipt: "RCP",
    proforma: "PRF",
    delivery_note: "DLV",
    credit_note: "CRN",
  };
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `${prefixMap[type]}-${today}`;
  const count = existing.filter((f) => f.formNumber.startsWith(prefix)).length + 1;
  return `${prefix}-${String(count).padStart(4, "0")}`;
}

/**
 * Saved sales forms for the store, newest first. Used by the forms page to list,
 * reopen, and reprint documents.
 */
export function useSalesForms(): QueryResult<SalesForm> {
  const { user, claimsReady } = useAuth();
  const { storeId } = useBusiness();
  const { isDemo } = useDemo();
  const [data, setData] = useState<SalesForm[]>([]);
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
      collection(db, "sales_forms"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rows: SalesForm[] = [];
      snapshot.forEach((doc) => rows.push({ id: doc.id, ...doc.data() } as SalesForm));
      setData(rows);
      setIsLoading(false);
    }, (err) => {
      console.error("Sales forms listener error:", err);
      setError(err);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [isDemo, user, storeId, claimsReady]);

  return { data, isLoading, error };
}

export function useSalesFormMutations() {
  const { user, claims } = useAuth();
  const { storeId, ownerId } = useBusiness();
  const { effectiveBranchId, canJumpBranch } = useEffectiveBranch();
  const effectiveBranch = canJumpBranch ? effectiveBranchId : claims?.branchId;

  /** Create a new form, then finalize/update in place. Returns the saved form. */
  const saveForm = async (form: Omit<SalesForm, "id" | "storeId" | "branchId" | "recordedBy" | "recordedByName" | "createdAt" | "updatedAt">): Promise<SalesForm> => {
    if (!user || !storeId) throw new Error("Authentication required to save forms.");
    const formRef = doc(collection(db, "sales_forms"));
    const now = new Date().toISOString();
    const data: SalesForm = {
      ...form,
      storeId,
      branchId: effectiveBranch || null,
      recordedBy: user.uid,
      recordedByName: user.displayName || user.email?.split("@")[0] || "Staff",
      createdAt: now,
      updatedAt: now,
    } as SalesForm;

    const cleaned = cleanFirestoreData({
      id: formRef.id,
      storeId: data.storeId,
      branchId: data.branchId,
      formNumber: data.formNumber,
      formType: data.formType,
      customerName: data.customerName ?? null,
      customerPhone: data.customerPhone ?? null,
      customerEmail: data.customerEmail ?? null,
      items: data.items,
      subtotalNgn: data.subtotalNgn,
      discountAmountNgn: data.discountAmountNgn ?? null,
      taxRate: data.taxRate ?? null,
      taxAmountNgn: data.taxAmountNgn ?? null,
      totalNgn: data.totalNgn,
      notes: data.notes ?? null,
      status: data.status,
      recordedBy: data.recordedBy,
      recordedByName: data.recordedByName,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });

    await setDoc(formRef, cleaned);
    return { ...data, id: formRef.id };
  };

  /** Update an existing form's contents (reopen → edit → save). */
  const updateForm = async (formId: string, updates: Partial<Omit<SalesForm, "id" | "storeId" | "createdAt">>) => {
    if (!user || !storeId) throw new Error("Authentication required to update forms.");
    const cleaned = cleanFirestoreData({ ...updates, updatedAt: new Date().toISOString() });
    await updateDoc(doc(db, "sales_forms", formId), cleaned);
  };

  /** Permanently delete a form document. */
  const deleteForm = async (formId: string) => {
    if (!user || !storeId) throw new Error("Authentication required.");
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "sales_forms", formId));
  };

  /** Log a form activity entry (shared helper). */
  const logFormActivity = async (kind: "created" | "updated" | "deleted", form: { formNumber: string; formType: FormTransactionType; totalNgn: number }) => {
    try {
      await notifyActivity({
        type: "form",
        category: "sales",
        severity: "low",
        title: `Form ${form.formNumber}`,
        message: `${form.formNumber} (${form.formType}) ${kind}.`,
        userId: user?.uid || "unknown",
        userEmail: user?.email || "unknown",
        storeId: (storeId || claims?.storeId) as string,
        branchId: claims?.branchId,
        metadata: { formNumber: form.formNumber, formType: form.formType, total: form.totalNgn },
      });
    } catch (err) {
      console.warn("Failed to log form activity:", err);
    }
  };

  /** Bulk delete used for the list page. */
  const bulkDeleteForms = async (ids: string[]) => {
    if (!user || !storeId) throw new Error("Authentication required.");
    if (ids.length === 0) return;
    const batch = writeBatch(db);
    ids.forEach((id) => batch.delete(doc(db, "sales_forms", id)));
    await batch.commit();
  };

  /** Fetch all form numbers for a store (used to derive the next number). */
  const listFormNumbers = async (): Promise<string[]> => {
    if (!user || !storeId) return [];
    const q = query(collection(db, "sales_forms"), where("storeId", "==", storeId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => (d.data().formNumber as string) || "");
  };

  return { saveForm, updateForm, deleteForm, bulkDeleteForms, logFormActivity, listFormNumbers };
}
