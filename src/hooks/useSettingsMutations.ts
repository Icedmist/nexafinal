import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";

export function useSettingsMutations() {
  const { user } = useAuth();
  const { storeId } = useBusiness();

  const addStaff = async (staffData: any) => {
    if (!user) return;
    await addDoc(collection(db, "staff"), {
      ...staffData,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
    });
  };

  const updateStaff = async (id: string, updates: any) => {
    await updateDoc(doc(db, "staff", id), updates);
  };

  const deleteStaff = async (id: string) => {
    await deleteDoc(doc(db, "staff", id));
  };

  const addCustomField = async (fieldData: any) => {
    if (!user || !storeId) return;
    await addDoc(collection(db, "customFields"), {
      ...fieldData,
      storeId,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
    });
  };

  const deleteCustomField = async (id: string) => {
    await deleteDoc(doc(db, "customFields", id));
  };

  return {
    addStaff,
    updateStaff,
    deleteStaff,
    addCustomField,
    deleteCustomField,
  };
}
