const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkStoreAndStaff() {
  const ownerId = "i7NLb51s3iQHwcKcemWlRVXzlqn2";
  console.log(`Checking store & staff for ownerId: ${ownerId}`);

  // Query stores collection
  const storesSnap = await db.collection("stores").where("ownerId", "==", ownerId).get();
  if (storesSnap.empty) {
    console.log("No store found with ownerId", ownerId);
    return;
  }

  const stores = [];
  storesSnap.forEach(doc => {
    stores.push({ id: doc.id, ...doc.data() });
  });

  console.log("\nSTORES FOUND:");
  console.log(JSON.stringify(stores, null, 2));

  // For each store, query the staff collection
  for (const store of stores) {
    console.log(`\nSTAFF FOR STORE: ${store.name} (${store.id})`);
    const staffSnap = await db.collection("staff").where("storeId", "==", store.id).get();
    if (staffSnap.empty) {
      console.log("No staff found for this store.");
      continue;
    }

    staffSnap.forEach(doc => {
      console.log(`- UID: ${doc.id}`);
      console.log(`  Data:`, JSON.stringify(doc.data(), null, 2));
    });
  }

  // Also query the user document in "users" collection
  console.log(`\nUSER DOCUMENT FOR OWNER ${ownerId}:`);
  const userDoc = await db.collection("users").doc(ownerId).get();
  if (userDoc.exists) {
    console.log(JSON.stringify(userDoc.data(), null, 2));
  } else {
    console.log("No user document in 'users' collection.");
  }

  // Also query Auth user claims
  try {
    const authUser = await admin.auth().getUser(ownerId);
    console.log(`\nAUTH USER CLAIMS FOR ${ownerId}:`);
    console.log(JSON.stringify(authUser.customClaims || {}, null, 2));
    console.log(`Email: ${authUser.email}`);
  } catch (err) {
    console.error("Auth lookup failed:", err.message);
  }
}

checkStoreAndStaff();
