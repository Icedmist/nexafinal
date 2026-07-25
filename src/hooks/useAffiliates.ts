import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where, orderBy, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useDemo } from "@/hooks/useDemo";

export interface AffiliatePartner {
  id: string;
  storeId: string;
  name: string;
  email: string;
  phone?: string;
  status: "active" | "pending" | "inactive";
  referralCode: string;
  totalSales: number;
  totalEarnings: number;
  createdAt: any;
  updatedAt?: any;
}

interface UseAffiliatesResult {
  partners: AffiliatePartner[];
  isLoading: boolean;
  stats: {
    totalPartners: number;
    activePartners: number;
    totalCommissions: number;
    totalPartnerSales: number;
  };
  addPartner: (data: Omit<AffiliatePartner, "id" | "storeId" | "totalSales" | "totalEarnings" | "createdAt">) => Promise<void>;
  updatePartner: (id: string, data: Partial<AffiliatePartner>) => Promise<void>;
  removePartner: (id: string) => Promise<void>;
}

export function useAffiliates(): UseAffiliatesResult {
  const { user } = useAuth();
  const { profile } = useBusiness();
  const { isDemo } = useDemo();
  const [partners, setPartners] = useState<AffiliatePartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const storeId = profile?.id;

  useEffect(() => {
    if (isDemo || !user || !storeId) {
      setPartners([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const partnersRef = collection(db, "affiliatePartners");
    const q = query(
      partnersRef,
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AffiliatePartner[];
        setPartners(data);
        setIsLoading(false);
      },
      (error) => {
        console.error("[useAffiliates] Error:", error);
        setPartners([]);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, storeId, isDemo]);

  const addPartner = useCallback(
    async (data: Omit<AffiliatePartner, "id" | "storeId" | "totalSales" | "totalEarnings" | "createdAt">) => {
      if (!user || !storeId) throw new Error("Not authenticated");

      const partnersRef = collection(db, "affiliatePartners");
      await addDoc(partnersRef, {
        ...data,
        storeId,
        totalSales: 0,
        totalEarnings: 0,
        createdAt: serverTimestamp(),
      });
    },
    [user, storeId]
  );

  const updatePartner = useCallback(
    async (id: string, data: Partial<AffiliatePartner>) => {
      if (!user) throw new Error("Not authenticated");

      const partnerRef = doc(db, "affiliatePartners", id);
      await updateDoc(partnerRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    [user]
  );

  const removePartner = useCallback(
    async (id: string) => {
      if (!user) throw new Error("Not authenticated");

      const partnerRef = doc(db, "affiliatePartners", id);
      await deleteDoc(partnerRef);
    },
    [user]
  );

  const stats = {
    totalPartners: partners.length,
    activePartners: partners.filter((p) => p.status === "active").length,
    totalCommissions: partners.reduce((sum, p) => sum + p.totalEarnings, 0),
    totalPartnerSales: partners.reduce((sum, p) => sum + p.totalSales, 0),
  };

  return { partners, isLoading, stats, addPartner, updatePartner, removePartner };
}
