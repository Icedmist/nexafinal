import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore,
  enableIndexedDbPersistence,
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

// Natively purge legacy corrupted IndexedDB cache databases at browser level before Firestore initializes
if (typeof window !== "undefined" && typeof window.indexedDB !== "undefined") {
  const PURGE_KEY = "nexa_indexeddb_purged_v5";
  if (!localStorage.getItem(PURGE_KEY)) {
    try {
      if (typeof window.indexedDB.databases === "function") {
        window.indexedDB.databases().then((dbs) => {
          dbs.forEach((dbInfo) => {
            if (dbInfo.name && dbInfo.name.startsWith("firestore")) {
              console.log(`Native self-healing: deleting corrupted database ${dbInfo.name}`);
              window.indexedDB.deleteDatabase(dbInfo.name);
            }
          });
          localStorage.setItem(PURGE_KEY, "true");
        }).catch((err) => {
          console.error("Native database enumeration failed:", err);
        });
      } else {
        const projectId = firebaseConfig.projectId || "";
        if (projectId) {
          const defaultDbName = `firestore/[DEFAULT]/${projectId}/main`;
          window.indexedDB.deleteDatabase(defaultDbName);
        }
        localStorage.setItem(PURGE_KEY, "true");
      }
    } catch (e) {
      console.error("Native IndexedDB purge error:", e);
    }
  }
}

// Initialize Firestore using standard default config
const firestoreDb = getFirestore(app);

// Enable offline persistence using the highly stable, battle-tested legacy compat layer
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(firestoreDb)
    .then(() => {
      console.log("Firestore offline persistence enabled successfully via legacy stable layer.");
    })
    .catch((err) => {
      console.warn("Firestore offline persistence fell back to in-memory caching gracefully:", err.code);
    });
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
