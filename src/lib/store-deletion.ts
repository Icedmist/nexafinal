import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";

export interface StoreLockFailure {
  uid: string;
  email?: string;
  message: string;
}

export interface StoreDeletionResult {
  deleted: number;
  disabledUsers?: number;
  slug?: string;
  alreadyDeleted?: boolean;
  lockFailures?: StoreLockFailure[];
}

export interface StoreRestoreResult {
  success: boolean;
  storeId: string;
  slug: string;
  restoredUsers: number;
  failures: StoreLockFailure[];
}

export interface DeletedStoreSummary {
  id: string;
  name: string;
  slug: string;
  ownerId: string | null;
  deletedAt?: { seconds?: number } | null;
  deletedBy?: string | null;
  accountCount: number;
  lockFailures: StoreLockFailure[];
}

/**
 * Permanently deletes a store through the Admin SDK callable.
 *
 * The callable owns the whole operation so it can do things the client cannot:
 * cascade-delete every store-owned collection, tombstone the slug, disable the
 * associated Auth accounts, revoke their refresh tokens, and replace their
 * claims with a deleted-store marker. Keeping this server-side also means a
 * failure can be retried from the UI without the store silently disappearing.
 */
export async function deleteStorePermanently(
  storeId: string,
  reason?: string
): Promise<StoreDeletionResult> {
  if (!storeId) throw new Error("A store id is required.");

  const callable = httpsCallable<
    { storeId: string; reason?: string },
    StoreDeletionResult
  >(functions, "deletestore");

  const { data } = await callable({ storeId, reason });
  return data;
}

/**
 * Restores a store that was permanently deleted: recreates the store document,
 * re-enables its accounts, and releases the slug.
 */
export async function restoreStore(
  storeIdOrSlug: { storeId?: string; slug?: string }
): Promise<StoreRestoreResult> {
  const callable = httpsCallable<
    { storeId?: string; slug?: string },
    StoreRestoreResult
  >(functions, "restorestore");

  const { data } = await callable(storeIdOrSlug);
  return data;
}

/** Returns true when the store has been tombstoned. */
export async function isStoreDeleted(storeId: string | null | undefined): Promise<boolean> {
  if (!storeId) return false;
  try {
    // Lightweight marker readable by any authenticated client.
    const marker = await getDoc(doc(db, "deletedStoreMarkers", storeId));
    if (marker.exists()) return true;

    // Full tombstone (admin-only) is the fallback for retries/legacy data.
    const snap = await getDoc(doc(db, "deletedStores", storeId));
    return snap.exists();
  } catch (err) {
    console.warn("Could not check store tombstone:", err);
    return false;
  }
}

/** Returns true when the slug belongs to a deleted store and cannot be reused. */
export async function isSlugRetired(slug: string | null | undefined): Promise<boolean> {
  const normalized = (slug || "").trim().toLowerCase();
  if (!normalized) return false;

  try {
    const slugSnap = await getDoc(doc(db, "deletedSlugs", normalized));
    if (slugSnap.exists()) return true;

    // Defensive fallback for stores deleted before the deletedSlugs index
    // existed (or stores without a slug key).
    const tombstoneSnap = await getDocs(
      query(collection(db, "deletedStores"), where("slug", "==", normalized), limit(1))
    );
    return !tombstoneSnap.empty;
  } catch (err) {
    console.warn("Could not check retired slug:", err);
    return false;
  }
}

/** Lists deleted stores for the system-admin restore panel. */
export async function listDeletedStores(): Promise<DeletedStoreSummary[]> {
  const snap = await getDocs(collection(db, "deletedStores"));
  return snap.docs
    .map((entry) => {
      const data = entry.data();
      return {
        id: entry.id,
        name: (data.name as string) || "Deleted store",
        slug: (data.slug as string) || "",
        ownerId: (data.ownerId as string) || null,
        deletedAt: data.deletedAt ?? null,
        deletedBy: (data.deletedBy as string) || null,
        accountCount: Array.isArray(data.accounts) ? data.accounts.length : 0,
        lockFailures: Array.isArray(data.lockFailures)
          ? (data.lockFailures as StoreLockFailure[])
          : [],
      } satisfies DeletedStoreSummary;
    })
    .sort((a, b) => (b.deletedAt?.seconds ?? 0) - (a.deletedAt?.seconds ?? 0));
}

/**
 * Clears client-side store caches. Without this, a deleted store can keep
 * rendering from localStorage/sessionStorage after the Firestore document is
 * gone (tenant resolution and BusinessContext both cache aggressively).
 */
export function clearStoreClientCaches(options?: {
  storeId?: string | null;
  slug?: string | null;
}): void {
  if (typeof window === "undefined") return;

  const storeId = options?.storeId || null;

  const keysToRemove: string[] = [
    "nexa_active_slug",
    "nexa_active_branch_id",
    "nexa_system_admin_selected_store_id",
    "nexa_system_admin_selected_store_slug",
    "nexa_pos_cart_v1",
  ];

  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      const isStoreCache =
        key.startsWith("nexa_business_profile_") ||
        key.startsWith("nexa_tenant_persist_") ||
        key.startsWith("nexa_active_branch_id_") ||
        (storeId ? key.includes(storeId) : false);
      if (isStoreCache) keysToRemove.push(key);
    }

    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      const isStoreCache =
        key.startsWith("nexa_tenant_") ||
        key === "nexa_active_slug" ||
        (storeId ? key.includes(storeId) : false);
      if (isStoreCache) keysToRemove.push(key);
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch (err) {
    console.warn("Could not clear store caches:", err);
  }
}
