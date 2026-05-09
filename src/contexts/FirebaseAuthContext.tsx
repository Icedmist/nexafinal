import * as React from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  type UserCredential
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { notifyActivity } from '@/lib/notification-service';

interface AuthContextType {
  user: User | null;
  claims: { storeId?: string; role?: string; branchId?: string | null } | null;
  loading: boolean;
  claimsReady: boolean; // NEW: Indicates if claims have been synced for the current user
  login: (email: string, pass: string) => Promise<UserCredential>;
  signup: (email: string, pass: string, displayName?: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  refreshClaims: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  claims: null,
  loading: true,
  claimsReady: false,
  login: async () => ({} as UserCredential),
  signup: async () => ({} as UserCredential),
  logout: async () => {},
  refreshClaims: async () => {},
  resetPassword: async () => {},
});

export const useAuth = () => React.useContext(AuthContext);

export const FirebaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [claims, setClaims] = React.useState<{ storeId?: string; role?: string; branchId?: string | null } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [claimsReady, setClaimsReady] = React.useState(false);

  const login = async (email: string, pass: string) => {
    try {
      console.log(`[Auth] Attempting login for: ${email}`);
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      
      // Reset claimsReady on new login to force a resync check
      setClaimsReady(false);
      
      if (cred.user) {
        console.log(`[Auth] Login successful for UID: ${cred.user.uid}`);
        const tokenResult = await cred.user.getIdTokenResult();
        console.log(`[Auth] Custom claims found:`, tokenResult.claims);
        
        await notifyActivity(
          "login",
          "Staff Login",
          `${cred.user.email} logged into the store.`,
          cred.user.uid,
          cred.user.email || "",
          tokenResult.claims.storeId as string,
          tokenResult.claims.branchId as string | null
        );
      }
      return cred;
    } catch (error: any) {
      console.error("Auth Login Error Details:", {
        code: error.code,
        message: error.message,
        email: email,
        passwordProvided: !!pass,
        passwordLength: pass?.length,
        config: {
          authDomain: auth.config?.authDomain,
          projectId: auth.app?.options?.projectId
        }
      });
      throw error;
    }
  };

  const signup = async (email: string, pass: string, displayName?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      setClaimsReady(false);
      if (displayName && cred.user) {
        await updateProfile(cred.user, { displayName });
      }
      if (cred.user) {
        await notifyActivity(
          "staff_onboarding",
          "New Account Created",
          `${cred.user.email} created a new account.`,
          cred.user.uid,
          cred.user.email || "",
          undefined // No storeId yet for new signups
        );
      }
      return cred;
    } catch (error: any) {
      console.error("Auth Signup Error:", {
        code: error.code,
        message: error.message,
        email: email
      });
      throw error;
    }
  };

  const logout = async () => {
    setClaimsReady(false);
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const refreshClaims = async () => {
    if (auth.currentUser) {
      try {
        const tokenResult = await auth.currentUser.getIdTokenResult(true);
        setClaims({
          storeId: tokenResult.claims.storeId as string,
          role: tokenResult.claims.role as string,
          branchId: tokenResult.claims.branchId as string | null,
        });
        setClaimsReady(true);
      } catch (error) {
        console.error("Error refreshing custom claims:", error);
      }
    }
  };

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // 1. Initial claim fetch
          let tokenResult = await currentUser.getIdTokenResult();
          
          // 2. If claims are missing (e.g. fresh signup), try refreshing a few times
          // This handles the delay in the background Cloud Function trigger
          // Note: System admins might not have a storeId, so we only wait if role is missing
          if (!tokenResult.claims.role) {
            console.log("Claims missing, attempting to sync permissions...");
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts && !tokenResult.claims.role) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s for trigger
              tokenResult = await currentUser.getIdTokenResult(true); // Force refresh
              attempts++;
            }
          }

          let finalClaims = {
            storeId: tokenResult.claims.storeId as string,
            role: tokenResult.claims.role as string,
            branchId: tokenResult.claims.branchId as string | null,
          };

          // Temporary: Force system_admin role for dev user
          if (currentUser.uid === 'cbCWDA2C8KT35O2FyhQG397vAJg2') {
            finalClaims.role = 'system_admin';
          }

          setClaims(finalClaims);
          setClaimsReady(true);
        } catch (error) {
          console.error("Error fetching custom claims:", error);
          setClaims(null);
          setClaimsReady(true); // Still set ready to allow UI to show "No Permission" instead of spinning
        }
      } else {
        setClaims(null);
        setClaimsReady(true);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, claims, loading, claimsReady, login, signup, logout, refreshClaims, resetPassword }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
