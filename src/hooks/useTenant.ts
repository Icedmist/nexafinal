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
      // 1. Try Cache First
      const cacheKey = `nexa_tenant_${slug}`;
      const cached = sessionStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setStore(data);
          setLoading(false);
          return;
        } catch (e) {
          sessionStorage.removeItem(cacheKey);
        }
      }

      try {
        const q = query(collection(db, "stores"), where("slug", "==", slug), limit(1));
        let snapshot;
        let attempt = 0;
        const maxAttempts = 2;

        while (attempt < maxAttempts) {
          try {
            snapshot = await getDocs(q);
            break;
          } catch (innerError: any) {
            const message = innerError?.message || "";
            const isInternalAssert = message.includes("INTERNAL ASSERTION FAILED");

            if (isInternalAssert && attempt + 1 < maxAttempts) {
              console.warn("Firestore internal assertion on store lookup, retrying...", { slug, attempt, error: innerError });
              await new Promise((resolve) => setTimeout(resolve, 500));
              attempt += 1;
              continue;
            }

            throw innerError;
          }
        }

        if (!snapshot) {
          throw new Error("Failed to fetch store metadata from Firestore.");
        }

        if (snapshot.empty) {
          setError("Store not found");
          setStore(null);
        } else {
          const storeData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Store;
          setStore(storeData);
          // 2. Save to Cache
          sessionStorage.setItem(cacheKey, JSON.stringify(storeData));
        }
      } catch (err: any) {
        // Only log once, not on every re-render
        console.warn("Tenant lookup failed for slug:", slug, err?.code || err?.message, err);
        setError("Failed to load store details");
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, []);

  return { store, loading, error };
}
