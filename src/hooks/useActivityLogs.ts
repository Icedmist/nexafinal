import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ActivityLog {
  id: string;
  type: string;
  title: string;
  message: string;
  userId: string;
  userEmail: string;
  createdAt: any;
}

export function useActivityLogs(count = 10) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "activity_logs"),
      orderBy("createdAt", "desc"),
      limit(count)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: ActivityLog[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as ActivityLog);
      });
      setLogs(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [count]);

  return { logs, loading };
}
