import { useCallback, useState } from "react";
import { collection, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import type { Item, Supplier, Location, StockMovement, PurchaseOrder, InventoryRequest, Category } from "@/types/inventory";

interface MutationResult<TData> {
  mutate: (data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => void;
  isLoading: boolean;
  error: Error | null;
}

function useFirestoreMutation<TData>(
  mutationFn: (storeId: string, data: TData, userUid: string) => Promise<void>
): MutationResult<TData> {
  const { user } = useAuth();
  const { storeId } = useBusiness();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
      if (!user || !storeId) {
        opts?.onError?.(new Error("Not authenticated"));
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        await mutationFn(storeId, data, user.uid);
        opts?.onSuccess?.();
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        opts?.onError?.(e);
      } finally {
        setIsLoading(false);
      }
    },
    [user, storeId, mutationFn]
  );

  return { mutate, isLoading, error };
}

export function useCreateItem() {
  return useFirestoreMutation<Item>(async (storeId, data, uid) => {
    await addDoc(collection(db, "products"), {
      ...data,
      storeId,
      ownerId: uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
}

export function useUpdateItem() {
  return useFirestoreMutation<{ id: string; updates: Partial<Item> }>(async (storeId, { id, updates }) => {
    const docRef = doc(db, "products", id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  });
}

export function useDeleteItem() {
  return useFirestoreMutation<string>(async (storeId, id) => {
    const docRef = doc(db, "products", id);
    await deleteDoc(docRef);
  });
}

export function useCreateMovement() {
  return useFirestoreMutation<Omit<StockMovement, "id">>(async (storeId, data, uid) => {
    await addDoc(collection(db, "movements"), { ...data, storeId, ownerId: uid, performedBy: uid, createdAt: new Date().toISOString() });
  });
}

export function useCreatePurchaseOrder() {
  return useFirestoreMutation<Omit<PurchaseOrder, "id">>(async (storeId, data, uid) => {
    await addDoc(collection(db, "purchase_orders"), { ...data, storeId, ownerId: uid, createdAt: new Date().toISOString() });
  });
}

export function useUpdatePurchaseOrder() {
  return useFirestoreMutation<{ id: string; updates: Partial<PurchaseOrder> }>(async (storeId, { id, updates }) => {
    await updateDoc(doc(db, "purchase_orders", id), { ...updates, updatedAt: new Date().toISOString() });
  });
}

export function useDeletePurchaseOrder() {
  return useFirestoreMutation<string>(async (storeId, id) => {
    await deleteDoc(doc(db, "purchase_orders", id));
  });
}

export function useCreateSupplier() {
  return useFirestoreMutation<Omit<Supplier, "id">>(async (storeId, data, uid) => {
    await addDoc(collection(db, "suppliers"), { ...data, storeId, ownerId: uid, createdAt: new Date().toISOString() });
  });
}

export function useUpdateSupplier() {
  return useFirestoreMutation<{ id: string; updates: Partial<Supplier> }>(async (storeId, { id, updates }) => {
    await updateDoc(doc(db, "suppliers", id), updates);
  });
}

export function useDeleteSupplier() {
  return useFirestoreMutation<string>(async (storeId, id) => {
    await deleteDoc(doc(db, "suppliers", id));
  });
}

export function useCreateRequest() {
  return useFirestoreMutation<Omit<InventoryRequest, "id">>(async (storeId, data, uid) => {
    await addDoc(collection(db, "requests"), { ...data, storeId, ownerId: uid, requestorId: uid, createdAt: new Date().toISOString() });
  });
}

export function useUpdateRequest() {
  return useFirestoreMutation<{ id: string; updates: Partial<InventoryRequest> }>(async (storeId, { id, updates }) => {
    await updateDoc(doc(db, "requests", id), updates);
  });
}

export function useCreateLocation() {
  return useFirestoreMutation<Omit<Location, "id">>(async (storeId, data, uid) => {
    await addDoc(collection(db, "locations"), { ...data, storeId, ownerId: uid });
  });
}

export function useUpdateLocation() {
  return useFirestoreMutation<{ id: string; updates: Partial<Location> }>(async (storeId, { id, updates }) => {
    await updateDoc(doc(db, "locations", id), updates);
  });
}

export function useDeleteLocation() {
  return useFirestoreMutation<string>(async (storeId, id) => {
    await deleteDoc(doc(db, "locations", id));
  });
}

export function useCreateCategory() {
  return useFirestoreMutation<Omit<Category, "id">>(async (storeId, data, uid) => {
    await addDoc(collection(db, "categories"), { ...data, storeId, ownerId: uid });
  });
}

export function useUpdateCategory() {
  return useFirestoreMutation<{ id: string; updates: Partial<Category> }>(async (storeId, { id, updates }) => {
    await updateDoc(doc(db, "categories", id), updates);
  });
}

export function useDeleteCategory() {
  return useFirestoreMutation<string>(async (storeId, id) => {
    await deleteDoc(doc(db, "categories", id));
  });
}
