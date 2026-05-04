import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './FirebaseAuthContext';
import { doc, onSnapshot, updateDoc, query, collection, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  const { user } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setOwnerId(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);

    // Try finding in users (Owner/Admin)
    const syncUserDoc = async () => {
      const userRef = doc(db, 'users', user.uid);
      const unsubUser = onSnapshot(userRef, async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as BusinessProfile;
          setProfile(data);
          setOwnerId(user.uid);
          setLoadingProfile(false);
        } else {
          // If not in users, check staff collection
          const staffRef = doc(db, 'staff', user.uid);
          const unsubStaff = onSnapshot(staffRef, async (staffSnap) => {
            if (staffSnap.exists()) {
              const staffData = staffSnap.data();
              const actualOwnerId = staffData.ownerId;
              setOwnerId(actualOwnerId);
              
              // Load the owner's profile for the staff member
              const ownerRef = doc(db, 'users', actualOwnerId);
              const unsubOwner = onSnapshot(ownerRef, (ownerSnap) => {
                if (ownerSnap.exists()) {
                  setProfile(ownerSnap.data() as BusinessProfile);
                }
                setLoadingProfile(false);
              });
              return () => unsubOwner();
            } else if (user.email) {
              // Fallback: search by email
              const q = query(collection(db, "staff"), where("email", "==", user.email), limit(1));
              const snapshot = await getDocs(q);
              if (!snapshot.empty) {
                const staffData = snapshot.docs[0].data();
                const actualOwnerId = staffData.ownerId;
                setOwnerId(actualOwnerId);
                
                // Load owner profile
                const ownerRef = doc(db, 'users', actualOwnerId);
                const ownerSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', actualOwnerId)));
                if (!ownerSnap.empty) {
                  setProfile(ownerSnap.docs[0].data() as BusinessProfile);
                }
              }
              setLoadingProfile(false);
            } else {
              setLoadingProfile(false);
            }
          });
          return () => unsubStaff();
        }
      });
      return () => unsubUser();
    };

    syncUserDoc();
  }, [user]);

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
