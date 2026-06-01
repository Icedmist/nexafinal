import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  getFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  doc, 
  setDoc, 
  getDoc 
} from "firebase/firestore";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  console.error("FIREBASE ERROR: VITE_FIREBASE_API_KEY is missing! Please check your .env file.");
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "missing-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Initialize Firestore with persistent IndexedDB cache for full offline support.
//
// The ca9/b815 assertion crash (firebase-js-sdk #9172) was caused by
// disableNetwork()/enableNetwork() calls in Header.tsx, NOT by
// persistentLocalCache itself. Those calls have been permanently removed.
//
// We use persistentSingleTabManager (NOT multi-tab) to avoid cross-tab
// IndexedDB locking conflicts that also trigger assertion failures.
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager({ forceOwnership: true }),
    }),
  });
} catch (_e) {
  // Already initialized (hot-reload / duplicate import) — reuse instance
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");

// Helpers
export const createUserProfile = async (uid: string, data: any) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, data, { merge: true });
};

export const getUserProfile = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
};

// Initialize Analytics conditionally
export let analytics: Analytics | undefined;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export default app;
