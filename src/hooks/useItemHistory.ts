import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import type { StockMovement, SaleTransaction } from "@/types/inventory";

export interface HistoryEntry {
  id: string;
  type: "movement" | "sale";
  action: string;
  quantity: number;
  performedByName: string;
  branchId: string | null;
  createdAt: string;
  reference?: string;
  notes?: string;
}

export function useItemHistory(itemId: string) {
  const { user, claimsReady } = useAuth();
  const { storeId } = useBusiness();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId || !itemId || !claimsReady) return;

    const mQuery = query(
      collection(db, "movements"),
      where("storeId", "==", storeId),
      where("itemId", "==", itemId),
      orderBy("createdAt", "desc")
    );

    const sQuery = query(
      collection(db, "sales"),
      where("storeId", "==", storeId),
      where("itemIds", "array-contains", itemId),
      orderBy("createdAt", "desc")
    );

    const unsubM = onSnapshot(mQuery, (snap) => {
      setMovements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockMovement)));
    });

    const unsubS = onSnapshot(sQuery, (snap) => {
      setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleTransaction)));
    });

    setIsLoading(false);
    return () => {
      unsubM();
      unsubS();
    };
  }, [user, storeId, itemId, claimsReady]);

  const history = useMemo(() => {
    const entries: HistoryEntry[] = [];

    // Add movements
    movements.forEach(m => {
      entries.push({
        id: m.id,
        type: "movement",
        action: m.type,
        quantity: m.quantity,
        performedByName: m.performedByName || "Unknown Staff",
        branchId: m.branchId || null,
        createdAt: m.createdAt,
        reference: m.reference,
        notes: m.notes,
      });
    });

    // Add sales
    sales.forEach(s => {
      const saleItem = s.items.find(i => i.itemId === itemId);
      if (saleItem) {
        entries.push({
          id: s.id,
          type: "sale",
          action: "Sold",
          quantity: -saleItem.quantity, // Sales decrease stock
          performedByName: s.recordedByName || "Unknown Cashier",
          branchId: s.branchId || null,
          createdAt: s.createdAt,
          reference: `Receipt #${s.id.slice(-6).toUpperCase()}`,
          notes: s.customerName ? `Customer: ${s.customerName}` : undefined,
        });
      }
    });

    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [movements, sales, itemId]);

  return { data: history, isLoading };
}
