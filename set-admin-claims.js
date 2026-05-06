const admin = require('firebase-admin');

// Initialize Firebase Admin with your service account
// You need to download your service account key from Firebase Console
// Go to Project Settings > Service Accounts > Generate new private key
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = '1TgfYzMcu5NXhqswqLpdPSUrnOJ2';

admin.auth().setCustomUserClaims(uid, {
  role: 'system_admin',
  storeId: 'your-store-id' // Replace with your actual store ID
}).then(() => {
  console.log('Custom claims set successfully');
}).catch((error) => {
  console.error('Error setting custom claims:', error);
});