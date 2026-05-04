import * as React from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  signOut,
  type UserCredential
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { notifyActivity } from '@/lib/notification-service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => React.useContext(AuthContext);

export const FirebaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  const login = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await notifyActivity(
        "login",
        "Staff Login",
        `${cred.user.email} logged into the store.`,
        cred.user.uid,
        cred.user.email || ""
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
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
