#!/usr/bin/env node
/**
 * fix_sales_forms_from_sales.js
 *
 * Admin migration script to ensure every sale created from a finalized form
 * has a corresponding `sales_forms` document (and that document has a
 * correct `storeId`). Run with service account credentials.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   node scripts/fix_sales_forms_from_sales.js --dry-run
 *   node scripts/fix_sales_forms_from_sales.js
 *
 * Options:
 *   --dry-run    : don't write changes, only print what would be done
 *   --limit=N    : process at most N sales (useful for testing)
 */

const admin = require('firebase-admin');
const argv = require('minimist')(process.argv.slice(2));

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('ERROR: Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path.');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const dryRun = !!argv['dry-run'] || !!argv.dryRun;
const limit = argv.limit ? parseInt(argv.limit, 10) : null;

(async () => {
  console.log(`Starting sales->forms sync (dryRun=${dryRun}, limit=${limit || 'none'})`);

  try {
    let query = db.collection('sales').where('source', '==', 'form');
    if (limit) query = query.limit(limit);
    const snap = await query.get();
    console.log(`Found ${snap.size} sales with source=form`);

    const toCreate = [];
    const toUpdate = [];
    const skipped = [];

    for (const doc of snap.docs) {
      const sale = doc.data();
      const saleId = doc.id;
      const formNumber = sale.formNumber;

      if (!formNumber) {
        skipped.push({ saleId, reason: 'no formNumber' });
        continue;
      }

      // Try to find existing sales_forms by formNumber + storeId
      let formsQuery = db.collection('sales_forms').where('formNumber', '==', formNumber);
      if (sale.storeId) formsQuery = formsQuery.where('storeId', '==', sale.storeId);
      const formsSnap = await formsQuery.limit(1).get();

      if (!formsSnap.empty) {
        const fdoc = formsSnap.docs[0];
        const fdata = fdoc.data();
        const updates = {};
        if (!fdata.saleId) updates.saleId = saleId;
        if (!fdata.storeId && sale.storeId) updates.storeId = sale.storeId;
        if (!fdata.branchId && sale.branchId) updates.branchId = sale.branchId || null;

        if (Object.keys(updates).length > 0) {
          toUpdate.push({ id: fdoc.id, updates });
        } else {
          skipped.push({ saleId, reason: 'form exists and up-to-date', formId: fdoc.id });
        }
      } else {
        // Prepare a creation payload based on sale fields
        const newForm = {
          formNumber: formNumber,
          formType: 'receipt',
          customerName: sale.customerName || null,
          customerPhone: sale.customerPhone || null,
          customerEmail: sale.customerEmail || null,
          items: sale.items || [],
          subtotalNgn: sale.subtotalNgn ?? sale.totalNgn ?? 0,
          discountAmountNgn: sale.discountAmountNgn ?? null,
          taxRate: sale.taxRate ?? null,
          taxAmountNgn: sale.taxAmountNgn ?? null,
          totalNgn: sale.totalNgn ?? 0,
          notes: sale.notes ?? null,
          status: 'finalized',
          saleId: saleId,
          recordedBy: sale.recordedBy || null,
          recordedByName: sale.recordedByName || null,
          createdAt: sale.createdAt || new Date().toISOString(),
          updatedAt: sale.updatedAt || sale.createdAt || new Date().toISOString(),
          storeId: sale.storeId || null,
          branchId: sale.branchId ?? null,
        };
        toCreate.push(newForm);
      }
    }

    console.log(`To create: ${toCreate.length}, to update: ${toUpdate.length}, skipped: ${skipped.length}`);

    if (dryRun) {
      console.log('DRY RUN: preview of operations:');
      console.log('Create examples:', toCreate.slice(0, 5));
      console.log('Update examples:', toUpdate.slice(0, 5));
      console.log('Skipped examples:', skipped.slice(0, 5));
      process.exit(0);
    }

    // Commit updates and creates in batches
    const BATCH_SIZE = 300;
    let created = 0;
    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = toCreate.slice(i, i + BATCH_SIZE);
      for (const form of chunk) {
        const ref = db.collection('sales_forms').doc();
        batch.set(ref, form);
      }
      await batch.commit();
      created += chunk.length;
      console.log(`Committed ${created}/${toCreate.length} created`);
    }

    let updated = 0;
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = toUpdate.slice(i, i + BATCH_SIZE);
      for (const u of chunk) {
        const ref = db.collection('sales_forms').doc(u.id);
        batch.update(ref, u.updates);
      }
      await batch.commit();
      updated += chunk.length;
      console.log(`Committed ${updated}/${toUpdate.length} updates`);
    }

    console.log(`Done. Created ${created}, Updated ${updated}, Skipped ${skipped.length}`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(2);
  }
})();
