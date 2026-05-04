import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Store } from "@/types/tenant";

function detectSlug(): string {
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  const urlParams = new URLSearchParams(window.location.search);
  const querySlug = urlParams.get("s");

  if (querySlug) return querySlug;

  // Support subdomains: store.localhost or store.nexa.com
  if (hostname.endsWith(".localhost") && parts.length > 1) {
    return parts[0];
  }
  if (hostname !== "localhost" && hostname !== "127.0.0.1" && parts.length > 2) {
    return parts[0];
  }

  return "";
}

export function useTenant() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Guard against duplicate calls (React strict mode)
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const slug = detectSlug();

    if (!slug) {
      setStore(null);
      setLoading(false);
      return;
    }

    const fetchStore = async () => {
      try {
        const q = query(collection(db, "stores"), where("slug", "==", slug), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("Store not found");
          setStore(null);
        } else {
          setStore({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Store);
        }
      } catch (err: any) {
        // Only log once, not on every re-render
        console.warn("Tenant lookup failed for slug:", slug, err?.code || err?.message);
        setError("Failed to load store details");
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, []);

  return { store, loading, error };
}
