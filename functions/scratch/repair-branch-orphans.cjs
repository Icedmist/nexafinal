/**
 * ONE-OFF ADMIN REPAIR SCRIPT — Branch orphan normalization + correction.
 *
 * Background:
 *   syncstaffclaims used to fall back to getDefaultBranchId(storeId) whenever a
 *   staff doc was written with a falsy branchId, silently reassigning managers to
 *   the store's default branch. Products/movements are permanently tagged with the
 *   branchId active at creation time, so any unintended reassignment orphans every
 *   item a manager previously created (they remain visible to admins only).
 *
 * This script is READ-ONLY unless run with --apply. In dry-run mode it only
 * reports what it *would* change. Specifically:
 *   1. Normalizes staff docs whose branchId === "" (empty string) to null.
 *   2. For every branch-scoped staff member (manager/staff), compares their
 *      currently assigned branchId (custom claims, falling back to the staff doc)
 *      against the branchIds on the products/movements they created
 *      (ownerId/createdBy/addedBy == uid). If >= 90% of their records share a
 *      single branch that differs from their current assignment, it proposes an
 *      auto-correction to that branch. Ambiguous / mixed-branch / no-history cases
 *      are reported only.
 *
 * In --apply mode it writes:
 *   - staff/{uid}.branchId  (normalized or corrected) + updatedAt
 *   - matching custom claims via admin.auth().setCustomUserClaims, so a token
 *     refresh (see RoleContext branchId self-heal) immediately scopes correctly.
 *
 * Run (from the `functions` directory so firebase-admin resolves):
 *   node scratch/repair-branch-orphans.cjs             # dry-run
 *   node scratch/repair-branch-orphans.cjs --apply     # write corrections
 *
 * Requires a Firebase service-account key. It is looked up (in order) at:
 *   ./service-account.json
 *   ../service-account.json
 *   ../../service-account.json
 * or via the GOOGLE_APPLICATION_CREDENTIALS env var.
 *
 * Exits with code 1 if a dry-run found issues requiring action (or any apply
 * step failed). Exits 0 when clean, or when --apply successfully applied all
 * proposed changes.
 */
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const APPLY = process.argv.includes("--apply");

const SERVICE_ACCOUNT_CANDIDATES = [
  path.join(__dirname, "service-account.json"),
  path.join(__dirname, "..", "service-account.json"),
  path.join(__dirname, "..", "..", "service-account.json"),
];

const serviceAccountPath = SERVICE_ACCOUNT_CANDIDATES.find((p) => fs.existsSync(p));

const wellKnownAdc = path.join(
  process.env.HOME || "",
  ".config",
  "gcloud",
  "application_default_credentials.json"
);

if (!serviceAccountPath && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !fs.existsSync(wellKnownAdc)) {
  console.error("\x1b[31m%s\x1b[0m", "No service account found.");
  console.error("Place your Firebase service-account key at one of:");
  SERVICE_ACCOUNT_CANDIDATES.forEach((p) => console.error("  " + p));
  console.error("set GOOGLE_APPLICATION_CREDENTIALS to its path,");
  console.error("or run `gcloud auth application-default login`.");
  process.exit(1);
}

admin.initializeApp({
  credential: serviceAccountPath
    ? admin.credential.cert(require(serviceAccountPath))
    : admin.credential.applicationDefault(),
});

const db = admin.firestore();

const BRANCH_FILTERED_ROLES = ["manager", "staff"];
const SIMILARITY_THRESHOLD = 0.9; // >= 90% of a creator's records on one branch
const isRealBranch = (b) => typeof b === "string" && b !== "" && b !== "all" && b !== null && b !== undefined;
const normalize = (b) => (b === "" ? "(empty string)" : b === null || b === undefined ? "null" : b);

// Simple concurrency-limited mapper so Auth lookups don't hammer the API.
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function loadCreatorBranches(collectionName, creatorFields) {
  // key: `${storeId}::${uid}` -> { counts: Map<branchId, count>, total }
  const snap = await db.collection(collectionName).get();
  const byCreator = new Map();
  snap.forEach((doc) => {
    const d = doc.data() || {};
    const storeId = d.storeId || null;
    const creator = creatorFields.map((f) => d[f]).find((v) => typeof v === "string" && v.length > 0);
    if (!creator) return;
    const key = `${storeId}::${creator}`;
    if (!byCreator.has(key)) {
      byCreator.set(key, { counts: new Map(), total: 0 });
    }
    const entry = byCreator.get(key);
    entry.total += 1;
    const b = d.branchId === undefined ? null : d.branchId;
    entry.counts.set(b, (entry.counts.get(b) || 0) + 1);
  });
  return byCreator;
}

