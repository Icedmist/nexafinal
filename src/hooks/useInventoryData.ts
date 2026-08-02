import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, orderBy, limit as firestoreLimit, type Query, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useEffectiveBranch } from "@/hooks/useEffectiveBranch";
import { useDemo } from "@/hooks/useDemo";
import { DemoStore } from "@/lib/demo-store";
import type { 
  Item, Category, Supplier, Location, StockMovement, PurchaseOrder, InventoryRequest,
  ItemFilters, StockSummary 
} from "@/types/inventory";
import type { Customer } from "@/types/crm";

function useDemoStore(): DemoStore | null {
  const { isDemo, onboarding } = useDemo();
  return useMemo(() => {
    if (!isDemo) return null;
    return new DemoStore(onboarding.businessType || "general");
  }, [isDemo, onboarding.businessType]);
}

// Branch-access decision for inventory reads.
//
// Only platform roles (system_admin, owner) are truly "global"; a store admin,
// manager, or staff is scoped to their own branch (plus any store-wide items).
// This mirrors the permission model used across the app.
const isGlobalScope = (role: string | null | undefined, uid: string | null | undefined, ownerId: string | null | undefined) => {
  return role === "system_admin" || role === "owner" || (!!ownerId && !!uid && uid === ownerId);
};

// Returns the branch values a scoped user may read. NEVER includes `null`:
// Firestore disallows null inside an `in` array (it throws at query build).
// Store-wide products (branchId === null) are handled by a separate equality
// query. "all" is kept for legacy/compat products stamped with that value.
const getBranchInValues = (userBranchId: string | null | undefined) => {
  const values: string[] = ["all"];
  if (userBranchId) {
    return [userBranchId, ...values];
  }
  return values;
};

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useItems(filters?: ItemFilters): QueryResult<Item[]> {
const { user, claimsReady, claims } = useAuth();
    const { storeId, ownerId } = useBusiness();
    const demoStore = useDemoStore();
    const { effectiveBranchId, canJumpBranch } = useEffectiveBranch();
    const [data, setData] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (demoStore) {
      setData(demoStore.getItems({ categoryId: filters?.categoryId, search: filters?.search }));
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

    const isGlobal = !canJumpBranch && isGlobalScope(claims?.role, user?.uid, ownerId);
    const userBranchId = canJumpBranch ? effectiveBranchId : claims?.branchId;

    let prodQuery = query(
      collection(db, "products"),
      where("storeId", "==", storeId)
    );

    if (filters?.categoryId) {
      prodQuery = query(prodQuery, where("categoryId", "==", filters.categoryId));
    }

    let storewideQuery: Query<DocumentData> | null = null;
    let ownerQuery: Query<DocumentData> | null = null;

    if (!isGlobal) {
      // Branch-scoped: products for the user's branch or stamped "all".
      prodQuery = query(prodQuery, where("branchId", "in", getBranchInValues(userBranchId)));
      // Store-wide products carry branchId === null and can't be in an `in`
      // array, so read them with their own equality query and merge in.
      storewideQuery = query(
        collection(db, "products"),
        where("storeId", "==", storeId),
        where("branchId", "==", null),
        ...(filters?.categoryId ? [where("categoryId", "==", filters.categoryId)] : [])
      );

      // Branch claims can drift relative to the branchId stamped on a product
      // at creation time. To guarantee a branch-claim user never "loses" a
      // product they created, listen to an owner-scoped query and merge it.
      //
      // IMPORTANT: when the user is deliberately "jumping" into a chosen branch
      // (`canJumpBranch`), we must NOT merge an unfiltered owner query, because
      // it would re-import every product the admin owns in OTHER branches and
      // break the per-branch filter. In jump mode the owner query is scoped to
      // the same branch values so filtering stays correct.
      if (canJumpBranch) {
        ownerQuery = query(
          collection(db, "products"),
          where("storeId", "==", storeId),
          where("branchId", "in", getBranchInValues(userBranchId)),
          where("ownerId", "==", user?.uid || ""),
          ...(filters?.categoryId ? [where("categoryId", "==", filters.categoryId)] : []),
          orderBy("createdAt", "desc")
        );
      } else {
        ownerQuery = query(
          collection(db, "products"),
          where("storeId", "==", storeId),
          where("ownerId", "==", user?.uid || ""),
          ...(filters?.categoryId ? [where("categoryId", "==", filters.categoryId)] : []),
          orderBy("createdAt", "desc")
        );
      }
    }
    
    prodQuery = query(prodQuery, orderBy("createdAt", "desc"));

    const applyFilters = (rows: Item[]) => {
      let filtered = rows;

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
      if (filters?.locationId) {
        filtered = filtered.filter(i => i.locationId === filters.locationId);
      }
      if (filters?.supplierId) {
        filtered = filtered.filter(i => i.supplierId === filters.supplierId);
      }

      return filtered;
    };

    let mainSnapshotData: Item[] = [];
    let storewideSnapshotData: Item[] = [];
    let ownerSnapshotData: Item[] = [];

    // Merge the branch-scoped snapshot with the store-wide (branchId === null)
    // and owner-created snapshots so scoped users never miss a shareable product.
    const combine = () => {
      const byId = new Map<string, Item>();
      mainSnapshotData.forEach((i) => byId.set(i.id, i));
      storewideSnapshotData.forEach((i) => {
        if (!byId.has(i.id)) byId.set(i.id, i);
      });
      ownerSnapshotData.forEach((o) => {
        if (!byId.has(o.id)) byId.set(o.id, o);
      });
      const filtered = applyFilters([...byId.values()]);
      setData(filtered);
      setIsLoading(false);
    };

    const unsubscribe = onSnapshot(prodQuery, (snapshot) => {
      mainSnapshotData = [];
      snapshot.forEach((doc) => {
        mainSnapshotData.push({ ...doc.data(), id: doc.id } as Item);
      });
      combine();
    }, (err) => {
      console.error("Firestore Listen Error (Items):", err);
      setError(err);
      setIsLoading(false);
    });

    const unsubscribeStorewide = storewideQuery
      ? onSnapshot(storewideQuery, (snapshot) => {
          storewideSnapshotData = [];
          snapshot.forEach((doc) => {
            storewideSnapshotData.push({ ...doc.data(), id: doc.id } as Item);
          });
          combine();
        }, (err) => {
          console.error("Firestore Listen Error (Storewide Items):", err);
          setIsLoading(false);
        })
      : null;

    const unsubscribeOwn = ownerQuery
      ? onSnapshot(ownerQuery, (snapshot) => {
          ownerSnapshotData = [];
          snapshot.forEach((doc) => {
            ownerSnapshotData.push({ ...doc.data(), id: doc.id } as Item);
          });
          combine();
        }, (err) => {
          console.error("Firestore Listen Error (Own Items):", err);
          setIsLoading(false);
        })
      : null;

    return () => {
      unsubscribe();
      unsubscribeStorewide?.();
      unsubscribeOwn?.();
    };
  }, [demoStore, user, storeId, claimsReady, claims, ownerId, canJumpBranch, effectiveBranchId, filters?.categoryId, filters?.status, filters?.search, filters?.locationId, filters?.supplierId]);

  return { data, isLoading, error };
}

