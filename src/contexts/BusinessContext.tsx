import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './FirebaseAuthContext';
import { getUserProfile } from '../lib/firebase';

export interface BusinessProfile {
  storeDetails: { name: string; phone: string; address: string; };
  businessType: string;
  categories: string[];
  complexityLevel: "basic" | "full";
}

interface BusinessContextType {
  profile: BusinessProfile | null;
  loadingProfile: boolean;
}

const BusinessContext = createContext<BusinessContextType>({ profile: null, loadingProfile: true });

export const useBusiness = () => useContext(BusinessContext);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (user) {
        setLoadingProfile(true);
        try {
          const data = await getUserProfile(user.uid);
          if (data) setProfile(data as BusinessProfile);
        } catch (err) {
          console.error("Failed to load business profile", err);
        }
      } else {
        setProfile(null);
      }
      setLoadingProfile(false);
    }
    loadProfile();
  }, [user]);

  return (
    <BusinessContext.Provider value={{ profile, loadingProfile }}>
      {children}
    </BusinessContext.Provider>
  );
};
