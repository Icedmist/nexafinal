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
  isLoggingOut: boolean; // NEW: Indicates if the logout process is active
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
  isLoggingOut: false,
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
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [claimsReady, setClaimsReady] = React.useState(false);

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

  const login = async (email: string, pass: string) => {
    try {
      console.log(`[Auth] Attempting login for: ${email}`);
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      
      // Reset claimsReady on new login and refresh custom claims immediately
      setClaimsReady(false);
      await refreshClaims();
      
      if (cred.user) {
        console.log(`[Auth] Login successful for UID: ${cred.user.uid}`);
        const tokenResult = await cred.user.getIdTokenResult();
        console.log(`[Auth] Custom claims found:`, tokenResult.claims);
        
        await notifyActivity({
          type: "login",
          category: "security",
          severity: "low",
          title: "Staff Login",
          message: `${cred.user.email} logged into the store.`,
          userId: cred.user.uid,
          userEmail: cred.user.email || "",
          storeId: tokenResult.claims.storeId as string | undefined,
          branchId: tokenResult.claims.branchId as string | null
        });
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
        await refreshClaims();
        await notifyActivity({
          type: "staff_onboarding",
          category: "system",
          severity: "medium",
          title: "New Account Created",
          message: `${cred.user.email} created a new account.`,
          userId: cred.user.uid,
          userEmail: cred.user.email || "",
          storeId: "PLATFORM" // Using PLATFORM as placeholder for initial signup
        });
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
    setIsLoggingOut(true);
    setClaimsReady(false);
    
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Auth signOut failed:", err);
    }
    
    // 1. Hard clear all persistent data
    localStorage.clear();
    sessionStorage.clear();
    
    // 2. Reset any application-specific cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // 3. Clear IndexedDB (used by Firebase and other libraries)
    try {
      const dbs = await window.indexedDB.databases();
      dbs.forEach(db => {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      });
    } catch (e) {
      console.warn("Failed to clear IndexedDB:", e);
    }

    // 4. Clear Cache Storage (Service Workers, etc.)
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
      }
    } catch (e) {
      console.warn("Failed to clear Cache Storage:", e);
    }

    // 4. Force a full page reload to the current host to reset all application state/contexts
    // This ensures the user stays in their store's URL context after logging out.
    window.location.href = `${window.location.protocol}//${window.location.host}/`;
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // 1. Initial claim fetch
          let tokenResult = await currentUser.getIdTokenResult();
          
          // 2. If claims are missing, try refreshing a few times
          // Note: Dev users and System admins are prioritized for fast entry
          const devUids = ['cbCWDA2C8KT35O2FyhQG397vAJg2', 'AyUvAqqoqQUj4bvz7O3sET7ij7i2'];
          const isDev = devUids.includes(currentUser.uid);
          const hasRole = !!tokenResult.claims.role;
          const isSystemAdmin = tokenResult.claims.role === 'system_admin';
          
          // Only wait if it's NOT a dev user AND (role is missing OR (not system_admin and storeId missing))
          const needsWait = !isDev && (!hasRole || (!isSystemAdmin && !tokenResult.claims.storeId));

          if (needsWait) {
            console.log("Claims incomplete, attempting to sync permissions...");
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              tokenResult = await currentUser.getIdTokenResult(true);
              if (tokenResult.claims.role) break;
              attempts++;
            }
          }

          let finalClaims = {
            storeId: tokenResult.claims.storeId as string,
            role: tokenResult.claims.role as string,
            branchId: tokenResult.claims.branchId as string | null,
          };

          // Temporary: Force system_admin role for dev users if not already set in Auth
          if (isDev && finalClaims.role !== 'system_admin') {
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
    <AuthContext.Provider value={{ user, claims, loading, isLoggingOut, claimsReady, login, signup, logout, refreshClaims, resetPassword }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
