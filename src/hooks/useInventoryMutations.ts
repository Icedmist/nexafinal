import { useCallback, useState } from "react";
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, increment, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { notifyActivity } from "@/lib/notification-service";
import type { Item, Supplier, Location, StockMovement, PurchaseOrder, InventoryRequest, Category } from "@/types/inventory";
import { MovementType } from "@/types/inventory";

interface MutationResult<TData> {
  mutate: (data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => void;
  isLoading: boolean;
  error: Error | null;
}

function useFirestoreMutation<TData>(
  mutationFn: (storeId: string, data: TData, userUid: string, claims: any) => Promise<void>
): MutationResult<TData> {
  const { user, claims } = useAuth();
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
        await mutationFn(storeId, data, user.uid, claims);
        opts?.onSuccess?.();
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        opts?.onError?.(e);
      } finally {
        setIsLoading(false);
      }
    },
    [user, storeId, mutationFn, claims]
  );

  return { mutate, isLoading, error };
}

export function useCreateItem() {
  const { user } = useAuth();
  return useFirestoreMutation<Item>(async (storeId, data, uid, claims) => {
    // Use setDoc with the pre-generated ID to ensure consistency between POS and Catalog
    const docRef = doc(db, "products", data.id);
    await setDoc(docRef, {
      ...data,
      storeId,
      branchId: data.branchId !== undefined ? data.branchId : (claims?.branchId || null),
      ownerId: uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await notifyActivity(
      "movement",
      "New Product Added",
      `${data.name} was added to the catalog.`,
      uid,
      user?.email || "unknown",
      storeId,
      claims?.branchId
    );
  });
}

export function useUpdateItem() {
  return useFirestoreMutation<{ id: string; updates: Partial<Item> }>(async (storeId, { id, updates }) => {
    try {
      const docRef = doc(db, "products", id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error updating item:", {
        id,
        updates,
        errorCode: error.code,
        errorMessage: error.message
      });
      throw error;
    }
  });
}

export function useDeleteItem() {
  return useFirestoreMutation<string>(async (storeId, id) => {
    try {
      const docRef = doc(db, "products", id);
      await deleteDoc(docRef);
    } catch (error: any) {
      console.error("Error deleting item:", {
        id,
        errorCode: error.code,
        errorMessage: error.message
      });
      throw error;
    }
  });
}

export function useCreateMovement() {
  const { user } = useAuth();
  return useFirestoreMutation<Omit<StockMovement, "id">>(async (storeId, data, uid, claims) => {
    await addDoc(collection(db, "movements"), { 
      ...data, 
      storeId, 
      branchId: claims?.branchId || null,
      ownerId: uid, 
      performedBy: uid, 
      createdAt: new Date().toISOString() 
    });

    await notifyActivity(
      "movement",
      "Stock Movement",
      `${data.type === MovementType.Received ? "Added" : "Removed"} ${data.quantity} units of product.`,
      uid,
      user?.email || "unknown",
      storeId,
      claims?.branchId
    );
  });
}

export function useCreatePurchaseOrder() {
  return useFirestoreMutation<Omit<PurchaseOrder, "id"> & { isInstant?: boolean }>(async (storeId, data, uid, claims) => {
    const { isInstant, ...poData } = data;
    
    if (isInstant) {
      const batch = writeBatch(db);
      const poRef = doc(collection(db, "purchase_orders"));
      const poId = poRef.id;

      // 1. Create Purchase Order
      batch.set(poRef, {
        ...poData,
        id: poId,
        storeId,
        branchId: claims?.branchId || null,
        ownerId: uid,
        status: "RECEIVED", // Instant is automatically received
        createdAt: new Date().toISOString()
      });

      // 2. Update stock and create movements
      for (const item of poData.items) {
        const itemRef = doc(db, "products", item.itemId);
        batch.update(itemRef, {
          currentStock: increment(item.quantityOrdered),
          updatedAt: new Date().toISOString()
        });

        const movementRef = doc(collection(db, "movements"));
        batch.set(movementRef, {
          itemId: item.itemId,
          type: MovementType.Received,
          quantity: item.quantityOrdered,
          reason: `Restock Order ${poData.orderNumber}`,
          referenceId: poId,
          storeId,
          branchId: claims?.branchId || null,
          ownerId: uid,
          createdAt: new Date().toISOString()
        });
      }

      await batch.commit();
    } else {
      await addDoc(collection(db, "purchase_orders"), { 
        ...poData, 
        storeId, 
        branchId: claims?.branchId || null,
        ownerId: uid, 
        createdAt: new Date().toISOString() 
      });
    }
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
  return useFirestoreMutation<Omit<InventoryRequest, "id">>(async (storeId, data, uid, claims) => {
    await addDoc(collection(db, "requests"), { 
      ...data, 
      storeId, 
      branchId: claims?.branchId || null,
      ownerId: uid, 
      requestorId: uid, 
      createdAt: new Date().toISOString() 
    });
  });
}

export function useUpdateRequest() {
  return useFirestoreMutation<{ id: string; updates: Partial<InventoryRequest> }>(async (storeId, { id, updates }) => {
    await updateDoc(doc(db, "requests", id), updates);
  });
}

export function useCreateLocation() {
  return useFirestoreMutation<Omit<Location, "id">>(async (storeId, data, uid, claims) => {
    await addDoc(collection(db, "locations"), { 
      ...data, 
      storeId, 
      branchId: claims?.branchId || null,
      ownerId: uid 
    });
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
