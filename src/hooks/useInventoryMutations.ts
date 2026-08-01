import { useCallback, useState } from "react";
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, increment, getDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { notifyActivity } from "@/lib/notification-service";
import { cleanFirestoreData } from "@/utils/cleanFirestoreData";
import type { Item, Supplier, Location, StockMovement, PurchaseOrder, InventoryRequest, Category } from "@/types/inventory";
import { MovementType } from "@/types/inventory";
import type { Refund } from "@/types/finance";

interface MutationResult<TData> {
  mutate: (data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => void;
  mutateAsync: (data: TData) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

function useFirestoreMutation<TData>(
  mutationFn: (storeId: string, data: TData, user: User, claims: any) => Promise<void>
): MutationResult<TData> {
  const { user, claims } = useAuth();
  const { storeId } = useBusiness();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(
    async (data: TData): Promise<void> => {
      if (!user || !storeId) throw new Error("Not authenticated");
      const cleanedData = cleanFirestoreData(data);
      await mutationFn(storeId, cleanedData, user, claims);
    },
    [user, storeId, mutationFn, claims]
  );

  const mutate = useCallback(
    async (data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
      setIsLoading(true);
      setError(null);
      try {
        await run(data);
        opts?.onSuccess?.();
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        opts?.onError?.(e);
      } finally {
        setIsLoading(false);
      }
    },
    [run]
  );

  const mutateAsync = useCallback(
    async (data: TData): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        await run(data);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [run]
  );

  return { mutate, mutateAsync, isLoading, error };
}

export function useCreateItem() {
  const { user } = useAuth();
  return useFirestoreMutation<Item>(async (storeId, data, user, claims) => {
    // Use setDoc with the pre-generated ID to ensure consistency between POS and Catalog
    const docRef = doc(db, "products", data.id);
    const cleaned = cleanFirestoreData({
      ...data,
      storeId,
      branchId: data.branchId !== undefined ? data.branchId : (claims?.branchId || null),
      ownerId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, cleaned);

    await notifyActivity({
      type: "movement",
      category: "inventory",
      severity: "low",
      title: "New Product Added",
      message: `${data.name} was added to the catalog.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { itemId: data.id, itemName: data.name }
    });
  });
}

/**
 * Bulk-creates items using Firestore writeBatch (max 500 per batch).
 * Returns a promise that resolves with { created, failed } counts.
 */
export function useBatchCreateItems() {
  const { user, claims } = useAuth();
  const { storeId } = useBusiness();
  const [isLoading, setIsLoading] = useState(false);

  const batchCreate = useCallback(
    async (items: Item[]): Promise<{ created: number; failed: number }> => {
      if (!user || !storeId) throw new Error("Not authenticated");

      let created = 0;
      let failed = 0;
      const CHUNK = 500;

      for (let i = 0; i < items.length; i += CHUNK) {
        const chunk = items.slice(i, i + CHUNK);
        const batch = writeBatch(db);
        const batchMeta: { id: string; name: string }[] = [];

        for (const item of chunk) {
          const cleaned = cleanFirestoreData({
            ...item,
            storeId,
            branchId: item.branchId !== undefined ? item.branchId : (claims?.branchId || null),
            ownerId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          batch.set(doc(db, "products", item.id), cleaned);
          batchMeta.push({ id: item.id, name: item.name });
        }

        try {
          await batch.commit();
          created += chunk.length;
        } catch (err) {
          console.error("Batch write failed for chunk starting at", i, err);
          failed += chunk.length;
        }
      }

      return { created, failed };
    },
    [user, storeId, claims]
  );

  return { batchCreate, isLoading };
}

export function useUpdateItem() {
  return useFirestoreMutation<{ id: string; updates: Partial<Item> }>(async (storeId, { id, updates }, user, claims) => {
    try {
      const docRef = doc(db, "products", id);
      const cleanedUpdates = cleanFirestoreData({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(docRef, cleanedUpdates);

      await notifyActivity({
        type: "item_update",
        category: "inventory",
        severity: "low",
        title: "Product Updated",
        message: `Product details for ${id} were updated.`,
        userId: user.uid,
        userEmail: user.email || "unknown",
        storeId,
        branchId: claims?.branchId,
        metadata: { itemId: id, updates: Object.keys(updates) }
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
  return useFirestoreMutation<string>(async (storeId, id, user, claims) => {
    try {
      const docRef = doc(db, "products", id);
      await deleteDoc(docRef);

      await notifyActivity({
        type: "item_delete",
        category: "inventory",
        severity: "medium",
        title: "Product Deleted",
        message: `A product was removed from the catalog.`,
        userId: user.uid,
        userEmail: user.email || "unknown",
        storeId,
        branchId: claims?.branchId,
        metadata: { itemId: id }
      });
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
  return useFirestoreMutation<Omit<StockMovement, "id">>(async (storeId, data, user, claims) => {
    await addDoc(collection(db, "movements"), { 
      ...data, 
      storeId, 
      branchId: claims?.branchId || null,
      ownerId: user.uid, 
      performedBy: user.uid, 
      createdAt: new Date().toISOString() 
    });

    await notifyActivity({
      type: "movement",
      category: "inventory",
      severity: "low",
      title: "Stock Movement",
      message: `${data.type === MovementType.Received ? "Added" : "Removed"} ${data.quantity} units of product.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { movementType: data.type, quantity: data.quantity, reason: data.reference }
    });
  });
}

export function useCreatePurchaseOrder() {
  return useFirestoreMutation<Omit<PurchaseOrder, "id"> & { isInstant?: boolean }>(async (storeId, data, user, claims) => {
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
        ownerId: user.uid,
        status: "RECEIVED", // Instant is automatically received
        createdAt: new Date().toISOString()
      });

      // 2. Update stock and create movements
      for (const item of poData.items) {
        const itemRef = doc(db, "products", item.itemId);
        
        // Update stock, cost price, and selling price
        const productUpdates: any = {
          currentStock: increment(item.quantityOrdered),
          updatedAt: new Date().toISOString()
        };

        if (item.unitCost > 0) productUpdates.costPrice = item.unitCost;
        if (item.sellingPrice && item.sellingPrice > 0) productUpdates.sellingPrice = item.sellingPrice;

        batch.update(itemRef, productUpdates);

        const movementRef = doc(collection(db, "movements"));
        batch.set(movementRef, {
          itemId: item.itemId,
          type: MovementType.Received,
          quantity: item.quantityOrdered,
          reason: `Restock Order ${poData.orderNumber}`,
          referenceId: poId,
          storeId,
          branchId: claims?.branchId || null,
          ownerId: user.uid,
          createdAt: new Date().toISOString()
        });
      }

      await batch.commit();
    } else {
      await addDoc(collection(db, "purchase_orders"), { 
        ...poData, 
        storeId, 
        branchId: claims?.branchId || null,
        ownerId: user.uid, 
        createdAt: new Date().toISOString() 
      });
    }

    await notifyActivity({
      type: "purchase_order_created",
      category: "procurement",
      severity: "medium",
      title: "New Purchase Order",
      message: `Order ${poData.orderNumber} was created for supplier ${poData.supplierId}.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { orderNumber: poData.orderNumber, supplierId: poData.supplierId, isInstant },
      actionUrl: "/app/restock",
      actionLabel: "View Order"
    });
  });
}

export function useUpdatePurchaseOrder() {
  return useFirestoreMutation<{ id: string; updates: Partial<PurchaseOrder> }>(async (storeId, { id, updates }, user, claims) => {
    await updateDoc(doc(db, "purchase_orders", id), { ...updates, updatedAt: new Date().toISOString() });

    await notifyActivity({
      type: "purchase_order_update",
      category: "procurement",
      severity: "low",
      title: "Purchase Order Updated",
      message: `Purchase order ${id} was updated.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { orderId: id, updates: Object.keys(updates) }
    });
  });
}

