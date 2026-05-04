import { useCallback, useState } from "react";
import { collection, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import type { Item, Supplier, Location, StockMovement, PurchaseOrder, InventoryRequest, Category } from "@/types/inventory";

interface MutationResult<TData> {
  mutate: (data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => void;
  isLoading: boolean;
  error: Error | null;
}

function useFirestoreMutation<TData>(
  mutationFn: (userUid: string, data: TData) => Promise<void>
): MutationResult<TData> {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
      if (!user) {
        opts?.onError?.(new Error("Not authenticated"));
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        await mutationFn(user.uid, data);
        opts?.onSuccess?.();
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        opts?.onError?.(e);
      } finally {
        setIsLoading(false);
      }
    },
    [user, mutationFn]
  );

  return { mutate, isLoading, error };
}

export function useCreateItem() {
  return useFirestoreMutation<Item>(async (uid, data) => {
    await addDoc(collection(db, "products"), {
      ...data,
      ownerId: uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
}

export function useUpdateItem() {
  return useFirestoreMutation<{ id: string; updates: Partial<Item> }>(async (uid, { id, updates }) => {
    const docRef = doc(db, "products", id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  });
}

export function useDeleteItem() {
  return useFirestoreMutation<string>(async (uid, id) => {
    const docRef = doc(db, "products", id);
    await deleteDoc(docRef);
  });
}

// Stubs for remaining mutations (to be connected to Firestore next)
export function useCreateMovement() { return useFirestoreMutation<StockMovement>(async () => {}); }
export function useCreatePurchaseOrder() { return useFirestoreMutation<PurchaseOrder>(async () => {}); }
export function useUpdatePurchaseOrder() { return useFirestoreMutation<{ id: string; updates: Partial<PurchaseOrder> }>(async () => {}); }
export function useDeletePurchaseOrder() { return useFirestoreMutation<string>(async () => {}); }
export function useCreateSupplier() { return useFirestoreMutation<Supplier>(async () => {}); }
export function useUpdateSupplier() { return useFirestoreMutation<{ id: string; updates: Partial<Supplier> }>(async () => {}); }
export function useDeleteSupplier() { return useFirestoreMutation<string>(async () => {}); }
export function useCreateRequest() { return useFirestoreMutation<InventoryRequest>(async () => {}); }
export function useUpdateRequest() { return useFirestoreMutation<{ id: string; updates: Partial<InventoryRequest> }>(async () => {}); }
export function useCreateLocation() { return useFirestoreMutation<Location>(async () => {}); }
export function useUpdateLocation() { return useFirestoreMutation<{ id: string; updates: Partial<Location> }>(async () => {}); }
export function useDeleteLocation() { return useFirestoreMutation<string>(async () => {}); }
export function useCreateCategory() { return useFirestoreMutation<Category>(async () => {}); }
export function useUpdateCategory() { return useFirestoreMutation<{ id: string; updates: Partial<Category> }>(async () => {}); }
export function useDeleteCategory() { return useFirestoreMutation<string>(async () => {}); }
