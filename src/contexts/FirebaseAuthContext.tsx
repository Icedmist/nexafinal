import * as React from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  type UserCredential
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { notifyActivity } from '@/lib/notification-service';

interface AuthContextType {
  user: User | null;
  claims: { storeId?: string; role?: string } | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<UserCredential>;
  signup: (email: string, pass: string, displayName?: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  refreshClaims: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  claims: null,
  loading: true,
  login: async () => ({} as UserCredential),
  signup: async () => ({} as UserCredential),
  logout: async () => {},
  refreshClaims: async () => {},
});

export const useAuth = () => React.useContext(AuthContext);

export const FirebaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [claims, setClaims] = React.useState<{ storeId?: string; role?: string } | null>(null);
  const [loading, setLoading] = React.useState(true);

  const login = async (email: string, pass: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      if (cred.user) {
        const tokenResult = await cred.user.getIdTokenResult();
        await notifyActivity(
          "login",
          "Staff Login",
          `${cred.user.email} logged into the store.`,
          cred.user.uid,
          cred.user.email || "",
          tokenResult.claims.storeId as string
        );
      }
      return cred;
    } catch (error: any) {
      console.error("Auth Login Error:", {
        code: error.code,
        message: error.message,
        email: email
      });
      throw error;
    }
  };

  const signup = async (email: string, pass: string, displayName?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
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
    await signOut(auth);
  };

  const refreshClaims = async () => {
    if (auth.currentUser) {
      try {
        const tokenResult = await auth.currentUser.getIdTokenResult(true);
        setClaims({
          storeId: tokenResult.claims.storeId as string,
          role: tokenResult.claims.role as string,
        });
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
          if (!tokenResult.claims.storeId || !tokenResult.claims.role) {
            console.log("Claims missing, attempting to sync permissions...");
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts && (!tokenResult.claims.storeId || !tokenResult.claims.role)) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s for trigger
              tokenResult = await currentUser.getIdTokenResult(true); // Force refresh
              attempts++;
            }
          }

          setClaims({
            storeId: tokenResult.claims.storeId as string,
            role: tokenResult.claims.role as string,
          });
        } catch (error) {
          console.error("Error fetching custom claims:", error);
          setClaims(null);
        }
      } else {
        setClaims(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, claims, loading, login, signup, logout, refreshClaims }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
