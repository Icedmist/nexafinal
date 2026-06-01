import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Store } from "@/types/tenant";

const RESERVED_SUBDOMAINS = ["www", "admin", "api", "dev", "staging", "auth"];

const detectSlug = () => {
  if (typeof window === "undefined") return "";
  
  const hostname = window.location.hostname;
  const searchParams = new URLSearchParams(window.location.search);
  
  // Priority 1: Query parameter (useful for local dev)
  const querySlug = searchParams.get("s");
  if (querySlug) return querySlug;

  // Priority 2: Subdomain detection
  const parts = hostname.split(".");
  
  // Handle localhost: store.localhost or store.127.0.0.1
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    if (parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "127") {
      const subdomain = parts[0];
      if (!RESERVED_SUBDOMAINS.includes(subdomain)) return subdomain;
    }
    return "";
  }
  
  // Handle production domains: store.nexa.com
  if (parts.length > 2) {
    const subdomain = parts[0];
    if (!RESERVED_SUBDOMAINS.includes(subdomain)) return subdomain;
  }
  
  return "";
};

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
      const isBrowser = typeof window !== "undefined";
      const sessionKey = `nexa_tenant_${slug}`;
      const persistKey = `nexa_tenant_persist_${slug}`;
      let loadedFromCache = false;

      // 1. Try sessionStorage cache first (fast, same-session)
      if (isBrowser) {
        const sessionCached = sessionStorage.getItem(sessionKey);
        if (sessionCached) {
          try {
            const data = JSON.parse(sessionCached);
            setStore(data);
            setLoading(false);
            return; // Session cache is fresh enough — done
          } catch (e) {
            sessionStorage.removeItem(sessionKey);
          }
        }
      }

      // 2. Try localStorage cache (offline resilience, survives tab closes)
      if (isBrowser) {
        const persistCached = localStorage.getItem(persistKey);
        if (persistCached) {
          try {
            const data = JSON.parse(persistCached);
            setStore(data);
            setLoading(false);
            loadedFromCache = true;
            // Don't return — still try to refresh from Firestore below
          } catch (e) {
            localStorage.removeItem(persistKey);
          }
        }
      }

      // 3. Fetch from Firestore (serves from IndexedDB cache when offline)
      try {
        const q = query(collection(db, "stores"), where("slug", "==", slug), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          if (!loadedFromCache) {
            setError("Store not found");
            setStore(null);
          }
        } else {
          const storeData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Store;
          setStore(storeData);
          // Save to both caches for offline resilience
          if (isBrowser) {
            sessionStorage.setItem(sessionKey, JSON.stringify(storeData));
            localStorage.setItem(persistKey, JSON.stringify(storeData));
          }
        }
      } catch (err: any) {
        console.warn("Tenant lookup from Firestore failed (may be offline):", slug, err?.code || err?.message);
        // If we already loaded from cache above, the app still works
        if (!loadedFromCache) {
          setError("Failed to load store details");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, []);

  return { store, loading, error };
}