export function useDeletePurchaseOrder() {
  return useFirestoreMutation<string>(async (storeId, id, user, claims) => {
    await deleteDoc(doc(db, "purchase_orders", id));

    await notifyActivity({
      type: "purchase_order_delete",
      category: "procurement",
      severity: "medium",
      title: "Purchase Order Deleted",
      message: `Purchase order ${id} was deleted.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { orderId: id }
    });
  });
}

export function useCreateSupplier() {
  return useFirestoreMutation<Omit<Supplier, "id">>(async (storeId, data, user, claims) => {
    await addDoc(collection(db, "suppliers"), { ...data, storeId, ownerId: user.uid, createdAt: new Date().toISOString() });

    await notifyActivity({
      type: "supplier_created",
      category: "procurement",
      severity: "low",
      title: "New Supplier Added",
      message: `${data.name} was added as a supplier.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { supplierName: data.name }
    });
  });
}

export function useUpdateSupplier() {
  return useFirestoreMutation<{ id: string; updates: Partial<Supplier> }>(async (storeId, { id, updates }, user, claims) => {
    await updateDoc(doc(db, "suppliers", id), updates);

    await notifyActivity({
      type: "supplier_update",
      category: "procurement",
      severity: "low",
      title: "Supplier Updated",
      message: `Supplier details for ${id} were updated.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { supplierId: id }
    });
  });
}

export function useDeleteSupplier() {
  return useFirestoreMutation<string>(async (storeId, id, user, claims) => {
    await deleteDoc(doc(db, "suppliers", id));

    await notifyActivity({
      type: "supplier_delete",
      category: "procurement",
      severity: "medium",
      title: "Supplier Removed",
      message: `A supplier was removed from the system.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { supplierId: id }
    });
  });
}