async function run() {
  console.log(`\n=== BRANCH ORPHAN REPAIR (${APPLY ? "--apply" : "DRY-RUN — no writes"}) ===`);

  const staffSnap = await db.collection("staff").get();
  const staffDocs = [];
  staffSnap.forEach((doc) => staffDocs.push({ id: doc.id, ...doc.data() }));
  console.log(`Scanned ${staffDocs.length} staff records.\n`);

  const productByCreator = await loadCreatorBranches("products", ["ownerId", "createdBy", "addedBy"]);
  const movementByCreator = await loadCreatorBranches("movements", ["performedBy", "createdBy", "addedBy"]);

  // ---- Part 1: staff docs with branchId === "" (should be null) ----
  const emptyBranch = staffDocs.filter((s) => s.branchId === "");
  console.log(`[1] STAFF WITH branchId === "" (${emptyBranch.length})` + (emptyBranch.length === 0 ? " — none.\n" : ""));
  emptyBranch.forEach((s) => {
    console.log(`  - ${s.displayName || "?"} <${s.email || "?"}> (uid: ${s.id}, role: ${s.role})`);
  });
  if (emptyBranch.length > 0) console.log("");

  // ---- Part 2: dominant-branch correction for branch-scoped staff ----
  console.log("[2] BRANCH-SCOPED STAFF — DOMINANT BRANCH CHECK\n");

  const candidates = staffDocs.filter((s) => BRANCH_FILTERED_ROLES.includes(s.role));

  const claimsByUid = new Map();
  const claimResults = await mapWithConcurrency(candidates, 10, async (s) => {
    try {
      const u = await admin.auth().getUser(s.id);
      return { uid: s.id, claims: u.customClaims || {} };
    } catch (err) {
      return { uid: s.id, claims: null, err: err.code || err.message };
    }
  });
  claimResults.forEach((r) => claimsByUid.set(r.uid, r));

  const corrections = [];
  const ambiguous = [];
  const noHistory = [];
  const ok = [];

  for (const s of candidates) {
    const claimsInfo = claimsByUid.get(s.id) || { claims: {} };
    const claimsBranchId = claimsInfo.claims ? claimsInfo.claims.branchId : undefined;
    const currentBranchId = claimsBranchId !== undefined && claimsBranchId !== null ? claimsBranchId : s.branchId;

    const key = `${s.storeId || "null"}::${s.id}`;
    const prod = productByCreator.get(key);
    const mov = movementByCreator.get(key);
    const counts = { products: prod ? prod.total : 0, movements: mov ? mov.total : 0 };
    if (counts.products === 0 && counts.movements === 0) {
      noHistory.push({ uid: s.id, name: s.displayName || "?", email: s.email || "?", role: s.role, counts });
      continue;
    }

    const combined = new Map();
    [prod, mov].filter(Boolean).forEach((e) => {
      e.counts.forEach((c, b) => combined.set(b, (combined.get(b) || 0) + c));
    });
    const total = combined.size ? [...combined.values()].reduce((a, b) => a + b, 0) : 0;
    const entries = [...combined.entries()].sort((a, b) => b[1] - a[1]);
    const [topBranch, topCount] = entries[0] || [null, 0];
    const confidence = total > 0 ? topCount / total : 0;

    const base = {
      uid: s.id,
      name: s.displayName || "?",
      email: s.email || "?",
      role: s.role,
      storeId: s.storeId || "?",
      docBranchId: s.branchId,
      claimsBranchId,
      currentBranchId,
      counts,
      total,
      topBranch,
      topCount,
      confidence,
    };

    if (!isRealBranch(topBranch)) {
      // Only store-wide ("all"/null) history — nothing to infer, nothing orphaned.
      ok.push(base);
      continue;
    }

    if (confidence >= SIMILARITY_THRESHOLD) {
      if (isRealBranch(currentBranchId) && currentBranchId === topBranch) {
        ok.push(base); // already assigned to the dominant branch
      } else {
        base.suggested = topBranch;
        corrections.push(base);
      }
    } else {
      ambiguous.push(base); // mixed-branch history or < 90% dominant branch
    }
  }

  const print = (e) => {
    console.log(`  ${e.name} <${e.email}> (uid: ${e.uid}, role: ${e.role})`);
    console.log(`      storeId=${e.storeId}`);
    console.log(`      doc branchId=${normalize(e.docBranchId)}  claims branchId=${normalize(e.claimsBranchId)}`);
    console.log(`      created: ${e.counts.products} product(s), ${e.counts.movements} movement(s) across ${e.total} record(s)`);
  };

  if (corrections.length === 0 && ambiguous.length === 0) {
    console.log("  None found. Good.\n");
  } else {
    corrections.forEach((e) => {
      print(e);
      console.log(`      dominant branch=${e.topBranch} (${e.topCount}/${e.total} = ${Math.round(e.confidence * 100)}%)  current=${normalize(e.currentBranchId)}`);
      console.log(`      -> ${APPLY ? "CORRECTING" : "WOULD CORRECT"} branchId to ${e.suggested}`);
      console.log("");
    });
    ambiguous.forEach((e) => {
      print(e);
      console.log(`      AMBIGUOUS: no dominant branch (top=${normalize(e.topBranch)} ${e.topCount}/${e.total}) — manual review required.`);
      console.log("");
    });
  }

  if (noHistory.length > 0) {
    console.log(`[2a] Branch-scoped staff with NO historical products/movements (${noHistory.length}) — report only:`);
    noHistory.forEach((e) => console.log(`  - ${e.name} <${e.email}> (uid: ${e.uid}, role: ${e.role})`));
    console.log("");
  }

  if (ok.length > 0) {
    console.log(`[2b] Branch-scoped staff already correct / store-wide (${ok.length}).`);
  }

  // ---- Apply (only with --apply) ----
  const needsAction = emptyBranch.length + corrections.length + ambiguous.length;
  if (APPLY) {
    const batch = db.batch();
    let writes = 0;
    const applied = [];
    for (const s of emptyBranch) {
      batch.update(db.collection("staff").doc(s.id), { branchId: null, updatedAt: new Date().toISOString() });
      writes += 1;
      applied.push({ uid: s.id, email: s.email || "?", field: "branchId: '' -> null" });
    }
    for (const c of corrections) {
      batch.update(db.collection("staff").doc(c.uid), { branchId: c.suggested, updatedAt: new Date().toISOString() });
      writes += 1;
      applied.push({ uid: c.uid, email: c.email, field: `branchId -> ${c.suggested}` });
    }
    if (writes > 0) await batch.commit();

    // Keep Auth claims in sync immediately (also re-synced by syncstaffclaims trigger).
    let claimErrors = 0;
    for (const a of applied) {
      try {
        const u = await admin.auth().getUser(a.uid);
        await admin.auth().setCustomUserClaims(a.uid, { ...(u.customClaims || {}), branchId: a.field.includes("null") ? null : a.field.split("-> ")[1] });
      } catch (err) {
        claimErrors += 1;
        console.error(`  Failed to update claims for ${a.uid}:`, err.message);
      }
    }

    console.log(`\n=== APPLY RESULT ===`);
    console.log(`  Firestore writes: ${writes}  (claim sync errors: ${claimErrors})`);
    applied.forEach((a) => console.log(`  - ${a.email} (uid: ${a.uid}): ${a.field}`));
    if (ambiguous.length > 0) {
      console.log(`  ${ambiguous.length} ambiguous case(s) NOT auto-corrected — review manually.`);
    }
    process.exit(writes > 0 && claimErrors > 0 ? 1 : 0);
  }

  console.log("\n=== SUMMARY ===");
  console.log(`  Staff scanned:           ${staffDocs.length}`);
  console.log(`  branchId === "":         ${emptyBranch.length}`);
  console.log(`  Branch-scoped staff:     ${candidates.length}`);
  console.log(`    WOULD CORRECT:         ${corrections.length}`);
  console.log(`    AMBIGUOUS (manual):    ${ambiguous.length}`);
  console.log(`    No history:            ${noHistory.length}`);
  console.log(`    OK:                    ${ok.length}`);

  if (needsAction > 0) {
    console.log("\n\x1b[33m%s\x1b[0m", `ACTION REQUIRED: ${needsAction} issue(s) found in dry-run. Review above, then run with --apply to write corrections.`);
    process.exit(1);
  }
  console.log("\n\x1b[32m%s\x1b[0m", "No issues found.");
  process.exit(0);
}

run().catch((err) => {
  console.error("\x1b[31m%s\x1b[0m", "Repair failed:", err);
  process.exit(1);
});
