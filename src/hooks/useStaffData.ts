import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useTenant } from "@/contexts/TenantContext";
import { limit, writeBatch, getDocs } from "firebase/firestore";
import type { Staff, Branch, Store } from "@/types/tenant";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useStaff(): QueryResult<Staff[]> {
  const { user, claims } = useAuth();
  const { store } = useTenant();
  const [data, setData] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Priority: use storeId from claims or store context
    const targetStoreId = claims?.storeId || store?.id;

    if (!user || !targetStoreId) {
      if (!user) setData([]);
      setIsLoading(false);
      return;
    }

    // STRICT TENANT FILTER: Use storeId
    const q = query(
      collection(db, "staff"),
      where("storeId", "==", targetStoreId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staff: Staff[] = [];
      snapshot.forEach((doc) => {
        staff.push({ uid: doc.id, ...doc.data() } as any);
      });

      const isAdmin = claims?.role === "admin";
      const userBranchId = claims?.branchId;

      let filtered = staff;
      if (!isAdmin && userBranchId) {
        filtered = filtered.filter(s => s.branchId === userBranchId);
      }

      setData(filtered);
      setIsLoading(false);
    }, (err) => {
      console.error("Staff fetch error:", err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, claims, store]);

  return { data, isLoading, error };
}

export function useStoreBranches(): QueryResult<Branch[]> {
  const { claims } = useAuth();
  const { store } = useTenant();
  const [data, setData] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const targetStoreId = claims?.storeId || store?.id;
    if (!targetStoreId) {
      if (!store) setIsLoading(false);
      return;
    }

    const storeRef = doc(db, "stores", targetStoreId);
    const isAdmin = claims?.role === "admin";
    const userBranchId = claims?.branchId;

    const unsubscribe = onSnapshot(storeRef, (snapshot) => {
      if (snapshot.exists()) {
        const storeData = snapshot.data() as Store;
        const allBranches = storeData.branches || [];
        
        let filtered = allBranches;
        if (!isAdmin && userBranchId) {
          filtered = allBranches.filter(b => b.id === userBranchId);
        }
        setData(filtered);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching branches:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [store?.id, claims?.storeId]);

  return { data, isLoading, error: null };
}

export function useStaffMutations() {
  const { ownerId } = useBusiness();
  const { store } = useTenant();
  const { claims } = useAuth();

  const addStaff = async (staffData: Partial<Staff> & { password?: string }) => {
    const targetStoreId = claims?.storeId || store?.id;
    if (!ownerId || !targetStoreId) throw new Error("Unauthorized: Missing store context");
    
    const { httpsCallable } = await import("firebase/functions");
    const { functions: functionsInstance } = await import("@/lib/firebase");
    
    const provision = httpsCallable(functionsInstance, "provisionstaff");
    
    return provision({
      ...staffData,
      ownerId,
      storeId: targetStoreId,
    });
  };

  const updateStaff = async (staffId: string, updates: Partial<Staff> & { password?: string }) => {
    const { httpsCallable } = await import("firebase/functions");
    const { functions: functionsInstance } = await import("@/lib/firebase");
    
    const updateProfile = httpsCallable(functionsInstance, "updatestaffprofile");
    
    return updateProfile({
      uid: staffId,
      ...updates,
    });
  };

  return { addStaff, updateStaff };
}

export function useUpdateSelf() {
  const { user, refreshClaims } = useAuth();
  const { updateStaff } = useStaffMutations();

  const updateProfile = async (updates: { displayName?: string; password?: string }) => {
    if (!user) throw new Error("Not authenticated");
    
    // 1. Update Firebase Auth Profile if name changed
    if (updates.displayName) {
      const { updateProfile: firebaseUpdateProfile } = await import("firebase/auth");
      await firebaseUpdateProfile(user, { displayName: updates.displayName });
    }

    // 2. Update staff document via the same cloud function
    await updateStaff(user.uid, updates);

    // 3. Refresh claims to ensure UI is in sync
    await refreshClaims();
  };

  return { updateProfile };
}


export function useStoreMutations() {
  const { ownerId } = useBusiness();
  const { store } = useTenant();
  const { claims } = useAuth();

  const updateStore = async (updates: Partial<Store>) => {
    if (!ownerId) return;
    const q = query(collection(db, "stores"), where("ownerId", "==", ownerId), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, updates);
    }
  };

  const addBranch = async (branch: Branch) => {
    const targetStoreId = claims?.storeId || store?.id;
    if (!ownerId || !targetStoreId) return;

    const q = query(collection(db, "stores"), where("ownerId", "==", ownerId), limit(1));
    const snap = await getDocs(q);
    
    // Create the branch in the store document
    if (!snap.empty) {
      const storeRef = snap.docs[0].ref;
      const storeData = snap.docs[0].data() as Store;
      const branches = [...(storeData.branches || []), branch];
      await updateDoc(storeRef, { branches });
    }

    // NEW: Sync with locations collection so the Locations page features the branches
    await setDoc(doc(db, "locations", branch.id), {
      ownerId,
      storeId: targetStoreId,
      name: branch.name,
      type: "warehouse",
      address: branch.location,
      parentId: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return { updateStore, addBranch };
}
