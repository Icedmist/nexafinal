import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";

export interface ActivityLog {
  id: string;
  type: string;
  title: string;
  message: string;
  userId: string;
  userEmail: string;
  branchId?: string | null;
  createdAt: any;
}

export function useActivityLogs(count = 10) {
  const { user, claims } = useAuth();
  const { storeId } = useBusiness();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !storeId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "activity_logs"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc"),
      limit(count)
    );

    const isAdmin = user && (user.uid === storeId || (claims?.role === "admin"));
    const userBranchId = claims?.branchId;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: ActivityLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Client-side filter for branch isolation
        if (!isAdmin && userBranchId && data.branchId && data.branchId !== userBranchId) {
          return;
        }
        docs.push({ id: doc.id, ...data } as ActivityLog);
      });
      setLogs(docs);
      setLoading(false);
    }, (err) => {
      console.error("Activity logs listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, storeId, count, claims]);

  return { logs, loading };
}
