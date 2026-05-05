import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as functionsV1 from "firebase-functions/v1";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";

admin.initializeApp();

// Set global options to ensure all functions use the correct region
setGlobalOptions({ region: "us-central1" });

/**
 * Maps Firebase Auth error codes to descriptive HttpsErrors.
 */
const mapAuthError = (error: any): HttpsError => {
  const code = error?.code;
  const message = error?.message || "An authentication error occurred.";

  switch (code) {
    case "auth/email-already-exists":
      return new HttpsError("already-exists", "The email address is already in use by another account.");
    case "auth/invalid-email":
      return new HttpsError("invalid-argument", "The email address is improperly formatted.");
    case "auth/invalid-password":
      return new HttpsError("invalid-argument", "The password must be at least 6 characters long.");
    case "auth/user-not-found":
      return new HttpsError("not-found", "The specified user account could not be found.");
    case "auth/operation-not-allowed":
      return new HttpsError("permission-denied", "The requested operation is not allowed.");
    case "auth/weak-password":
      return new HttpsError("invalid-argument", "The password is too weak.");
    default:
      console.error("Unmapped Auth Error:", error);
      return new HttpsError("internal", message);
  }
};

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

export const updatestaffprofile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  const { uid, email: providedEmail, password, displayName, role, branchId } = request.data;

  if (!uid) {
    throw new HttpsError('invalid-argument', 'User UID is required.');
  }

  // Input Validation
  if (password && password.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters long.');
  }

  if (providedEmail && !providedEmail.includes('@')) {
    throw new HttpsError('invalid-argument', 'A valid email address is required.');
  }

  console.log(`Starting profile update for UID: ${uid}`, { 
    updates: { 
      email: !!providedEmail, 
      password: !!password, 
      displayName: !!displayName, 
      role: !!role 
    } 
  });

  try {
    let targetUid = uid;
    let userRecord: admin.auth.UserRecord | null = null;
    let email = providedEmail;

    // 1. Try to get user by provided UID
    try {
      userRecord = await admin.auth().getUser(uid);
      targetUid = userRecord.uid;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // 2. Fallback: Lookup by email if UID doesn't match Auth (for legacy/dirty data)
        if (!email) {
          const staffDoc = await admin.firestore().collection("staff").doc(uid).get();
          if (staffDoc.exists) {
            email = staffDoc.data()?.email;
          }
        }

        if (email) {
          try {
            userRecord = await admin.auth().getUserByEmail(email);
            targetUid = userRecord.uid;
            console.log(`Self-healed: Found user ${email} with actual UID ${targetUid} (was using ${uid})`);
          } catch (emailError: any) {
            if (emailError.code === 'auth/user-not-found') {
              console.warn(`User ${email} not found in Auth. Proceeding with Firestore-only update.`);
              userRecord = null;
            } else {
              throw emailError;
            }
          }
        }
      } else {
        throw error;
      }
    }

    // 3. Update Auth if user exists
    if (userRecord && targetUid) {
      const updatePayload: any = {};
      if (password) updatePayload.password = password;
      if (displayName) updatePayload.displayName = displayName;
      if (email) updatePayload.email = email;

      if (Object.keys(updatePayload).length > 0) {
        await admin.auth().updateUser(targetUid, updatePayload);
      }

      if (role) {
        const currentClaims = userRecord.customClaims || {};
        await admin.auth().setCustomUserClaims(targetUid, {
          ...currentClaims,
          role: role,
        });
      }
    }

    // 4. Update Firestore record
    const firestoreUpdate: any = {};
    if (targetUid) firestoreUpdate.uid = targetUid;
    if (displayName) firestoreUpdate.displayName = displayName;
    if (role) firestoreUpdate.role = role;
    if (branchId) firestoreUpdate.branchId = branchId;
    if (email) firestoreUpdate.email = email;

    if (Object.keys(firestoreUpdate).length > 0) {
      // Use set with merge:true to handle missing documents gracefully
      await admin.firestore().collection("staff").doc(uid).set(firestoreUpdate, { merge: true });
      
      // If we self-healed the UID, we should also ensure a document exists at the NEW targetUid
      if (targetUid && targetUid !== uid) {
        const staffDoc = await admin.firestore().collection("staff").doc(uid).get();
        if (staffDoc.exists) {
          const fullData = { ...staffDoc.data(), ...firestoreUpdate, uid: targetUid };
          await admin.firestore().collection("staff").doc(targetUid).set(fullData, { merge: true });
          // Note: We keep the old document for now to avoid breaking frontend refs, 
          // but the data is now synced to the correct ID as well.
          console.log(`Data mirrored to correct targetUid: ${targetUid}`);
        }
      }
    }

    return { 
      success: true, 
      authSync: !!userRecord,
      message: userRecord ? "Profile updated in Auth and Firestore" : "Profile updated in Firestore only (Auth account missing)"
    };
  } catch (error: any) {
    console.error("Update profile error:", {
      uid,
      errorCode: error.code,
      errorMessage: error.message,
      stack: error.stack
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw mapAuthError(error);
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
      const staffDoc = staffSnap.docs[0];
      const staffData = staffDoc.data();
      
      // Update custom claims
      await admin.auth().setCustomUserClaims(user.uid, {
        storeId: staffData.storeId,
        role: staffData.role
      });
      
      // Update the Firestore document to have the correct UID and doc ID
      const batch = admin.firestore().batch();
      
      // If the existing doc ID is not the UID, create a new one and delete the old one
      if (staffDoc.id !== user.uid) {
        const newRef = admin.firestore().collection("staff").doc(user.uid);
        batch.set(newRef, { ...staffData, uid: user.uid, updatedAt: new Date().toISOString() });
        batch.delete(staffDoc.ref);
        console.log(`Migrated staff record from ${staffDoc.id} to ${user.uid} for ${email}`);
      } else {
        batch.update(staffDoc.ref, { uid: user.uid, updatedAt: new Date().toISOString() });
      }
      
      await batch.commit();
      console.log(`Auto-assigned claims and linked record for new user: ${email}`);
    }
  } catch (error) {
    console.error("Error in onusercreated claim assignment:", error);
  }
});
