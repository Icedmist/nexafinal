import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import type { Item, Category, Supplier, Location, StockMovement, PurchaseOrder, InventoryRequest } from "@/types/inventory";
import type { ItemFilters, StockSummary } from "@/lib/demo-store";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useItems(filters?: ItemFilters): QueryResult<Item[]> {
  const { user } = useAuth();
  const [data, setData] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setData([]);
      setIsLoading(false);
      return;
    }

    let q = query(
      collection(db, "products"),
      where("ownerId", "==", user.uid)
    );

    if (filters?.categoryId) {
      q = query(q, where("categoryId", "==", filters.categoryId));
    }
    
    // Sort logic requires composite indexes which we created
    q = query(q, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Item[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Item);
      });
      
      // Client-side filter for search and status since Firestore has limitations
      let filtered = items;
      if (filters?.search) {
        const lowerSearch = filters.search.toLowerCase();
        filtered = filtered.filter(i => 
          i.title.toLowerCase().includes(lowerSearch) || 
          i.sku.toLowerCase().includes(lowerSearch)
        );
      }
      if (filters?.status) {
        filtered = filtered.filter(i => i.stockStatus === filters.status);
      }
      
      setData(filtered);
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, filters?.categoryId, filters?.status, filters?.search, filters?.locationId]);

  return { data, isLoading, error };
}

export function useItemById(id: string): QueryResult<Item | undefined> {
  const { user } = useAuth();
  const [data, setData] = useState<Item | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) {
      setIsLoading(false);
      return;
    }
    
    const q = query(
      collection(db, "products"),
      where("ownerId", "==", user.uid)
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
  }, [user, id]);

  return { data, isLoading, error: null };
}

export function useCategories(): QueryResult<Category[]> {
  const { user } = useAuth();
  const [data, setData] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const q = query(collection(db, "categories"), where("ownerId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Category[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Category));
      setData(items);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  return { data, isLoading, error: null };
}

export function useLocations(): QueryResult<Location[]> {
  const { user } = useAuth();
  const [data, setData] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const q = query(collection(db, "locations"), where("ownerId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Location[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Location));
      setData(items);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  return { data, isLoading, error: null };
}

// Stubs for remaining hooks (to be connected to Firestore next)
export function useSuppliers(): QueryResult<Supplier[]> { return { data: [], isLoading: false, error: null }; }
export function useMovements(limit?: number): QueryResult<StockMovement[]> { return { data: [], isLoading: false, error: null }; }
export function useStockSummary(): QueryResult<StockSummary> { return { data: { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 }, isLoading: false, error: null }; }
export function usePurchaseOrders(): QueryResult<PurchaseOrder[]> { return { data: [], isLoading: false, error: null }; }
export function useRequests(): QueryResult<InventoryRequest[]> { return { data: [], isLoading: false, error: null }; }