export function useCreateRequest() {
  return useFirestoreMutation<Omit<InventoryRequest, "id">>(async (storeId, data, user, claims) => {
    await addDoc(collection(db, "requests"), { 
      ...data, 
      storeId, 
      branchId: claims?.branchId || null,
      ownerId: user.uid, 
      requestedByUid: user.uid, 
      createdAt: new Date().toISOString() 
    });

    await notifyActivity({
      type: "inventory_request",
      category: "procurement",
      severity: "medium",
      title: "New Inventory Request",
      message: `${data.requestedBy} submitted a new request: ${data.title}`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { requestTitle: data.title, requestedBy: data.requestedBy },
      actionUrl: "/app/requests",
      actionLabel: "Review Request"
    });
  });
}

export function useUpdateRequest() {
  return useFirestoreMutation<{ id: string; updates: Partial<InventoryRequest> }>(async (storeId, { id, updates }, user, claims) => {
    await updateDoc(doc(db, "requests", id), updates);

    await notifyActivity({
      type: "inventory_request_update",
      category: "procurement",
      severity: "low",
      title: "Inventory Request Updated",
      message: `An inventory request was updated.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { requestId: id, updates: Object.keys(updates) }
    });
  });
}

export function useCreateLocation() {
  return useFirestoreMutation<Omit<Location, "id">>(async (storeId, data, user, claims) => {
    await addDoc(collection(db, "locations"), { 
      ...data, 
      storeId, 
      branchId: claims?.branchId || null,
      ownerId: user.uid 
    });

    await notifyActivity({
      type: "location_created",
      category: "inventory",
      severity: "low",
      title: "New Location Added",
      message: `Location ${data.name} was created.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { locationName: data.name }
    });
  });
}

export function useUpdateLocation() {
  return useFirestoreMutation<{ id: string; updates: Partial<Location> }>(async (storeId, { id, updates }, user, claims) => {
    await updateDoc(doc(db, "locations", id), updates);

    await notifyActivity({
      type: "location_update",
      category: "inventory",
      severity: "low",
      title: "Location Updated",
      message: `Details for location ${id} were updated.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { locationId: id }
    });
  });
}

export function useDeleteLocation() {
  return useFirestoreMutation<string>(async (storeId, id, user, claims) => {
    await deleteDoc(doc(db, "locations", id));

    await notifyActivity({
      type: "location_delete",
      category: "inventory",
      severity: "medium",
      title: "Location Deleted",
      message: `A storage location was removed.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { locationId: id }
    });
  });
}

