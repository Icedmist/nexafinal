import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Store } from "@/types/tenant";
import { useLocation } from "react-router-dom";

const RESERVED_SUBDOMAINS = ["www", "admin", "api", "dev", "staging", "auth"];

const detectSlug = () => {
  if (typeof window === "undefined") return "";
  
  const hostname = window.location.hostname;
  const searchParams = new URLSearchParams(window.location.search);
  
  // Priority 1: Query parameter (useful for local dev / admin impersonation)
  const querySlug = searchParams.get("s");
  if (querySlug) {
    sessionStorage.setItem("nexa_active_slug", querySlug);
    return querySlug;
  }

  // Priority 2: Subdomain detection
  const parts = hostname.split(".");
  let subdomain = "";
  
  // Handle localhost: store.localhost or store.127.0.0.1
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    if (parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "127") {
      const sub = parts[0];
      if (!RESERVED_SUBDOMAINS.includes(sub)) {
        subdomain = sub;
      }
    }
  } else {
    // Handle production domains: store.nexa.com
    if (parts.length > 2) {
      const sub = parts[0];
      if (!RESERVED_SUBDOMAINS.includes(sub)) {
        subdomain = sub;
      }
    }
  }

  if (subdomain) {
    sessionStorage.setItem("nexa_active_slug", subdomain);
    return subdomain;
  }

  // If no subdomain is detected, and we are on the landing root path "/",
  // we must NOT fall back to session/local cached slugs, otherwise the landing page is hijacked.
  if (window.location.pathname === "/") {
    return "";
  }

  // Priority 3: Fallback to session active slug
  const cachedActiveSlug = sessionStorage.getItem("nexa_active_slug");
  if (cachedActiveSlug) return cachedActiveSlug;

  // Priority 4: Fallback to system admin selected store slug in localStorage
  const persistActiveSlug = localStorage.getItem("system_admin_selected_store_slug");
  if (persistActiveSlug) return persistActiveSlug;
  
  return "";
};

export function useTenant() {
  const location = useLocation();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    const slug = detectSlug();

    if (!slug) {
      setStore(null);
      setLoading(false);
      fetchedRef.current = null;
      return;
    }

    // Skip if we already fetched/are fetching this specific slug
    if (fetchedRef.current === slug) {
      setLoading(false);
      return;
    }
    fetchedRef.current = slug;
    setLoading(true);

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
            // Sync with system admin selected store for context alignment
            localStorage.setItem("system_admin_selected_store_id", data.id);
            localStorage.setItem("system_admin_selected_store_slug", data.slug);
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
            // Sync with system admin selected store for context alignment
            localStorage.setItem("system_admin_selected_store_id", data.id);
            localStorage.setItem("system_admin_selected_store_slug", data.slug);
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
            // Also update the selected store details for system admin context sync
            localStorage.setItem("system_admin_selected_store_id", storeData.id);
            localStorage.setItem("system_admin_selected_store_slug", storeData.slug);
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
  }, [location.search, location.pathname]);

  return { store, loading, error };
}
