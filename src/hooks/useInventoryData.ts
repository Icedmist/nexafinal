import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import type { 
  Item, Category, Supplier, Location, StockMovement, PurchaseOrder, InventoryRequest,
  ItemFilters, StockSummary 
} from "@/types/inventory";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useItems(filters?: ItemFilters): QueryResult<Item[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // CRITICAL: Must wait for claimsReady and storeId to avoid permission denied
    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) {
        setData([]);
        setIsLoading(false);
      }
      return;
    }

    let prodQuery = query(
      collection(db, "products"),
      where("storeId", "==", storeId)
    );

    if (filters?.categoryId) {
      prodQuery = query(prodQuery, where("categoryId", "==", filters.categoryId));
    }
    
    prodQuery = query(prodQuery, orderBy("createdAt", "desc"));

    const isAdmin = claims?.role === "admin" || claims?.role === "system_admin";
    const userBranchId = claims?.branchId;

    const unsubscribe = onSnapshot(prodQuery, (snapshot) => {
      const items: Item[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Item);
      });
      
      let filtered = items;
      
      // For non-admins, restrict to their branch.
      // Items with no branchId (null/undefined) are considered "Global" and visible to everyone.
      if (!isAdmin && userBranchId) {
        filtered = filtered.filter(i => !i.branchId || i.branchId === userBranchId);
      }

      if (filters?.search) {
        const lowerSearch = filters.search.toLowerCase();
        filtered = filtered.filter(i => 
          i.name.toLowerCase().includes(lowerSearch) || 
          i.sku.toLowerCase().includes(lowerSearch)
        );
      }
      if (filters?.status) {
        filtered = filtered.filter(i => {
          const status = i.currentStock === 0 ? "out_of_stock" : i.currentStock <= i.reorderPoint ? "low_stock" : "in_stock";
          return status === filters.status;
        });
      }
      
      setData(filtered);
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Listen Error (Items):", err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, storeId, claimsReady, claims, filters?.categoryId, filters?.status, filters?.search, filters?.locationId]);

  return { data, isLoading, error };
}

export function useItemById(id: string): QueryResult<Item | undefined> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<Item | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId || !id || !claimsReady) {
      if (!claimsReady || !user) setIsLoading(false);
      return;
    }
    
    const q = query(
      collection(db, "products"),
      where("storeId", "==", storeId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const doc = snapshot.docs.find(d => d.id === id);
      if (doc) {
        setData({ id: doc.id, ...doc.data() } as Item);
      } else {
        setData(undefined);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Listen Error (ItemById):", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, storeId, id, claimsReady, claims]);

  return { data, isLoading, error: null };
}

export function useCategories(): QueryResult<Category[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) setIsLoading(false);
      return;
    }
    const q = query(collection(db, "categories"), where("storeId", "==", storeId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Category[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Category));
      setData(items);
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Listen Error (Categories):", err);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, storeId, claimsReady, claims]);

  return { data, isLoading, error: null };
}

export function useLocations(): QueryResult<Location[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) setIsLoading(false);
      return;
    }
    const isAdmin = claims?.role === "admin" || claims?.role === "system_admin";
    const userBranchId = claims?.branchId;

    const locQuery = query(collection(db, "locations"), where("storeId", "==", storeId));
    const unsubscribe = onSnapshot(locQuery, (snapshot) => {
      const items: Location[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Location));
      
      let filtered = items;
      if (!isAdmin && userBranchId) {
        filtered = filtered.filter(l => l.branchId === userBranchId);
      }
      
      setData(filtered);
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Listen Error (Locations):", err);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, storeId, claimsReady, claims]);

  return { data, isLoading, error: null };
}

export function useAllLocations(): QueryResult<Location[]> {
  const { user, claimsReady } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) setIsLoading(false);
      return;
    }

    const locQuery = query(collection(db, "locations"), where("storeId", "==", storeId));
    const unsubscribe = onSnapshot(locQuery, (snapshot) => {
      const items: Location[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Location));
      
      setData(items);
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Listen Error (AllLocations):", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, storeId, claimsReady]);

  return { data, isLoading, error: null };
}

export function useSuppliers(): QueryResult<Supplier[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) setIsLoading(false);
      return;
    }
    const supQuery = query(collection(db, "suppliers"), where("storeId", "==", storeId));
    const unsubscribe = onSnapshot(supQuery, (snapshot) => {
      const items: Supplier[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Supplier));
      setData(items);
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Listen Error (Suppliers):", err);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, storeId, claimsReady, claims]);

  return { data, isLoading, error: null };
}

export function useMovements(count = 20): QueryResult<StockMovement[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) setIsLoading(false);
      return;
    }
    const q = query(
      collection(db, "movements"), 
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc"),
      firestoreLimit(count)
    );
    const isAdmin = claims?.role === "admin" || claims?.role === "system_admin";
    const userBranchId = claims?.branchId;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: StockMovement[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as StockMovement));
      
      let filtered = items;
      
      if (!isAdmin && userBranchId) {
        filtered = filtered.filter(m => m.branchId === userBranchId);
      }
      
      setData(filtered);
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Listen Error (Movements):", err);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, storeId, claimsReady, claims, count]);

  return { data, isLoading, error: null };
}

export function useStockSummary(): QueryResult<StockSummary> {
  const { data: items, isLoading } = useItems();
  const summary = {
    total: items.length,
    inStock: items.filter(i => i.currentStock > i.reorderPoint).length,
    lowStock: items.filter(i => i.currentStock > 0 && i.currentStock <= i.reorderPoint).length,
    outOfStock: items.filter(i => i.currentStock === 0).length,
  };
  return { data: summary, isLoading, error: null };
}

export function usePurchaseOrders(): QueryResult<PurchaseOrder[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) setIsLoading(false);
      return;
    }
    const q = query(collection(db, "purchase_orders"), where("storeId", "==", storeId));
    const isAdmin = claims?.role === "admin" || claims?.role === "system_admin";
    const userBranchId = claims?.branchId;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: PurchaseOrder[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as PurchaseOrder));
      
      let filtered = items;
      if (!isAdmin && userBranchId) {
        filtered = filtered.filter(po => po.branchId === userBranchId);
      }
      
      setData(filtered);
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Listen Error (PurchaseOrders):", err);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, storeId, claimsReady, claims]);

  return { data, isLoading, error: null };
}

export function useRequests(): QueryResult<InventoryRequest[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<InventoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) setIsLoading(false);
      return;
    }
    const q = query(collection(db, "requests"), where("storeId", "==", storeId));
    const isAdmin = claims?.role === "admin" || claims?.role === "system_admin";
    const userBranchId = claims?.branchId;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: InventoryRequest[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as InventoryRequest));
      
      let filtered = items;
      if (!isAdmin && userBranchId) {
        filtered = filtered.filter(r => r.branchId === userBranchId);
      }
      
      setData(filtered);
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Listen Error (Requests):", err);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, storeId, claimsReady, claims]);

  return { data, isLoading, error: null };
}