export function useCreateCategory() {
  return useFirestoreMutation<Omit<Category, "id">>(async (storeId, data, user, claims) => {
    await addDoc(collection(db, "categories"), { ...data, storeId, ownerId: user.uid });

    await notifyActivity({
      type: "category_created",
      category: "inventory",
      severity: "low",
      title: "New Category Added",
      message: `Category ${data.name} was created.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { categoryName: data.name }
    });
  });
}

export function useUpdateCategory() {
  return useFirestoreMutation<{ id: string; updates: Partial<Category> }>(async (storeId, { id, updates }, user, claims) => {
    await updateDoc(doc(db, "categories", id), updates);

    await notifyActivity({
      type: "category_update",
      category: "inventory",
      severity: "low",
      title: "Category Updated",
      message: `Details for category ${id} were updated.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { categoryId: id }
    });
  });
}

export function useDeleteCategory() {
  return useFirestoreMutation<string>(async (storeId, id, user, claims) => {
    await deleteDoc(doc(db, "categories", id));

    await notifyActivity({
      type: "category_delete",
      category: "inventory",
      severity: "medium",
      title: "Category Deleted",
      message: `A product category was removed.`,
      userId: user.uid,
      userEmail: user.email || "unknown",
      storeId,
      branchId: claims?.branchId,
      metadata: { categoryId: id }
    });
  });
}

export function useCreateRefund() {
  const { user, claims } = useAuth();
  const { storeId } = useBusiness();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (data: Omit<Refund, "id">, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
      if (!user || !storeId) {
        opts?.onError?.(new Error("Not authenticated"));
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const batch = writeBatch(db);
        const refundRef = doc(collection(db, "refunds"));
        const conversionFactor = data.conversionFactor || 1;
        const incrementAmount = data.quantity * conversionFactor;

        const payload: Record<string, unknown> = {
          ...data,
          storeId,
          branchId: claims?.branchId || null,
          ownerId: user.uid,
          recordedBy: user.uid,
          recordedByName: user.displayName || user.email || "Staff",
        };
        Object.keys(payload).forEach((key) => {
          if (payload[key] === undefined) delete payload[key];
        });

        batch.set(refundRef, payload);

        const productRef = doc(db, "products", data.itemId);
        batch.update(productRef, {
          currentStock: increment(incrementAmount),
          updatedAt: new Date().toISOString(),
        });

        const movementRef = doc(collection(db, "movements"));
        batch.set(movementRef, {
          itemId: data.itemId,
          type: "received",
          quantity: incrementAmount,
          unitUsed: data.selectedUnit || null,
          reference: `Refund: ${refundRef.id}`,
          notes: `Returned from Sale ${data.saleId}. Reason: ${data.reason}${data.notes ? ` - ${data.notes}` : ""}`,
          storeId,
          branchId: claims?.branchId || null,
          ownerId: user.uid,
          performedBy: user.uid,
          performedByName: user.displayName || user.email || "Staff",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const saleRef = doc(db, "sales", data.saleId);
        batch.update(saleRef, { hasRefund: true, updatedAt: new Date().toISOString() });

        await batch.commit();

        await notifyActivity({
          type: "movement",
          category: "inventory",
          severity: "low",
          title: "Product Refunded",
          message: `${data.quantity} ${data.selectedUnit || "units"} of ${data.itemName} refunded.`,
          userId: user.uid,
          userEmail: user.email || "",
          storeId,
          branchId: claims?.branchId || undefined,
          metadata: { refundId: refundRef.id, itemId: data.itemId, qty: data.quantity },
        });

        opts?.onSuccess?.();
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        opts?.onError?.(e);
      } finally {
        setIsLoading(false);
      }
    },
    [user, storeId, claims]
  );

  return { mutate, isLoading, error };
}
