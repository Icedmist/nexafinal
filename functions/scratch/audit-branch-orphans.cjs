/**
 * ONE-OFF ADMIN AUDIT SCRIPT — Branch orphan detection.
 *
 * Background:
 *   syncstaffclaims used to fall back to getDefaultBranchId(storeId) whenever a
 *   staff doc was written with a falsy branchId, silently reassigning managers to
 *   the store's default branch. Products/movements are permanently tagged with the
 *   branchId active at creation time, so any unintended reassignment orphans every
 *   item a manager previously created.
 *
 * This script does NOT modify data. It:
 *   1. Reports staff docs whose branchId is "" (empty string, should be null).
 *   2. Cross-checks every branch-scoped staff member's currently assigned branchId
 *      (custom claims, falling back to the staff doc) against the branchIds on the
 *      products/movements they created, and flags anyone orphaned from their own
 *      historical data.
 *
 * Run (from the `functions` directory so firebase-admin resolves):
 *   node scratch/audit-branch-orphans.cjs
 *
 * Requires a Firebase service-account key. It is looked up (in order) at:
 *   ./service-account.json
 *   ../service-account.json
 *   ../../service-account.json
 * or via the GOOGLE_APPLICATION_CREDENTIALS env var.
 *
 * Exits with code 1 if any empty-string branchId or orphaned staff member is found.
 */
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

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

async function loadRecords(collectionName, creatorFields, storeIdField) {
  const snap = await db.collection(collectionName).get();
  const byCreator = new Map(); // `${storeId}::${uid}` -> { storeId, uid, branchIds: Set, count }
  snap.forEach((doc) => {
    const d = doc.data() || {};
    const storeId = d[storeIdField] || null;
    const creator = creatorFields.map((f) => d[f]).find((v) => typeof v === "string" && v.length > 0);
    if (!creator) return;
    const key = `${storeId}::${creator}`;
    if (!byCreator.has(key)) {
      byCreator.set(key, { storeId, uid: creator, branchIds: new Set(), count: 0 });
    }
    const entry = byCreator.get(key);
    entry.count += 1;
    entry.branchIds.add(d.branchId === undefined ? null : d.branchId);
  });
  return byCreator;
}

