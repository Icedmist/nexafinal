import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { limit, writeBatch, getDocs } from "firebase/firestore";
import type { Staff, Branch, Store } from "@/types/tenant";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useStaff(): QueryResult<Staff[]> {
  const { user } = useAuth();
  const [data, setData] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setData([]);
      setIsLoading(false);
      return;
    }

    // Admins can see all staff for their store
    // For now, we assume ownerId is the admin's UID
    const q = query(
      collection(db, "staff"),
      where("ownerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staff: Staff[] = [];
      snapshot.forEach((doc) => {
        staff.push({ id: doc.id, ...doc.data() } as any);
      });
      setData(staff);
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { data, isLoading, error };
}

export function useStoreBranches(): QueryResult<Branch[]> {
  const { ownerId } = useBusiness();
  const [data, setData] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) { setIsLoading(false); return; }
    const q = query(collection(db, "stores"), where("ownerId", "==", ownerId), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const storeData = snapshot.docs[0].data() as Store;
        setData(storeData.branches || []);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [ownerId]);

  return { data, isLoading, error: null };
}

export function useStaffMutations() {
  const { ownerId } = useBusiness();

  const addStaff = async (staffData: Partial<Staff> & { password?: string }) => {
    if (!ownerId) throw new Error("Unauthorized");
    return addDoc(collection(db, "staff"), {
      ...staffData,
      ownerId,
      createdAt: new Date().toISOString(),
      isActive: true,
    });
  };

  const updateStaff = async (staffId: string, updates: Partial<Staff>) => {
    const staffRef = doc(db, "staff", staffId);
    return updateDoc(staffRef, updates);
  };

  return { addStaff, updateStaff };
}


export function useStoreMutations() {
  const { ownerId } = useBusiness();

  const updateStore = async (updates: Partial<Store>) => {
    if (!ownerId) return;
    const q = query(collection(db, "stores"), where("ownerId", "==", ownerId), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, updates);
    }
  };

  const addBranch = async (branch: Branch) => {
    if (!ownerId) return;
    const q = query(collection(db, "stores"), where("ownerId", "==", ownerId), limit(1));
    const snap = await getDocs(q);
    
    // Create the branch in the store document
    if (!snap.empty) {
      const storeRef = snap.docs[0].ref;
      const store = snap.docs[0].data() as Store;
      const branches = [...(store.branches || []), branch];
      await updateDoc(storeRef, { branches });
    } else {
      await addDoc(collection(db, "stores"), {
        ownerId,
        branches: [branch],
        createdAt: new Date().toISOString(),
      });
    }

    // NEW: Sync with locations collection so the Locations page features the branches
    await setDoc(doc(db, "locations", branch.id), {
      ownerId,
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
