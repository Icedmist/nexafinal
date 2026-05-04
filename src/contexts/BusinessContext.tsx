import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './FirebaseAuthContext';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface BusinessProfile {
  storeDetails: { name: string; phone: string; address: string; receiptFooter?: string; taxRate?: number; };
  businessType: string;
  categories: string[];
  complexityLevel: "basic" | "full";
  branding?: { logo?: string; primaryColor?: string; };
  settings?: Record<string, any>;
}

interface BusinessContextType {
  profile: BusinessProfile | null;
  loadingProfile: boolean;
  updateProfile: (updates: Partial<BusinessProfile>) => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType>({ 
  profile: null, 
  loadingProfile: true,
  updateProfile: async () => {} 
});

export const useBusiness = () => useContext(BusinessContext);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    const docRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data() as BusinessProfile);
      }
      setLoadingProfile(false);
    }, (err) => {
      console.error("Failed to sync business profile", err);
      setLoadingProfile(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updateProfile = async (updates: Partial<BusinessProfile>) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    await updateDoc(docRef, updates);
  };

  return (
    <BusinessContext.Provider value={{ profile, loadingProfile, updateProfile }}>
      {children}
    </BusinessContext.Provider>
  );
};
