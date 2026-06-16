import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './FirebaseAuthContext';
import { doc, onSnapshot, updateDoc, query, collection, where, limit, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from './TenantContext';
import { isAdminRole } from '@/lib/roles';

export interface BusinessProfile {
  id: string;
  storeDetails: { 
    name: string; 
    phone: string; 
    address: string; 
    receiptFooter?: string; 
    taxRate?: number; 
    slug?: string; 
    isPublic?: boolean;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  };
  businessType: string;
  categories: string[];
  complexityLevel: "basic" | "advanced";
  branding?: { logo?: string; primaryColor?: string; };
  settings?: Record<string, any>;
  ownerId?: string; // The root owner's UID
}

interface BusinessContextType {
  profile: BusinessProfile | null;
  loadingProfile: boolean;
  updateProfile: (updates: Partial<BusinessProfile>) => Promise<void>;
  ownerId: string | null;
  storeId: string | null;
  needsOnboarding: boolean;
  switchStore?: (storeId: string | null) => void;
}

const BusinessContext = createContext<BusinessContextType>({ 
  profile: null, 
  loadingProfile: true,
  updateProfile: async () => {},
  ownerId: null,
  storeId: null,
  needsOnboarding: false,
  switchStore: () => {}
});

export const useBusiness = () => useContext(BusinessContext);

// Cache key for offline resilience
const BUSINESS_CACHE_KEY = "nexa_business_profile";

const cacheBusinessState = (p: BusinessProfile, oId: string | null, sId: string | null) => {
  try { localStorage.setItem(BUSINESS_CACHE_KEY, JSON.stringify({ profile: p, ownerId: oId, storeId: sId })); } catch (_) {}
};

const loadCachedBusinessState = (): { profile: BusinessProfile; ownerId: string | null; storeId: string | null } | null => {
  try {
    const c = localStorage.getItem(BUSINESS_CACHE_KEY);
    return c ? JSON.parse(c) : null;
  } catch (_) { return null; }
};

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, claims, claimsReady } = useAuth();
  const { store, loading: loadingTenant } = useTenant();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("system_admin_selected_store_id");
    } catch (_) {
      return null;
    }
  });

  const switchStore = (id: string | null) => {
    if (claims?.role !== "system_admin") {
      console.warn("Only system admins can switch stores.");
      return;
    }
    setSelectedStoreId(id);
    try {
      if (id) {
        localStorage.setItem("system_admin_selected_store_id", id);
      } else {
        localStorage.removeItem("system_admin_selected_store_id");
        localStorage.removeItem("system_admin_selected_store_slug");
        sessionStorage.removeItem("nexa_active_slug");
      }
    } catch (_) {}
  };

  // Load cached business profile immediately for offline resilience
  useEffect(() => {
    const cached = loadCachedBusinessState();
    if (cached && cached.profile && !profile) {
      setProfile(cached.profile);
      setOwnerId(cached.ownerId);
      setStoreId(cached.storeId);
    }
  }, []);

  useEffect(() => {
    // Wait for auth state, tenant info AND claims to be ready before proceeding
    if (!user || loadingTenant || !claimsReady) {
      if (!loadingTenant && claimsReady && !user) {
        setProfile(null);
        setOwnerId(null);
        setStoreId(null);
        setNeedsOnboarding(false);
        setLoadingProfile(false);
      }
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    const setupProfile = async () => {
      if (!mounted) return;
      setLoadingProfile(true);

      try {
        let activeStoreId = store?.id || (claims?.role === "system_admin" ? selectedStoreId : null);
        let activeOwnerId = store?.ownerId;

        // If we are on a tenant subdomain, but the user's claims don't match the storeId yet,
        // we MUST wait or we'll get a permission-denied error.
        if (store && claims?.storeId && claims.storeId !== store.id && claims.role !== "system_admin") {
           // If they have a different storeId, they shouldn't be here, but let the security rules handle it
           // OR we can show a specific "Unauthorized" state.
           console.warn("User storeId mismatch:", { userStore: claims.storeId, tenantStore: store.id });
        }

        if (!store && !activeStoreId) {
          // FALLBACK: Find store by ownerId OR by staff storeId claim on main domain
          try {
            const ownerQuery = query(collection(db, "stores"), where("ownerId", "==", user.uid), limit(1));
            const ownerSnap = await getDocs(ownerQuery);
            
            if (!ownerSnap.empty) {
              activeStoreId = ownerSnap.docs[0].id;
              activeOwnerId = ownerSnap.docs[0].data().ownerId;
            } else if (claims?.storeId) {
              const storeRef = doc(db, "stores", claims.storeId);
              const storeSnap = await getDoc(storeRef);
              if (storeSnap.exists()) {
                activeStoreId = storeSnap.id;
                activeOwnerId = storeSnap.data().ownerId;
              }
            }
          } catch (lookupErr) {
            console.warn("Store lookup failed (may be offline), using cache:", lookupErr);
            const cached = loadCachedBusinessState();
            if (cached && cached.storeId) {
              activeStoreId = cached.storeId;
              activeOwnerId = cached.ownerId || undefined;
            }
          }

          if (!activeStoreId) {
            if (mounted) {
              const cached = loadCachedBusinessState();
              if (cached && cached.profile) {
                setProfile(cached.profile);
                setOwnerId(cached.ownerId);
                setStoreId(cached.storeId);
                setLoadingProfile(false);
                return;
              }
              setProfile(null);
              setOwnerId(null);
              setStoreId(null);
              setNeedsOnboarding(true);
              setLoadingProfile(false);
            }
            return;
          }
        }

        if (mounted) {
          setOwnerId(activeOwnerId || null);
          setStoreId(activeStoreId || null);

          const storeRef = doc(db, 'stores', activeStoreId!);
          unsubscribe = onSnapshot(storeRef, (snapshot) => {
            if (!mounted) return;
            if (snapshot.exists()) {
              const data = snapshot.data();
              const isComplete = data.setupComplete || !!data.slug;
              setNeedsOnboarding(!isComplete);
              
              const newProfile: BusinessProfile = {
                id: snapshot.id,
                storeDetails: {
                  name: data.name || "",
                  phone: data.storeDetails?.phone || "",
                  address: data.storeDetails?.address || "",
                  receiptFooter: data.storeDetails?.receiptFooter || "",
                  taxRate: data.storeDetails?.taxRate || 0,
                  slug: data.slug || "",
                  isPublic: data.storeDetails?.isPublic || false,
                  bankName: data.storeDetails?.bankName || "",
                  accountNumber: data.storeDetails?.accountNumber || "",
                  accountName: data.storeDetails?.accountName || "",
                },
                businessType: data.businessType || "retail",
                categories: data.categories || [],
                complexityLevel: data.complexityLevel || "basic",
                branding: data.branding || {},
                settings: data.settings || {},
                ownerId: data.ownerId,
              };
              setProfile(newProfile);
              setOwnerId(data.ownerId || null);
              cacheBusinessState(newProfile, data.ownerId || null, activeStoreId || null);
            } else {
              setProfile(null);
              setNeedsOnboarding(true);
            }
            setLoadingProfile(false);
          }, (err) => {
            console.error("Error in store profile snapshot:", err);
            if (mounted) setLoadingProfile(false);
          });
        }
      } catch (err) {
        console.error("Failed to setup business profile:", err);
        if (mounted) setLoadingProfile(false);
      }
    };

    setupProfile();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [user, store, loadingTenant, claims, claimsReady, selectedStoreId]);

  const updateProfile = async (updates: Partial<BusinessProfile>) => {
    if (!user || !ownerId) return;
    
    const isManager = claims?.role === 'manager' && claims?.storeId === storeId;
    const isAdmin = isAdminRole(claims?.role);
    
    // Only owners/admins/managers can update profile
    if (user.uid !== ownerId && !isManager && !isAdmin) {
      throw new Error("Only store owners or managers can update branding and settings.");
    }
    const docRef = doc(db, 'stores', storeId!);
    await updateDoc(docRef, updates);
  };

  // Merge store name into profile if profile is missing but store exists
  const effectiveProfile = profile || (store ? {
    id: store.id,
    storeDetails: {
      name: store.name,
      phone: "",
      address: "",
      slug: store.slug,
      isPublic: false,
      bankName: "",
      accountNumber: "",
      accountName: "",
    },
    businessType: "retail",
    categories: [],
    complexityLevel: "basic",
    branding: {},
    settings: {}
  } as BusinessProfile : null);

  return (
    <BusinessContext.Provider value={{ 
      profile: effectiveProfile, 
      loadingProfile, 
      updateProfile, 
      ownerId,
      storeId,
      needsOnboarding,
      switchStore
    }}>
      {children}
    </BusinessContext.Provider>
  );
};
