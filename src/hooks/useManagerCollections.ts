import { useState, useEffect, useCallback, useMemo } from "react";
import type { ManagerCollection, ManagerCollectionItem, ManagerCollectionDebtPayment } from "@/types/inventory";
import { useDemo } from "@/hooks/useDemo";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, updateDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { useBusiness } from "@/contexts/BusinessContext";

const STORAGE_KEY = "nexa_manager_collections_demo";

const INITIAL_DEMO_COLLECTIONS: ManagerCollection[] = [
  {
    id: "mc-101",
    collectionNumber: "MCOL-2026-001",
    managerId: "u2",
    managerName: "Sarah Manager",
    storeId: "store-1",
    storeName: "Main Warehouse",
    items: [
      {
        itemId: "item-101",
        itemName: "Premium Nigerian Long Grain Rice (50kg)",
        sku: "RIC-50KG-01",
        quantityCollected: 10,
        unitPriceNgn: 72000,
        quantitySold: 7,
        quantityReturned: 1,
        remainingDebtQty: 2,
        remainingDebtValueNgn: 144000,
      },
      {
        itemId: "item-102",
        itemName: "Refined Palm Oil (25L Jerrycan)",
        sku: "OIL-25L-02",
        quantityCollected: 5,
        unitPriceNgn: 45000,
        quantitySold: 4,
        quantityReturned: 1,
        remainingDebtQty: 0,
        remainingDebtValueNgn: 0,
      },
    ],
    totalValueNgn: 945000,
    cashRemittedNgn: 684000,
    returnedStockValueNgn: 117000,
    remainingDebtValueNgn: 144000,
    status: "has_debt",
    collectionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    balancedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    balancedBy: "John Admin",
    notes: "Field sales distribution for Lekki Market outlets",
    debtPayments: [],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mc-102",
    collectionNumber: "MCOL-2026-002",
    managerId: "u5",
    managerName: "Alice Clerk",
    storeId: "store-2",
    storeName: "Ikeja Branch",
    items: [
      {
        itemId: "item-103",
        itemName: "Semovita Wheat Flour (10kg)",
        sku: "SEM-10KG-03",
        quantityCollected: 15,
        unitPriceNgn: 14500,
        quantitySold: 0,
        quantityReturned: 0,
        remainingDebtQty: 15,
        remainingDebtValueNgn: 217500,
      },
    ],
    totalValueNgn: 217500,
    cashRemittedNgn: 0,
    returnedStockValueNgn: 0,
    remainingDebtValueNgn: 217500,
    status: "collected",
    collectionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Branch stock transfer for weekend promotion",
    debtPayments: [],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function useManagerCollections() {
  const { isDemo } = useDemo();
  const { storeId: currentStoreId } = useBusiness();

  const [firebaseData, setFirebaseData] = useState<ManagerCollection[]>([]);
  const [fbLoading, setFbLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      setFirebaseData([]);
      setFbLoading(false);
      return;
    }

    const q = query(collection(db, "managerCollections"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ManagerCollection[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as ManagerCollection);
        });
        setFirebaseData(list);
        setFbLoading(false);
      },
      (err) => {
        console.error("Failed to load manager collections:", err);
        setFbLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isDemo]);

  const [demoCollections, setDemoCollections] = useState<ManagerCollection[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error reading manager collections demo storage:", e);
    }
    return INITIAL_DEMO_COLLECTIONS;
  });

  const saveDemoCollections = (list: ManagerCollection[]) => {
    setDemoCollections(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Error saving demo manager collections:", e);
    }
  };

  const rawCollections = isDemo ? demoCollections : firebaseData;

  const collections = useMemo(() => {
    if (!currentStoreId) return rawCollections;
    return rawCollections.filter((c) => !c.storeId || c.storeId === currentStoreId);
  }, [rawCollections, currentStoreId]);

  const createCollection = useCallback(
    async (payload: Omit<ManagerCollection, "id" | "collectionNumber" | "createdAt" | "updatedAt" | "status" | "totalValueNgn" | "cashRemittedNgn" | "returnedStockValueNgn" | "remainingDebtValueNgn">) => {
      const collectionNumber = `MCOL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalValueNgn = payload.items.reduce((sum, item) => sum + item.quantityCollected * item.unitPriceNgn, 0);

      const newRecord: ManagerCollection = {
        ...payload,
        id: isDemo ? `mc-demo-${Date.now()}` : doc(collection(db, "managerCollections")).id,
        collectionNumber,
        totalValueNgn,
        cashRemittedNgn: 0,
        returnedStockValueNgn: 0,
        remainingDebtValueNgn: totalValueNgn,
        status: "collected",
        debtPayments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (isDemo) {
        saveDemoCollections([newRecord, ...demoCollections]);
        toast.success(`Product collection ${collectionNumber} logged for ${payload.managerName}!`);
        return newRecord;
      } else {
        await setDoc(doc(db, "managerCollections", newRecord.id), newRecord);
        toast.success(`Product collection ${collectionNumber} recorded in cloud store database!`);
        return newRecord;
      }
    },
    [isDemo, demoCollections]
  );

  const balanceUpCollection = useCallback(
    async (
      collectionId: string,
      balancingData: {
        itemsBalancing: {
          itemId: string;
          quantitySold: number;
          quantityReturned: number;
        }[];
        cashRemittedNgn: number;
        balancedBy: string;
        notes?: string;
      }
    ) => {
      const target = rawCollections.find((c) => c.id === collectionId);
      if (!target) {
        toast.error("Collection record not found.");
        return;
      }

      let totalReturnedValue = 0;
      let calculatedSoldValue = 0;

      const updatedItems: ManagerCollectionItem[] = target.items.map((item) => {
        const input = balancingData.itemsBalancing.find((b) => b.itemId === item.itemId) || {
          itemId: item.itemId,
          quantitySold: 0,
          quantityReturned: 0,
        };

        const sold = Math.min(item.quantityCollected, Math.max(0, input.quantitySold));
        const returned = Math.min(item.quantityCollected - sold, Math.max(0, input.quantityReturned));
        const remQty = Math.max(0, item.quantityCollected - sold - returned);
        const remValue = remQty * item.unitPriceNgn;

        totalReturnedValue += returned * item.unitPriceNgn;
        calculatedSoldValue += sold * item.unitPriceNgn;

        return {
          ...item,
          quantitySold: sold,
          quantityReturned: returned,
          remainingDebtQty: remQty,
          remainingDebtValueNgn: remValue,
        };
      });

      const actualCashRemitted = balancingData.cashRemittedNgn || calculatedSoldValue;
      const remainingDebtValueNgn = Math.max(0, target.totalValueNgn - actualCashRemitted - totalReturnedValue);

      let status: ManagerCollection["status"] = "fully_balanced";
      if (remainingDebtValueNgn > 0) {
        status = "has_debt";
      } else if (actualCashRemitted > 0 || totalReturnedValue > 0) {
        status = "fully_balanced";
      }

      const updates: Partial<ManagerCollection> = {
        items: updatedItems,
        cashRemittedNgn: actualCashRemitted,
        returnedStockValueNgn: totalReturnedValue,
        remainingDebtValueNgn,
        status,
        balancedAt: new Date().toISOString(),
        balancedBy: balancingData.balancedBy,
        notes: balancingData.notes ? `${target.notes || ""}\nBalancing Note: ${balancingData.notes}` : target.notes,
        updatedAt: new Date().toISOString(),
      };

      if (isDemo) {
        const updatedList = demoCollections.map((c) => (c.id === collectionId ? { ...c, ...updates } : c));
        saveDemoCollections(updatedList);
        if (remainingDebtValueNgn > 0) {
          toast.warning(`Balanced up! Remaining ₦${remainingDebtValueNgn.toLocaleString()} logged as Manager Debt for ${target.managerName}.`);
        } else {
          toast.success(`Balancing complete! ${target.collectionNumber} fully settled with 0 debt.`);
        }
      } else {
        await updateDoc(doc(db, "managerCollections", collectionId), updates);
        toast.success(`Balancing record updated for ${target.collectionNumber}.`);
      }
    },
    [isDemo, demoCollections, rawCollections]
  );

  const settleDebt = useCallback(
    async (collectionId: string, paymentAmountNgn: number, notes: string, recordedBy: string) => {
      const target = rawCollections.find((c) => c.id === collectionId);
      if (!target) return;

      const newDebtPayment: ManagerCollectionDebtPayment = {
        id: `p-${Date.now()}`,
        amountNgn: paymentAmountNgn,
        paymentDate: new Date().toISOString(),
        notes,
        recordedBy,
      };

      const existingPayments = target.debtPayments || [];
      const updatedPayments = [...existingPayments, newDebtPayment];

      const newRemainingDebt = Math.max(0, target.remainingDebtValueNgn - paymentAmountNgn);
      const newCashRemitted = target.cashRemittedNgn + paymentAmountNgn;

      const newStatus: ManagerCollection["status"] = newRemainingDebt <= 0 ? "debt_cleared" : "has_debt";

      const updates: Partial<ManagerCollection> = {
        cashRemittedNgn: newCashRemitted,
        remainingDebtValueNgn: newRemainingDebt,
        status: newStatus,
        debtPayments: updatedPayments,
        updatedAt: new Date().toISOString(),
      };

      if (isDemo) {
        const updatedList = demoCollections.map((c) => (c.id === collectionId ? { ...c, ...updates } : c));
        saveDemoCollections(updatedList);
        toast.success(`Debt payment of ₦${paymentAmountNgn.toLocaleString()} recorded for ${target.managerName}!`);
      } else {
        await updateDoc(doc(db, "managerCollections", collectionId), updates);
        toast.success(`Debt payment recorded successfully!`);
      }
    },
    [isDemo, demoCollections, rawCollections]
  );

  return {
    collections,
    loading: isDemo ? false : fbLoading,
    createCollection,
    balanceUpCollection,
    settleDebt,
  };
}
