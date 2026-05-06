import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './FirebaseAuthContext';
import { doc, onSnapshot, updateDoc, query, collection, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from './TenantContext';

export interface BusinessProfile {
  id: string;
  storeDetails: { name: string; phone: string; address: string; receiptFooter?: string; taxRate?: number; slug?: string; };
  businessType: string;
  categories: string[];
  complexityLevel: "basic" | "full";
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
}

const BusinessContext = createContext<BusinessContextType>({ 
  profile: null, 
  loadingProfile: true,
  updateProfile: async () => {},
  ownerId: null,
  storeId: null,
  needsOnboarding: false
});

export const useBusiness = () => useContext(BusinessContext);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, claims, claimsReady } = useAuth();
  const { store, loading: loadingTenant } = useTenant();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

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
        let activeStoreId = store?.id;
        let activeOwnerId = store?.ownerId;

        // If we are on a tenant subdomain, but the user's claims don't match the storeId yet,
        // we MUST wait or we'll get a permission-denied error.
        if (store && claims?.storeId && claims.storeId !== store.id) {
           // If they have a different storeId, they shouldn't be here, but let the security rules handle it
           // OR we can show a specific "Unauthorized" state.
           console.warn("User storeId mismatch:", { userStore: claims.storeId, tenantStore: store.id });
        }

        if (!store) {
          // FALLBACK: Find store by ownerId on main domain
          const q = query(collection(db, "stores"), where("ownerId", "==", user.uid), limit(1));
          const snap = await getDocs(q);
          
          if (snap.empty) {
            if (mounted) {
              setProfile(null);
              setOwnerId(null);
              setStoreId(null);
              setNeedsOnboarding(true);
              setLoadingProfile(false);
            }
            return;
          }
          
          activeStoreId = snap.docs[0].id;
          activeOwnerId = snap.docs[0].data().ownerId;
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
              
              setProfile({
                id: snapshot.id,
                storeDetails: {
                  name: data.name || "",
                  phone: data.storeDetails?.phone || "",
                  address: data.storeDetails?.address || "",
                  receiptFooter: data.storeDetails?.receiptFooter || "",
                  taxRate: data.storeDetails?.taxRate || 0,
                  slug: data.slug || "",
                },
                businessType: data.businessType || "retail",
                categories: data.categories || [],
                complexityLevel: data.complexityLevel || "basic",
                branding: data.branding || {},
                settings: data.settings || {},
                ownerId: data.ownerId,
              });
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
  }, [user, store, loadingTenant, claims, claimsReady]);

  const updateProfile = async (updates: Partial<BusinessProfile>) => {
    if (!user || !ownerId) return;
    
    const isManager = claims?.role === 'manager' && claims?.storeId === storeId;
    const isAdmin = claims?.role === 'admin' || claims?.role === 'owner' || claims?.role === 'system_admin';
    
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
      slug: store.slug
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
      needsOnboarding
    }}>
      {children}
    </BusinessContext.Provider>
  );
};
