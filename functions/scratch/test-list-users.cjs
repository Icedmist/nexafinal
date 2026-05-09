const admin = require("firebase-admin");
const serviceAccount = require("./nexa-storeos-firebase-adminsdk-hsk4i-0f38519e8e.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function listUsers() {
  try {
    const listUsersResult = await admin.auth().listUsers(10);
    console.log("Success! Found", listUsersResult.users.length, "users.");
    listUsersResult.users.forEach(user => {
      console.log(`- ${user.email} (${user.uid}) Claims:`, user.customClaims);
    });
  } catch (error) {
    console.error("Error listing users:", error);
  }
}

listUsers();