export function useItemById(id: string): QueryResult<Item | undefined> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId, ownerId } = useBusiness();
  const demoStore = useDemoStore();
  const { effectiveBranchId, canJumpBranch } = useEffectiveBranch();
  const [data, setData] = useState<Item | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (demoStore) {
      setData(demoStore.getItems().find(i => i.id === id));
      setIsLoading(false);
      return;
    }

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
        const item = { ...doc.data(), id: doc.id } as Item;
        const isGlobal = !canJumpBranch && isGlobalScope(claims?.role, user?.uid, ownerId);
        const userBranchId = canJumpBranch ? effectiveBranchId : claims?.branchId;
        const branchAccess = getBranchInValues(userBranchId);

        // Store-wide (branchId === null) products plus the user's branch / "all".
        if (!isGlobal && !(item.branchId == null || branchAccess.includes(item.branchId ?? ""))) {
          setData(undefined);
        } else {
          setData(item);
        }
      } else {
        setData(undefined);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Listen Error (ItemById):", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [demoStore, user, storeId, id, claimsReady, claims, ownerId, canJumpBranch, effectiveBranchId]);

  return { data, isLoading, error: null };
}

export function useCategories(): QueryResult<Category[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId } = useBusiness();
  const demoStore = useDemoStore();
  const [data, setData] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (demoStore) {
      setData(demoStore.getCategories());
      setIsLoading(false);
      return;
    }

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
  }, [demoStore, user, storeId, claimsReady, claims]);

  return { data, isLoading, error: null };
}

