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
  const { user } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !storeId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    let q = query(
      collection(db, "products"),
      where("storeId", "==", storeId)
    );

    if (filters?.categoryId) {
      q = query(q, where("categoryId", "==", filters.categoryId));
    }
    
    q = query(q, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Item[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Item);
      });
      
      let filtered = items;
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
      console.error(err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, storeId, filters?.categoryId, filters?.status, filters?.search, filters?.locationId]);

  return { data, isLoading, error };
}

export function useItemById(id: string): QueryResult<Item | undefined> {
  const { user } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<Item | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !ownerId || !id) {
      setIsLoading(false);
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
    });

    return () => unsubscribe();
  }, [user, storeId, id]);

  return { data, isLoading, error: null };
}

export function useCategories(): QueryResult<Category[]> {
  const { user } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId) {
      setIsLoading(false);
      return;
    }
    const q = query(collection(db, "categories"), where("storeId", "==", storeId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Category[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Category));
      setData(items);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, storeId]);

  return { data, isLoading, error: null };
}

export function useLocations(): QueryResult<Location[]> {
  const { user } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId) {
      setIsLoading(false);
      return;
    }
    const q = query(collection(db, "locations"), where("storeId", "==", storeId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Location[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Location));
      setData(items);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, storeId]);

  return { data, isLoading, error: null };
}

export function useSuppliers(): QueryResult<Supplier[]> {
  const { user } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId) { setIsLoading(false); return; }
    const q = query(collection(db, "suppliers"), where("storeId", "==", storeId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Supplier[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Supplier));
      setData(items);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, storeId]);

  return { data, isLoading, error: null };
}

export function useMovements(count = 20): QueryResult<StockMovement[]> {
  const { user } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId) { setIsLoading(false); return; }
    const q = query(
      collection(db, "movements"), 
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc"),
      firestoreLimit(count)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: StockMovement[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as StockMovement));
      setData(items);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, storeId, count]);

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
  const { user } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId) { setIsLoading(false); return; }
    const q = query(collection(db, "purchase_orders"), where("storeId", "==", storeId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: PurchaseOrder[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as PurchaseOrder));
      setData(items);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, storeId]);

  return { data, isLoading, error: null };
}

export function useRequests(): QueryResult<InventoryRequest[]> {
  const { user } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<InventoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId) { setIsLoading(false); return; }
    const q = query(collection(db, "requests"), where("storeId", "==", storeId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: InventoryRequest[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as InventoryRequest));
      setData(items);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, storeId]);

  return { data, isLoading, error: null };
}
