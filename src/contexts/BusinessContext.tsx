import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './FirebaseAuthContext';
import { doc, onSnapshot, updateDoc, query, collection, where, limit, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from './TenantContext';
import { useDemo } from '@/hooks/useDemo';
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
    lockPriceAtCheckout?: boolean;
  };
  businessType: string;
  categories: string[];
  complexityLevel: "basic" | "advanced";
  branding?: { logo?: string; primaryColor?: string; };
  settings?: Record<string, any>;
  ownerId?: string; // The root owner's UID
  subscriptionTier?: string;
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
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

// Cache key for offline resilience — scoped per user so switching accounts
// never surfaces another user's cached store/role state.
const getBusinessCacheKey = (uid: string | null) => `nexa_business_profile_${uid ?? "anonymous"}`;

const cacheBusinessState = (p: BusinessProfile, oId: string | null, sId: string | null, uid: string | null) => {
  try { localStorage.setItem(getBusinessCacheKey(uid), JSON.stringify({ profile: p, ownerId: oId, storeId: sId })); } catch (_) {}
};

const loadCachedBusinessState = (uid: string | null): { profile: BusinessProfile; ownerId: string | null; storeId: string | null } | null => {
  try {
    const c = localStorage.getItem(getBusinessCacheKey(uid));
    return c ? JSON.parse(c) : null;
  } catch (_) { return null; }
};

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, claims, claimsReady } = useAuth();
  const { store, loading: loadingTenant } = useTenant();
  const { isDemo, onboarding: demoOnboarding } = useDemo();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("nexa_system_admin_selected_store_id");
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
        localStorage.setItem("nexa_system_admin_selected_store_id", id);
      } else {
        localStorage.removeItem("nexa_system_admin_selected_store_id");
        localStorage.removeItem("nexa_system_admin_selected_store_slug");
        sessionStorage.removeItem("nexa_active_slug");
      }
    } catch (_) {}
  };

  // Load cached business profile immediately for offline resilience
  useEffect(() => {
    const cached = loadCachedBusinessState(user?.uid ?? null);
    if (cached && cached.profile && !profile) {
      setProfile(cached.profile);
      setOwnerId(cached.ownerId);
      setStoreId(cached.storeId);
    }
  }, [user?.uid]);

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

    // DEMO MODE: Skip all Firestore reads — provide a mock profile from demo onboarding
    if (isDemo) {
      const demoProfile: BusinessProfile = {
        id: `demo-store-${Date.now()}`,
        storeDetails: {
          name: demoOnboarding.storeName,
          phone: demoOnboarding.storePhone,
          address: demoOnboarding.storeAddress,
          receiptFooter: demoOnboarding.receiptFooter,
          taxRate: demoOnboarding.taxRate,
          slug: demoOnboarding.storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          isPublic: false,
        },
        businessType: demoOnboarding.businessType || "retail",
        categories: demoOnboarding.categories,
        complexityLevel: "basic",
        branding: { primaryColor: demoOnboarding.brandColor },
        settings: {},
        ownerId: user.uid,
      };
      setProfile(demoProfile);
      setOwnerId(user.uid);
      setStoreId(demoProfile.id);
      setNeedsOnboarding(false);
      setLoadingProfile(false);
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
            const cached = loadCachedBusinessState(user?.uid ?? null);
            if (cached && cached.storeId) {
              activeStoreId = cached.storeId;
              activeOwnerId = cached.ownerId || undefined;
            }
          }

          if (!activeStoreId) {
            if (mounted) {
              const cached = loadCachedBusinessState(user?.uid ?? null);
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
                subscriptionTier: data.subscriptionTier,
                subscriptionStatus: data.subscriptionStatus,
                trialEndsAt: data.trialEndsAt ?? null,
              };
              setProfile(newProfile);
              setOwnerId(data.ownerId || null);
              cacheBusinessState(newProfile, data.ownerId || null, activeStoreId || null, user?.uid ?? null);
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
    if (!user) throw new Error("Authentication required to update store settings.");
    if (!storeId) throw new Error("Store context not loaded. Please refresh and try again.");
    if (!ownerId) throw new Error("Store owner information is missing; cannot save settings.");

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