export function useLocations(): QueryResult<Location[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId, ownerId } = useBusiness();
  const demoStore = useDemoStore();
  const { effectiveBranchId, canJumpBranch } = useEffectiveBranch();
  const [data, setData] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (demoStore) {
      setData(demoStore.getLocations());
      setIsLoading(false);
      return;
    }

    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) setIsLoading(false);
      return;
    }
    const locQuery = query(collection(db, "locations"), where("storeId", "==", storeId));
    const isGlobal = !canJumpBranch && isGlobalScope(claims?.role, user?.uid, ownerId);
    const userBranchId = canJumpBranch ? effectiveBranchId : claims?.branchId;

    let q: Query<DocumentData>;
    if (isGlobal) {
      q = locQuery;
    } else {
      q = query(locQuery, where("branchId", "in", getBranchInValues(userBranchId)));
    }

    const storewideQuery = isGlobal
      ? null
      : query(collection(db, "locations"), where("storeId", "==", storeId), where("branchId", "==", null));

    let mainItems: Location[] = [];
    let storewideItems: Location[] = [];

    const combine = () => {
      const byId = new Map<string, Location>();
      mainItems.forEach((i) => byId.set(i.id, i));
      storewideItems.forEach((i) => {
        if (!byId.has(i.id)) byId.set(i.id, i);
      });
      setData([...byId.values()]);
      setIsLoading(false);
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      mainItems = [];
      snapshot.forEach((doc) => mainItems.push({ id: doc.id, ...doc.data() } as Location));
      combine();
    }, (err) => {
      console.error("Firestore Listen Error (Locations):", err);
      setIsLoading(false);
    });

    const unsubscribeStorewide = storewideQuery
      ? onSnapshot(storewideQuery, (snapshot) => {
          storewideItems = [];
          snapshot.forEach((doc) => storewideItems.push({ id: doc.id, ...doc.data() } as Location));
          combine();
        }, (err) => {
          console.error("Firestore Listen Error (Storewide Locations):", err);
          setIsLoading(false);
        })
      : null;

    return () => {
      unsubscribe();
      unsubscribeStorewide?.();
    };
  }, [demoStore, user, storeId, claimsReady, claims, ownerId, canJumpBranch, effectiveBranchId]);

  return { data, isLoading, error: null };
}

export function useAllLocations(): QueryResult<Location[]> {
  const { user, claimsReady } = useAuth();
  const { storeId } = useBusiness();
  const demoStore = useDemoStore();
  const [data, setData] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (demoStore) {
      setData(demoStore.getLocations());
      setIsLoading(false);
      return;
    }

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
  }, [demoStore, user, storeId, claimsReady]);

  return { data, isLoading, error: null };
}

export function useSuppliers(): QueryResult<Supplier[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId } = useBusiness();
  const demoStore = useDemoStore();
  const [data, setData] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (demoStore) {
      setData(demoStore.getSuppliers());
      setIsLoading(false);
      return;
    }

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
  }, [demoStore, user, storeId, claimsReady, claims]);

  return { data, isLoading, error: null };
}

