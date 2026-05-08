const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// 1. Path to your service account key
// Download this from Firebase Console > Project Settings > Service Accounts
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: service-account.json not found!');
  console.log('Please download your service account key from the Firebase Console and save it as "service-account.json" in this directory.');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 2. The UID of the user you want to make a System Admin
// You can pass this as an argument: node set-admin-claims.cjs YOUR_UID
const uid = process.argv[2] || '1TgfYzMcu5NXhqswqLpdPSUrnOJ2';

console.log(`Setting system_admin claims for user: ${uid}...`);

admin.auth().setCustomUserClaims(uid, {
  role: 'system_admin'
})
.then(() => {
  console.log('\x1b[32m%s\x1b[0m', 'SUCCESS: Custom claims set successfully.');
  console.log('The user must sign out and sign back in (or refresh their token) for changes to take effect.');
  process.exit(0);
})
.catch((error) => {
  console.error('\x1b[31m%s\x1b[0m', 'Error setting custom claims:', error);
  process.exit(1);
});