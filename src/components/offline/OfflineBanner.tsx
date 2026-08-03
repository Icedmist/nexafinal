import { WifiOff, Loader2 } from "lucide-react";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

/**
 * Slim banner shown under the header while the device is offline (or while
 * queued writes are still syncing). Reads served from the Firestore persistent
 * cache, writes are queued locally and flushed automatically on reconnect.
 */
export function OfflineBanner() {
  const { status } = useOfflineStatus();
  if (status === "online") return null;

  const offline = status === "offline";
  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest ${
        offline
          ? "bg-amber-500/15 text-amber-600 border-b border-amber-500/20"
          : "bg-sky-500/10 text-sky-600 border-b border-sky-500/20"
      }`}
      role="status"
    >
      {offline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>Offline — viewing cached data. Changes are saved on this device and will sync when you reconnect.</span>
        </>
      ) : (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Reconnected — syncing your changes…</span>
        </>
      )}
    </div>
  );
}