export function useMovements(count = 20): QueryResult<StockMovement[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId, ownerId } = useBusiness();
  const demoStore = useDemoStore();
  const { effectiveBranchId, canJumpBranch } = useEffectiveBranch();
  const [data, setData] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (demoStore) {
      setData(demoStore.getMovements().slice(0, count));
      setIsLoading(false);
      return;
    }

    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) setIsLoading(false);
      return;
    }
    const isGlobal = !canJumpBranch && isGlobalScope(claims?.role, user?.uid, ownerId);
    const userBranchId = canJumpBranch ? effectiveBranchId : claims?.branchId;

    let q: Query<DocumentData>;
    if (isGlobal) {
      q = query(
        collection(db, "movements"),
        where("storeId", "==", storeId),
        orderBy("createdAt", "desc"),
        firestoreLimit(count)
      );
    } else {
      q = query(
        collection(db, "movements"),
        where("storeId", "==", storeId),
        where("branchId", "in", getBranchInValues(userBranchId)),
        orderBy("createdAt", "desc"),
        firestoreLimit(count)
      );
    }

    const storewideQuery = isGlobal
      ? null
      : query(
          collection(db, "movements"),
          where("storeId", "==", storeId),
          where("branchId", "==", null),
          orderBy("createdAt", "desc"),
          firestoreLimit(count)
        );

    let mainItems: StockMovement[] = [];
    let storewideItems: StockMovement[] = [];

    const combine = () => {
      const byId = new Map<string, StockMovement>();
      mainItems.forEach((i) => byId.set(i.id, i));
      storewideItems.forEach((i) => {
        if (!byId.has(i.id)) byId.set(i.id, i);
      });
      setData([...byId.values()]);
      setIsLoading(false);
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      mainItems = [];
      snapshot.forEach((doc) => mainItems.push({ id: doc.id, ...doc.data() } as StockMovement));
      combine();
    }, (err) => {
      console.error("Firestore Listen Error (Movements):", err);
      setIsLoading(false);
    });

    const unsubscribeStorewide = storewideQuery
      ? onSnapshot(storewideQuery, (snapshot) => {
          storewideItems = [];
          snapshot.forEach((doc) => storewideItems.push({ id: doc.id, ...doc.data() } as StockMovement));
          combine();
        }, (err) => {
          console.error("Firestore Listen Error (Storewide Movements):", err);
          setIsLoading(false);
        })
      : null;

    return () => {
      unsubscribe();
      unsubscribeStorewide?.();
    };
  }, [demoStore, user, storeId, claimsReady, claims, ownerId, canJumpBranch, effectiveBranchId, count]);

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
  const { storeId, ownerId } = useBusiness();
  const demoStore = useDemoStore();
  const { effectiveBranchId, canJumpBranch } = useEffectiveBranch();
  const [data, setData] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (demoStore) {
      setData([]);
      setIsLoading(false);
      return;
    }

    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) setIsLoading(false);
      return;
    }
    const isGlobal = !canJumpBranch && isGlobalScope(claims?.role, user?.uid, ownerId);
    const userBranchId = canJumpBranch ? effectiveBranchId : claims?.branchId;

    const baseQuery = query(collection(db, "purchase_orders"), where("storeId", "==", storeId));
    let q: Query<DocumentData>;
    if (isGlobal) {
      q = baseQuery;
    } else {
      q = query(baseQuery, where("branchId", "in", getBranchInValues(userBranchId)));
    }

    const storewideQuery = isGlobal
      ? null
      : query(collection(db, "purchase_orders"), where("storeId", "==", storeId), where("branchId", "==", null));

    let mainItems: PurchaseOrder[] = [];
    let storewideItems: PurchaseOrder[] = [];

    const combine = () => {
      const byId = new Map<string, PurchaseOrder>();
      mainItems.forEach((i) => byId.set(i.id, i));
      storewideItems.forEach((i) => {
        if (!byId.has(i.id)) byId.set(i.id, i);
      });
      setData([...byId.values()]);
      setIsLoading(false);
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      mainItems = [];
      snapshot.forEach((doc) => mainItems.push({ id: doc.id, ...doc.data() } as PurchaseOrder));
      combine();
    }, (err) => {
      console.error("Firestore Listen Error (PurchaseOrders):", err);
      setIsLoading(false);
    });

    const unsubscribeStorewide = storewideQuery
      ? onSnapshot(storewideQuery, (snapshot) => {
          storewideItems = [];
          snapshot.forEach((doc) => storewideItems.push({ id: doc.id, ...doc.data() } as PurchaseOrder));
          combine();
        }, (err) => {
          console.error("Firestore Listen Error (Storewide PurchaseOrders):", err);
          setIsLoading(false);
        })
      : null;

    return () => {
      unsubscribe();
      unsubscribeStorewide?.();
    };
  }, [demoStore, user, storeId, claimsReady, claims, ownerId, canJumpBranch, effectiveBranchId]);

  return { data, isLoading, error: null };
}

