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
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  claims: null,
  loading: true,
  login: async () => ({} as UserCredential),
  signup: async () => ({} as UserCredential),
  logout: async () => {},
});

export const useAuth = () => React.useContext(AuthContext);

export const FirebaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [claims, setClaims] = React.useState<{ storeId?: string; role?: string } | null>(null);
  const [loading, setLoading] = React.useState(true);

  const login = async (email: string, pass: string) => {
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
  };

  const signup = async (email: string, pass: string, displayName?: string) => {
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
  };

  const logout = async () => {
    await signOut(auth);
  };

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Force refresh token to ensure we have the latest custom claims
          const tokenResult = await currentUser.getIdTokenResult(true);
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
    <AuthContext.Provider value={{ user, claims, loading, login, signup, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
