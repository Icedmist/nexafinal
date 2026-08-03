import { useEffect, useRef, useState } from "react";
import { waitForPendingWrites } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type OfflineStatus = "online" | "offline" | "syncing" | "not-synced";

/**
 * Centralized offline connectivity + sync status.
 *
 * Tracks the browser's online/offline state (navigator.onLine + events) and,
 * whenever we transition to offline, marks the app as having unsynced changes.
 * On reconnect it runs `waitForPendingWrites(db)` — which resolves once the
 * Firestore persistent cache has flushed every queued write — and reports
 * "syncing" in the meantime.
 *
 * This avoids calling disableNetwork()/enableNetwork() (which crash firebase-js-sdk
 * #9172) and instead relies on Firestore's persistent local cache doing the
 * queueing automatically.
 */
export function useOfflineStatus(): {
  isOnline: boolean;
  status: OfflineStatus;
  /** True while queued writes are being flushed after reconnecting. */
  isSyncing: boolean;
} {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [isSyncing, setIsSyncing] = useState(false);
  // Becomes true the moment we drop offline, and is only cleared once
  // waitForPendingWrites() confirms everything has been flushed.
  const notSyncedRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      notSyncedRef.current = true;
      setIsSyncing(true);
      // waitForPendingWrites resolves when the local cache is fully synced with
      // the backend (it throws offline). Wrap so it never breaks the UI.
      waitForPendingWrites(db)
        .then(() => { notSyncedRef.current = false; })
        .catch(() => { /* still offline; keep "offline"/"not-synced" state */ })
        .finally(() => setIsSyncing(false));
    };
    const handleOffline = () => {
      setIsOnline(false);
      notSyncedRef.current = true;
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  let status: OfflineStatus = "online";
  if (!isOnline) status = "offline";
  else if (isSyncing) status = "syncing";
  else if (notSyncedRef.current) status = "not-synced";

  return { isOnline, status, isSyncing };
}