/**
 * Feature 11 — Server-side stock & debt ledger.
 *
 * Sale stock movement and credit/debt settlement are the two places where
 * client-side Firestore writes are most prone to races (overselling, double
 * debt-clearance). These callables move the authority to the server:
 *
 *   - `recordsale`   atomically verifies store ownership + stock availability
 *                    and deducts (or, for credit-note returns, replenishes)
 *                    inventory in a single transaction.
 *   - `settlecredit` computes a customer's outstanding debt server-side and
 *                    clears it while topping up their wallet atomically.
 *
 * Both still verify the caller's store access before writing anything, so a
 * compromised client cannot touch another store's data.
 */
import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

interface SaleItemInput {
  itemId: string;
  quantity: number;
  conversionFactor?: number;
  selectedUnit?: string | null;
}

interface RecordsaleInput {
  storeId?: string;
  branchId?: string | null;
  restock?: boolean;
  items: SaleItemInput[];
  [key: string]: any;
}

const fmt = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

/**
 * Resolve + authorize the caller's store access. Returns the storeId to write to.
 * Permission model mirrors the client store-assignment guard:
 *   - system_admin may write anywhere
 *   - a store-scoped user may only write to their claims storeId
 *   - the store owner (stores/{storeId}.ownerId) may write to their own store
 */
async function assertStoreAccess(
  request: CallableRequest<unknown>,
  requestedStoreId?: string
): Promise<string> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to update the ledger.");
  }

  const uid = request.auth.uid;
  const claims = request.auth.token || {};
  const role = claims.role as string | undefined;
  const claimsStoreId = claims.storeId as string | undefined;

  // Resolve the target store: prefer the caller's claims, then the payload.
  const targetStoreId =
    requestedStoreId || (claimsStoreId && claimsStoreId !== "PLATFORM" ? claimsStoreId : undefined);
  if (!targetStoreId) {
    throw new HttpsError("invalid-argument", "Unable to determine store. Refresh and try again.");
  }

  if (role === "system_admin") return targetStoreId;
  if (claimsStoreId && claimsStoreId !== "PLATFORM" && claimsStoreId === targetStoreId) return targetStoreId;

  // Owner check (owner may view multiple stores, so claims may not carry storeId).
  const storeSnap = await admin.firestore().collection("stores").doc(targetStoreId).get();
  if (storeSnap.exists && storeSnap.data()?.ownerId === uid) return targetStoreId;

  throw new HttpsError(
    "permission-denied",
    "You can only record ledger changes for your assigned store. Contact your administrator."
  );
}

/**
 * RECORD SALE / RETURN (callable)
 * Server-authoritative sale recording + stock movement. For a normal sale the
 * product stock is checked and deducted atomically; for a credit-note return
 * (`restock: true`) the items are put back into the catalog.
 */
