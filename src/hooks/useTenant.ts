import { useState, useEffect } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Store } from "@/types/tenant";

export function useTenant() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStore = async () => {
      const hostname = window.location.hostname;
      const parts = hostname.split(".");
      
      // If we're on a subdomain (e.g. store.nexa.com or store.localhost)
      // Usually subdomain is the first part if parts.length > 2 (for nexa.com)
      // or parts.length > 1 (for localhost)
      
      let slug = "";
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        slug = ""; // Root domain
      } else {
        slug = parts[0];
      }

      if (!slug) {
        setStore(null);
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(db, "stores"), where("slug", "==", slug), limit(1));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setError("Store not found");
          setStore(null);
        } else {
          setStore({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Store);
        }
      } catch (err) {
        console.error("Failed to fetch tenant store:", err);
        setError("Failed to load store details");
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, []);

  return { store, loading, error };
}
