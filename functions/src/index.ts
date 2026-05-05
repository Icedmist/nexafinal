import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as functionsV1 from "firebase-functions/v1";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";

admin.initializeApp();

// Set global options to ensure all functions use the correct region
setGlobalOptions({ region: "us-central1" });

/**
 * AUTOMATIC ONBOARDING: Firestore Trigger (v2)
 * Synchronizes Custom Claims whenever a staff record changes.
 */
export const syncstaffclaims = onDocumentWritten("staff/{staffId}", async (event) => {
  const data = event.data?.after.exists ? event.data.after.data() : null;
  
  if (!data) return null;

  const { email, storeId, role, isActive } = data;

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    
    if (userRecord) {
      // Update custom claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        storeId: storeId,
        role: isActive ? role : "requestor"
      });
      
      // NEW: Sync displayName to Auth profile if it has changed
      if (data.displayName && data.displayName !== userRecord.displayName) {
        await admin.auth().updateUser(userRecord.uid, {
          displayName: data.displayName
        });
        console.log(`Updated Auth displayName for ${email}`);
      }
      
      console.log(`Successfully synced claims for ${email} in store ${storeId}`);
    }
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log(`User ${email} not found yet. Claims will sync on signup.`);
    } else {
      console.error("Error syncing claims:", error);
    }
  }
  return null;
});

/**
 * PROVISION STAFF: Callable Function (v2)
 * Allows an admin/owner to create a staff user with a password.
 */
export const provisionstaff = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  const { email, password, displayName, role, storeId, branchId, ownerId } = request.data;

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      storeId,
      role,
    });

    await admin.firestore().collection("staff").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName,
      role,
      storeId,
      branchId,
      ownerId,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    console.error("Provisioning error:", error);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * AUTH TRIGGER: onUserCreated (v1)
 * Auto-assigns claims on signup if the email exists in the staff list.
 * Note: Standard Auth triggers are not yet in v2.
 */
export const onusercreated = functionsV1.auth.user().onCreate(async (user: admin.auth.UserRecord) => {
  const email = user.email;
  if (!email) return;

  try {
    const staffSnap = await admin.firestore().collection("staff")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!staffSnap.empty) {
      const staffData = staffSnap.docs[0].data();
      
      await admin.auth().setCustomUserClaims(user.uid, {
        storeId: staffData.storeId,
        role: staffData.role
      });
      
      console.log(`Auto-assigned claims for new user: ${email}`);
    }
  } catch (error) {
    console.error("Error in onusercreated claim assignment:", error);
  }
});
