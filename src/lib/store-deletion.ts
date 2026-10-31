import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const BATCH_SIZE = 400;

/**
 * Collections that hold store-owned records. Most are scoped by `storeId`;
 * a few legacy/integration collections use a different tenant field.
 */
const STORE_SCOPED_COLLECTIONS: { name: string; field?: string }[] = [
  { name: "products" },
  { name: "categories" },
  { name: "sales" },
  { name: "sales_forms" },
  { name: "movements" },
  { name: "customers" },
  { name: "customer_credits" },
  { name: "credit_topups" },
  { name: "debt_payments" },
  { name: "debt_records" },
  { name: "refunds" },
  { name: "expenses" },
  { name: "suppliers" },
  { name: "purchase_orders" },
  { name: "requests" },
  { name: "notifications" },
  { name: "activity_logs" },
  { name: "managerCollections" },
  { name: "customFields" },
  { name: "locations" },
  { name: "staff" },
  { name: "businesses" },
  { name: "subscriptionRequests" },
  { name: "support_chats" },
  { name: "support_tickets" },
  { name: "affiliatePartners" },
  { name: "achievements", field: "entityId" },
  { name: "agentEarnings" },
  { name: "device_telemetry" },
  { name: "emailLogs" },
  { name: "qrLeadEvents" },
  { name: "referrals" },
  { name: "reportDeliveries" },
  { name: "retentionEvents" },
  { name: "retentionTriggers" },
  { name: "subscriptionEvents" },
  { name: "moniepoint_transactions", field: "storeTenantId" },
];

/** Documents whose id is the store id rather than a field value. */
const STORE_KEYED_DOCUMENTS = ["moniepoint_accounts", "businesses"];

/** Documents whose id is `prefix + storeId`. */
const STORE_PREFIXED_DOCUMENTS = [{ collection: "engagementStreaks", prefix: "store_" }];

export interface StoreDeletionResult {
  deleted: number;
}

/**
 * Permanently removes a store and every record owned by it.
 *
 * Firestore does not cascade deletes, so deleting `stores/{id}` alone leaves
 * orphaned products, sales, staff, branches, etc. This walks every known
 * store-scoped collection in batches, then removes integration documents
 * keyed by the store id, and finally deletes the store document itself.
 */
export async function deleteStorePermanently(storeId: string): Promise<StoreDeletionResult> {
  if (!storeId) throw new Error("A store id is required.");

  let deleted = 0;
  const failedCollections: string[] = [];

  for (const target of STORE_SCOPED_COLLECTIONS) {
    const field = target.field ?? "storeId";
    try {
      for (;;) {
        const snap = await getDocs(
          query(
            collection(db, target.name),
            where(field, "==", storeId),
            limit(BATCH_SIZE)
          )
        );
        if (snap.empty) break;

        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();

        deleted += snap.size;
        if (snap.size < BATCH_SIZE) break;
      }
    } catch (err) {
      console.error(`Failed to delete ${target.name} records for store ${storeId}:`, err);
      failedCollections.push(target.name);
    }
  }

  // Integration/legacy documents are keyed by the store id rather than a field.
  for (const name of STORE_KEYED_DOCUMENTS) {
    try {
      const ref = doc(db, name, storeId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await deleteDoc(ref);
        deleted += 1;
      }
    } catch (err) {
      console.error(`Failed to delete ${name}/${storeId}:`, err);
      failedCollections.push(name);
    }
  }

  // Prefixed documents (e.g. engagementStreaks keyed by store_<storeId>)
  for (const item of STORE_PREFIXED_DOCUMENTS) {
    try {
      const ref = doc(db, item.collection, `${item.prefix}${storeId}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await deleteDoc(ref);
        deleted += 1;
      }
    } catch (err) {
      console.error(`Failed to delete ${item.collection}/${item.prefix}${storeId}:`, err);
      failedCollections.push(item.collection);
    }
  }

  if (failedCollections.length > 0) {
    throw new Error(
      `Could not remove data from: ${failedCollections.join(", ")}. The store was kept so deletion can be retried.`
    );
  }

  // Delete the store document last so a failed run can be retried safely.
  await deleteDoc(doc(db, "stores", storeId));
  deleted += 1;

  return { deleted };
}