export const recordsale = onCall({ cors: true }, async (request) => {
  const data = (request.data || {}) as RecordsaleInput;
  const items = Array.isArray(data.items) ? data.items : [];
  const restock = !!data.restock;

  if (items.length === 0) {
    throw new HttpsError("invalid-argument", "A sale must contain at least one line item.");
  }
  for (const item of items) {
    if (!item.itemId || !(item.quantity > 0)) {
      throw new HttpsError("invalid-argument", "Each line item needs a catalog product and a positive quantity.");
    }
  }

  const storeId = await assertStoreAccess(request, data.storeId);
  const uid = request.auth!.uid;
  const token = request.auth!.token || {};
  const recordedByName = (token.name as string | undefined) || (token.email as string | undefined) || "Staff";
  const now = new Date().toISOString();
  const db = admin.firestore();
  const saleRef = db.collection("sales").doc();

  const saleDoc: any = { ...data };
  delete saleDoc.items;
  delete saleDoc.restock;
  delete saleDoc.storeId;
  delete saleDoc.branchId;
  saleDoc.itemIds = items.map((i) => i.itemId);
  // Persist the full line items so UIs (dashboards, sales history) that render
  // sale.itemNames can iterate safely; itemIds remains for array-contains queries.
  saleDoc.items = items;
  saleDoc.storeId = storeId;
  saleDoc.branchId = data.branchId ?? null;
  saleDoc.ownerId = uid;
  saleDoc.recordedBy = uid;
  saleDoc.recordedByName = recordedByName;
  saleDoc.createdAt = now;
  saleDoc.updatedAt = now;

  try {
    await db.runTransaction(async (tx) => {
      const productSnaps: Array<{ item: SaleItemInput; data: any; delta: number }> = [];
      for (const item of items) {
        const ref = db.collection("products").doc(item.itemId);
        const snap = await tx.get(ref);
        if (!snap.exists) {
          throw new HttpsError("not-found", `Product not found: ${item.itemId}`);
        }
        const product = snap.data() as any;
        if (product.storeId !== storeId) {
          throw new HttpsError(
            "failed-precondition",
            `Product ${item.itemId} belongs to a different store — cannot update its inventory.`
          );
        }
        const delta = item.quantity * (item.conversionFactor || 1);
        if (!restock) {
          const available = Number(product.currentStock) || 0;
          if (available < delta) {
            throw new HttpsError(
              "failed-precondition",
              `Insufficient stock for ${product.name || item.itemId}: only ${available} available, ${delta} required.`
            );
          }
        }
        productSnaps.push({ item, data: product, delta });
      }

      tx.set(saleRef, saleDoc);

      for (const { item, delta } of productSnaps) {
        tx.update(db.collection("products").doc(item.itemId), {
          currentStock: FieldValue.increment(restock ? delta : -delta),
          updatedAt: now,
        });
        tx.set(db.collection("movements").doc(), {
          itemId: item.itemId,
          type: restock ? "received" : "shipped",
          quantity: delta,
          unitUsed: item.selectedUnit ?? null,
          reference: `${restock ? "Return" : "Sale"}: ${saleRef.id}`,
          notes: restock
            ? `Returned to stock via credit note for ${saleDoc.customerName || "Customer"}`
            : `Customer: ${saleDoc.customerName || "Walk-in"}`,
          storeId,
          branchId: data.branchId ?? null,
          ownerId: uid,
          performedBy: uid,
          performedByName: recordedByName,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    console.log(`recordsale: ${restock ? "return" : "sale"} ${saleRef.id} recorded for store ${storeId}`);
    return { saleId: saleRef.id, restock };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    console.error("recordsale failed:", error);
    throw new HttpsError("internal", "Failed to record the sale. Please try again.");
  }
});

interface SettleCreditInput {
  storeId?: string;
  customerPhone: string;
  customerName?: string;
  amountNgn: number;
  notes?: string;
}

/**
 * SETTLE CREDIT TOP-UP (callable)
 * Computes a customer's outstanding debt server-side, clears it, and credits
 * the remainder to their store wallet. Returns the split between credit and
 * debt clearance so the UI can reflect both.
 */
export const settlecredit = onCall({ cors: true }, async (request) => {
  const data = (request.data || {}) as SettleCreditInput;
  const phone = (data.customerPhone || "").trim();
  if (!phone || phone.length < 6) {
    throw new HttpsError("invalid-argument", "A valid customer phone number is required.");
  }
  const amount = Math.abs(Number(data.amountNgn) || 0);
  if (amount <= 0) {
    throw new HttpsError("invalid-argument", "A top-up amount greater than zero is required.");
  }

  const storeId = await assertStoreAccess(request, data.storeId);
  const uid = request.auth!.uid;
  const token = request.auth!.token || {};
  const recordedByName = (token.name as string | undefined) || (token.email as string | undefined) || "Staff";
  const now = new Date().toISOString();
  const db = admin.firestore();

  // Outstanding debt = unpaid credit sales + opening debts − payments received.
  let debt = 0;
  const salesSnap = await db.collection("sales").where("storeId", "==", storeId).get();
  salesSnap.forEach((d) => {
    const s = d.data() as any;
    if (s.customerPhone === phone && s.isCreditSale) {
      debt += s.remainingBalanceNgn && s.remainingBalanceNgn > 0 ? s.remainingBalanceNgn : s.totalNgn || 0;
    }
  });
  const debtsSnap = await db.collection("debt_records").where("storeId", "==", storeId).get();
  debtsSnap.forEach((d) => {
    const x = d.data() as any;
    if (x.customerPhone === phone) debt += Number(x.amountNgn) || 0;
  });
  const paySnap = await db.collection("debt_payments").where("storeId", "==", storeId).get();
  paySnap.forEach((d) => {
    const x = d.data() as any;
    if (x.customerPhone === phone) debt -= Number(x.amountNgn) || 0;
  });

  const outstanding = Math.max(0, debt);
  const clearedDebt = Math.min(amount, outstanding);
  const toCredit = amount - clearedDebt;

  const balanceKey = `${storeId}_${phone}`;
  const balanceRef = db.collection("customer_credits").doc(balanceKey);
  const ledgerRef = db.collection("credit_topups").doc();

  await db.runTransaction(async (tx) => {
    if (clearedDebt > 0) {
      tx.set(db.collection("debt_payments").doc(), {
        customerPhone: phone,
        customerName: data.customerName?.trim() || "Customer",
        amountNgn: clearedDebt,
        paymentMethod: "store_credit",
        notes: data.notes ? `Cleared by store credit top-up: ${data.notes}` : "Cleared by store credit top-up",
        storeId,
        branchId: "none",
        recordedBy: uid,
        recordedByName,
        createdAt: now,
      });
    }

    if (toCredit > 0) {
      const snap = await tx.get(balanceRef);
      const current = snap.exists ? Number(snap.data()?.balanceNgn) || 0 : 0;
      const next = current + toCredit;
      if (snap.exists) {
        tx.update(balanceRef, {
          balanceNgn: next,
          customerName: data.customerName?.trim() || snap.data()?.customerName || "",
          storeId,
          updatedAt: now,
        });
      } else {
        tx.set(balanceRef, {
          customerPhone: phone,
          customerName: data.customerName?.trim() || "Customer",
          balanceNgn: next,
          storeId,
          updatedAt: now,
        });
      }
      tx.set(ledgerRef, {
        customerPhone: phone,
        customerName: data.customerName?.trim() || "Customer",
        amountNgn: toCredit,
        type: "topup",
        method: "manual",
        topupTotalNgn: amount,
        debtClearedNgn: clearedDebt,
        storeId,
        branchId: "none",
        saleId: null,
        notes: data.notes || null,
        recordedBy: uid,
        recordedByName,
        createdAt: now,
      });
    }
  });

  console.log(
    `settlecredit: ${phone} topped up ${fmt(amount)} for store ${storeId} — ${fmt(clearedDebt)} cleared debt, ${fmt(toCredit)} credited`
  );
  return { appliedToCredit: toCredit, clearedDebt };
});
