import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './FirebaseAuthContext';
import { doc, onSnapshot, updateDoc, query, collection, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from './TenantContext';

export interface BusinessProfile {
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
}

const BusinessContext = createContext<BusinessContextType>({ 
  profile: null, 
  loadingProfile: true,
  updateProfile: async () => {},
  ownerId: null
});

export const useBusiness = () => useContext(BusinessContext);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, claims } = useAuth();
  const { store, loading: loadingTenant } = useTenant();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || loadingTenant) {
      if (!loadingTenant) {
        setProfile(null);
        setOwnerId(null);
        setLoadingProfile(false);
      }
      return;
    }

    setLoadingProfile(true);

    const syncProfile = async () => {
      if (!store) {
        setProfile(null);
        setOwnerId(null);
        setLoadingProfile(false);
        return null;
      }

      setOwnerId(store.ownerId);
      
      // Listen to the store document for real-time profile updates
      const storeRef = doc(db, 'stores', store.id);
      const unsubscribe = onSnapshot(storeRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // Adapt store document to BusinessProfile interface
          setProfile({
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
          console.warn("Store document not found:", store.id);
          setProfile(null);
        }
        setLoadingProfile(false);
      }, (err) => {
        console.error("Error fetching store profile:", err);
        setLoadingProfile(false);
      });
      
      return unsubscribe;
    };

    const unsubPromise = syncProfile();
    return () => {
      unsubPromise.then(unsub => unsub?.());
    };
  }, [user, store, loadingTenant, claims]);

  const updateProfile = async (updates: Partial<BusinessProfile>) => {
    if (!user || !ownerId) return;
    // Only owners/admins can update profile
    if (user.uid !== ownerId) {
      throw new Error("Only store owners can update branding and settings.");
    }
    const docRef = doc(db, 'users', ownerId);
    await updateDoc(docRef, updates);
  };

  // Merge store name into profile if profile is missing but store exists
  const effectiveProfile = profile || (store ? {
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
      ownerId 
    }}>
      {children}
    </BusinessContext.Provider>
  );
};
