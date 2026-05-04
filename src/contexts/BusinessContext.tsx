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
      let actualOwnerId: string | null = null;

      // 1. If user is the owner of the current store
      if (store && user.uid === store.ownerId) {
        actualOwnerId = user.uid;
      } 
      // 2. If user is staff, get ownerId from their token claims or store metadata
      else if (claims?.storeId === store?.id) {
        actualOwnerId = store?.ownerId || null;
      }

      if (actualOwnerId) {
        setOwnerId(actualOwnerId);
        const ownerRef = doc(db, 'users', actualOwnerId);
        const unsubscribe = onSnapshot(ownerRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as BusinessProfile);
          } else {
            console.warn("Business profile not found for owner:", actualOwnerId);
            setProfile(null);
          }
          setLoadingProfile(false);
        }, (err) => {
          console.error("Error fetching business profile:", err);
          setLoadingProfile(false);
        });
        return unsubscribe;
      } else {
        setProfile(null);
        setOwnerId(null);
        setLoadingProfile(false);
        return null;
      }
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

  return (
    <BusinessContext.Provider value={{ profile, loadingProfile, updateProfile, ownerId }}>
      {children}
    </BusinessContext.Provider>
  );
};