async function run() {
  const staffSnap = await db.collection("staff").get();
  const staffDocs = [];
  staffSnap.forEach((doc) => staffDocs.push({ id: doc.id, ...doc.data() }));

  console.log(`\n=== BRANCH ORPHAN AUDIT ===`);
  console.log(`Scanned ${staffDocs.length} staff records...\n`);

  // ---- Part 1: staff docs with branchId === "" (should be null) ----
  const emptyBranch = staffDocs.filter((s) => s.branchId === "");
  console.log("[1] STAFF WITH branchId === \"\" (should be null)");
  if (emptyBranch.length === 0) {
    console.log("  None found. Good.\n");
  } else {
    emptyBranch.forEach((s) => {
      console.log(`  - ${s.displayName || "?"} <${s.email || "?"}> (uid: ${s.id})`);
      console.log(`      role=${s.role} storeId=${s.storeId || "?"} branchId=${JSON.stringify(s.branchId)}`);
    });
    console.log("");
  }

  // ---- Part 2: orphaned branch-scoped staff ----
  console.log("[2] ORPHANED / PARTIAL BRANCH-SCOPED STAFF");

  const productByCreator = await loadRecords("products", ["ownerId", "createdBy", "addedBy"], "storeId");
  const movementByCreator = await loadRecords("movements", ["performedBy", "createdBy", "addedBy"], "storeId");

  const candidates = staffDocs.filter((s) => BRANCH_FILTERED_ROLES.includes(s.role));

  // Fetch custom claims (source of truth for the branch filter) for every candidate.
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

  const orphaned = [];
  const partial = [];
  const noHistory = [];
  const ok = [];

  for (const s of candidates) {
    const claimsInfo = claimsByUid.get(s.id) || { claims: {} };
    const claimsBranchId = claimsInfo.claims ? claimsInfo.claims.branchId : undefined;
    const assignedBranchId = claimsBranchId !== undefined && claimsBranchId !== null ? claimsBranchId : s.branchId;
    const claimsMismatch = claimsInfo.claims
      ? normalize(claimsBranchId) !== normalize(s.branchId)
      : false;

    const prodKey = `${s.storeId || "null"}::${s.id}`;
    const prod = productByCreator.get(prodKey);
    const mov = movementByCreator.get(prodKey);

    const historicalBranches = new Set();
    const counts = { products: prod ? prod.count : 0, movements: mov ? mov.count : 0 };
    if (prod) prod.branchIds.forEach((b) => historicalBranches.add(b));
    if (mov) mov.branchIds.forEach((b) => historicalBranches.add(b));

    const realHistorical = new Set([...historicalBranches].filter(isRealBranch));

    const entry = {
      uid: s.id,
      name: s.displayName || "?",
      email: s.email || "?",
      role: s.role,
      storeId: s.storeId || "?",
      docBranchId: s.branchId,
      claimsBranchId,
      assignedBranchId,
      claimsMismatch,
      counts,
      historicalBranches: [...historicalBranches].sort(),
    };

    if (counts.products === 0 && counts.movements === 0) {
      noHistory.push(entry);
      continue;
    }

    if (!isRealBranch(assignedBranchId)) {
      // Store-wide access (null / "" / "all") — nothing can be orphaned from the view.
      ok.push(entry);
      continue;
    }

    if (realHistorical.size === 0) {
      // Only store-wide ("all"/null) records — manager can still see them.
      ok.push(entry);
      continue;
    }

    if (realHistorical.has(assignedBranchId)) {
      if (realHistorical.size > 1) {
        partial.push(entry); // some records live in other branches
      } else {
        ok.push(entry);
      }
    } else {
      orphaned.push(entry);
    }
  }

  const printEntry = (e, status) => {
    console.log(`  ${status} ${e.name} <${e.email}> (uid: ${e.uid}, role: ${e.role})`);
    console.log(`      storeId=${e.storeId}`);
    console.log(`      doc branchId=${normalize(e.docBranchId)}  claims branchId=${normalize(e.claimsBranchId)}  ${e.claimsMismatch ? "(doc/claims MISMATCH)" : ""}`);
    console.log(`      assigned branchId=${normalize(e.assignedBranchId)}`);
    console.log(`      created: ${e.counts.products} product(s), ${e.counts.movements} movement(s)`);
    console.log(`      historical branchIds on their records: ${e.historicalBranches.map(normalize).join(", ") || "(none)"}`);
    console.log("");
  };

  console.log("  (only managers/staff with branch-scoped history are checked)");
  console.log("");
  if (orphaned.length === 0 && partial.length === 0) {
    console.log("  None found. Good.\n");
  } else {
    orphaned.forEach((e) => printEntry(e, "[ORPHANED]"));
    partial.forEach((e) => printEntry(e, "[PARTIAL ]"));
  }

  if (noHistory.length > 0) {
    console.log(`[2a] Branch-scoped staff with NO historical products/movements (${noHistory.length}) — skip:`);
    noHistory.forEach((e) => console.log(`  - ${e.name} <${e.email}> (uid: ${e.uid}, role: ${e.role})`));
    console.log("");
  }

  if (ok.length > 0) {
    console.log(`[2b] Branch-scoped staff OK (${ok.length}).`);
  }

  // ---- Part 3: summary ----
  console.log("\n=== SUMMARY ===");
  console.log(`  Staff scanned:            ${staffDocs.length}`);
  console.log(`  branchId === "":          ${emptyBranch.length}`);
  console.log(`  Branch-scoped staff:      ${candidates.length}`);
  console.log(`    ORPHANED (need fix):    ${orphaned.length}`);
  console.log(`    PARTIAL (need review):  ${partial.length}`);
  console.log(`    No history:             ${noHistory.length}`);
  console.log(`    OK:                     ${ok.length}`);

  const problems = emptyBranch.length + orphaned.length + partial.length;
  if (problems > 0) {
    console.log("\n\x1b[33m%s\x1b[0m", `ACTION REQUIRED: ${problems} issue(s) found. Manually verify each staff member above and reassign their branchId correctly before deploying the fix.`);
  } else {
    console.log("\n\x1b[32m%s\x1b[0m", "No issues found.");
  }

  process.exit(problems > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("\x1b[31m%s\x1b[0m", "Audit failed:", err);
  process.exit(1);
});
