import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";

export interface CustomFieldDef {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "boolean" | "select";
  options?: string[];
  required: boolean;
  ownerId: string;
}

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useCustomFields(): QueryResult<CustomFieldDef[]> {
  const { user } = useAuth();
  const { storeId } = useBusiness();
  const [data, setData] = useState<CustomFieldDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !storeId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "customFields"),
      where("storeId", "==", storeId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fields: CustomFieldDef[] = [];
      snapshot.forEach((doc) => {
        fields.push({ id: doc.id, ...doc.data() } as CustomFieldDef);
      });
      setData(fields);
      setIsLoading(false);
    }, (err) => {
      console.error("Custom fields listener error:", err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, storeId]);

  return { data, isLoading, error };
}