export function useRequests(): QueryResult<InventoryRequest[]> {
  const { user, claimsReady, claims } = useAuth();
  const { storeId, ownerId } = useBusiness();
  const demoStore = useDemoStore();
  const { effectiveBranchId, canJumpBranch } = useEffectiveBranch();
  const [data, setData] = useState<InventoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (demoStore) {
      setData([]);
      setIsLoading(false);
      return;
    }

    if (!user || !storeId || !claimsReady) {
      if (!claimsReady || !user) setIsLoading(false);
      return;
    }
    const isGlobal = !canJumpBranch && isGlobalScope(claims?.role, user?.uid, ownerId);
    const userBranchId = canJumpBranch ? effectiveBranchId : claims?.branchId;

    const baseQuery = query(collection(db, "requests"), where("storeId", "==", storeId));
    let q: Query<DocumentData>;
    if (isGlobal) {
      q = baseQuery;
    } else {
      q = query(baseQuery, where("branchId", "in", getBranchInValues(userBranchId)));
    }

    const storewideQuery = isGlobal
      ? null
      : query(collection(db, "requests"), where("storeId", "==", storeId), where("branchId", "==", null));

    let mainItems: InventoryRequest[] = [];
    let storewideItems: InventoryRequest[] = [];

    const combine = () => {
      const byId = new Map<string, InventoryRequest>();
      mainItems.forEach((i) => byId.set(i.id, i));
      storewideItems.forEach((i) => {
        if (!byId.has(i.id)) byId.set(i.id, i);
      });
      setData([...byId.values()]);
      setIsLoading(false);
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      mainItems = [];
      snapshot.forEach((doc) => mainItems.push({ id: doc.id, ...doc.data() } as InventoryRequest));
      combine();
    }, (err) => {
      console.error("Firestore Listen Error (Requests):", err);
      setIsLoading(false);
    });

    const unsubscribeStorewide = storewideQuery
      ? onSnapshot(storewideQuery, (snapshot) => {
          storewideItems = [];
          snapshot.forEach((doc) => storewideItems.push({ id: doc.id, ...doc.data() } as InventoryRequest));
          combine();
        }, (err) => {
          console.error("Firestore Listen Error (Storewide Requests):", err);
          setIsLoading(false);
        })
      : null;

    return () => {
      unsubscribe();
      unsubscribeStorewide?.();
    };
  }, [demoStore, user, storeId, claimsReady, claims, ownerId, canJumpBranch, effectiveBranchId]);

  return { data, isLoading, error: null };
}

export function useCustomers(): QueryResult<Customer[]> {
  const { user, claimsReady } = useAuth();
  const { storeId } = useBusiness();
  const demoStore = useDemoStore();
  const [data, setData] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (demoStore) {
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

    const q = query(
      collection(db, "customers"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Customer[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Customer);
      });
      setData(items);
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Listen Error (Customers):", err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [demoStore, user, storeId, claimsReady]);

  return { data, isLoading, error };
}
