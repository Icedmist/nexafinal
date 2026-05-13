import { onDocumentWritten, onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as functionsV1 from "firebase-functions/v1";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { sendEmailViaZoho } from "./utils/email";

admin.initializeApp();

// Secrets for Zoho email
const ZOHO_EMAIL = defineSecret("ZOHO_EMAIL");
const ZOHO_PASSWORD = defineSecret("ZOHO_PASSWORD");

// Set global options to ensure all functions use the correct region and minimize resource usage
setGlobalOptions({ 
  region: "us-central1",
  memory: "256MiB", // Lower default memory to save quota
  maxInstances: 10 // Prevent runaway scaling and quota consumption
});

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

const getDefaultBranchId = async (storeId: string): Promise<string | null> => {
  const storeDoc = await admin.firestore().collection("stores").doc(storeId).get();
  if (!storeDoc.exists) return null;
  const storeData = storeDoc.data() as any;
  const branches = Array.isArray(storeData?.branches) ? storeData.branches : [];
  const defaultBranch = branches.find((b: any) => b?.isMain) || branches[0];
  return defaultBranch?.id ?? null;
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
      let actualBranchId = data.branchId || null;
      if (!actualBranchId && storeId) {
        actualBranchId = await getDefaultBranchId(storeId);
      }
      
      if (!data.branchId && actualBranchId) {
        await admin.firestore().collection("staff").doc(event.params.staffId).update({ branchId: actualBranchId, updatedAt: new Date().toISOString() });
        console.log(`Assigned default branch ${actualBranchId} for staff ${email}`);
      }

      // Update custom claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        storeId: storeId,
        role: isActive ? role : "suspended",
        branchId: actualBranchId,
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
export const provisionstaff = onCall({ 
  cors: true,
  secrets: [ZOHO_EMAIL, ZOHO_PASSWORD],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  const { email, password, displayName, role, storeId, branchId } = request.data || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new HttpsError('invalid-argument', 'A valid password of at least 6 characters is required.');
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const userRecord = await admin.auth().createUser({
      email: normalizedEmail,
      password,
      displayName,
    });

    const assignedBranchId = branchId || await getDefaultBranchId(storeId);

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      storeId,
      role,
      branchId: assignedBranchId,
    });

    await admin.firestore().collection("staff").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName,
      role,
      storeId,
      branchId: assignedBranchId,
    });

    // Send invitation email
    try {
      await sendEmailViaZoho({
        to: normalizedEmail,
        subject: `Welcome to Nexa OS - Your Staff Account`,
        text: `Hi ${displayName || "there"},\n\nYou have been invited as a ${role} to join a store on the Nexa platform.\n\nYour Login Credentials:\nEmail: ${normalizedEmail}\nPassword: ${password}\n\nPlease change your password immediately after your first login for security purposes.`,
        actionUrl: "https://nexa-os.com/auth/login",
        actionLabel: "Login to Dashboard"
      });
    } catch (emailError) {
      console.error("Failed to send provision email:", emailError);
    }

    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    console.error("Provisioning error:", error);
    throw mapAuthError(error);
  }
});

/**
 * PROVISION PLATFORM USER: Callable Function (v2)
 * Allows a system admin to create a Store Owner or another System Admin.
 */
export const provisionplatformuser = onCall({ 
  cors: true, 
  secrets: [ZOHO_EMAIL, ZOHO_PASSWORD],
}, async (request) => {
  await checkSystemAdmin(request);

  const { email, password, displayName, role, storeName, storeSlug } = request.data || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new HttpsError('invalid-argument', 'A valid password of at least 6 characters is required.');
  }

  if (!role || !['owner', 'system_admin'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Valid platform role (owner or system_admin) is required.');
  }

  try {
    const normalizedEmail = email.toLowerCase();
    
    // 1. Create Auth User
    const userRecord = await admin.auth().createUser({
      email: normalizedEmail,
      password,
      displayName,
    });

    // 2. Set Custom Claims
    const claims: any = { role };
    
    // If it's a store owner, we might want to provision a store too if name/slug provided
    let storeId = null;
    if (role === 'owner' && storeName && storeSlug) {
      const storeRef = admin.firestore().collection("stores").doc();
      storeId = storeRef.id;
      
      await storeRef.set({
        id: storeId,
        name: storeName,
        slug: storeSlug.toLowerCase(),
        ownerId: userRecord.uid,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        subscription: "trial",
        businessType: "retail",
        settings: {
          currency: "NGN",
          taxRate: 0,
        }
      });
      
      claims.storeId = storeId;
    }

    await admin.auth().setCustomUserClaims(userRecord.uid, claims);

    // 3. Create User record in Firestore 'users' collection
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: normalizedEmail,
      displayName,
      role,
      storeId: storeId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send invitation email
    try {
      await sendEmailViaZoho({
        to: normalizedEmail,
        subject: `Welcome to Nexa OS - ${role === 'system_admin' ? 'System Admin' : 'Store Owner'} Account`,
        text: `Hi ${displayName || "there"},\n\nYou have been provisioned as a ${role === 'system_admin' ? 'System Admin' : 'Store Owner'} on the Nexa platform.\n\nYour Login Credentials:\nEmail: ${normalizedEmail}\nPassword: ${password}\n\nPlease change your password immediately after your first login for security purposes.`,
        actionUrl: "https://nexa-os.com/auth/login",
        actionLabel: "Login to Dashboard"
      });
    } catch (emailError) {
      console.error("Failed to send platform provision email:", emailError);
    }

    // 4. Record Activity
    await admin.firestore().collection("activity_logs").add({
      type: "platform_user_provisioned",
      title: "Platform User Created",
      message: `${role === 'system_admin' ? 'System Admin' : 'Store Owner'} ${email} was provisioned by ${request.auth?.token.email}`,
      userEmail: request.auth?.token.email,
      userId: request.auth?.uid,
      storeId: "system",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, uid: userRecord.uid, storeId };
  } catch (error: any) {
    console.error("Platform provisioning error:", error);
    throw mapAuthError(error);
  }
});

export const updatestaffprofile = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  const { uid, email: providedEmail, password, displayName, photoURL, role, branchId } = request.data || {};

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
      photoURL: !!photoURL,
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
      if (photoURL) updatePayload.photoURL = photoURL;
      if (email) updatePayload.email = email;

      if (Object.keys(updatePayload).length > 0) {
        await admin.auth().updateUser(targetUid, updatePayload);
      }

      if (role || branchId !== undefined) {
        const currentClaims = userRecord.customClaims || {};
        const storeId = currentClaims.storeId;
        
        if (!storeId) {
          console.warn(`Warning: storeId missing from custom claims for user ${targetUid}. Attempting recovery from Firestore.`);
        }

        await admin.auth().setCustomUserClaims(targetUid, {
          ...currentClaims,
          role: role || currentClaims.role,
          branchId: branchId !== undefined ? branchId : currentClaims.branchId || null,
        });
        console.log(`Updated claims for ${targetUid}: role=${role || currentClaims.role}, branchId=${branchId}`);
      }
    }

    // 4. Update Firestore record
    const firestoreUpdate: any = {};
    if (targetUid) firestoreUpdate.uid = targetUid;
    if (displayName) firestoreUpdate.displayName = displayName;
    if (role) firestoreUpdate.role = role;
    if (branchId) firestoreUpdate.branchId = branchId;
    if (photoURL) firestoreUpdate.photoURL = photoURL;
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
        role: staffData.role,
        branchId: staffData.branchId || null,
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

/**
 * SEND CUSTOM EMAIL: Callable Function (v2)
 * Sends an email using Zoho SMTP. Requires ZOHO_EMAIL and ZOHO_PASSWORD secrets.
 */
export const sendcustomemail = onCall({
  secrets: [ZOHO_EMAIL, ZOHO_PASSWORD],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  const { to, subject, text, html, fromName } = request.data;

  if (!to || !subject || !text) {
    throw new HttpsError('invalid-argument', 'Recipient, subject, and text are required.');
  }

  try {
    return await sendEmailViaZoho({ to, subject, text, html, fromName });
  } catch (error: any) {
    console.error("Failed to send custom email:", error);
    throw new HttpsError('internal', 'Failed to send email. Ensure Zoho credentials are configured.');
  }
});

/**
 * AUTO RECEIPT: Firestore Trigger (v2)
 * Sends an email receipt automatically if a customer email is provided during checkout.
 */
export const sendautoreceipt = onDocumentCreated({
  document: "sales/{saleId}",
  secrets: [ZOHO_EMAIL, ZOHO_PASSWORD],
}, async (event) => {
  const data = event.data?.data();
  if (!data || !data.customerEmail) return null;

  const { customerName, customerEmail, totalNgn, items, isCreditSale } = data;
  const itemsList = items.map((i: any) => `- ${i.itemName} (x${i.quantity}): ₦${i.unitPriceNgn.toLocaleString()}`).join("\n");

  const debtNote = isCreditSale 
    ? `\n\nIMPORTANT: This was a credit sale. You have an outstanding balance of ₦${totalNgn.toLocaleString()}. Kindly settle this at your earliest convenience.` 
    : "";

  const title = "Your Receipt from Nexa Store";
  const message = `Hi ${customerName || "Customer"},\n\nThank you for shopping with us! Your order total was ₦${totalNgn.toLocaleString()}.${debtNote}\n\nItems:\n${itemsList}\n\nWe appreciate your business! 🙏`;

  try {
    await sendEmailViaZoho({
      to: customerEmail,
      subject: title,
      text: message,
      // The sendEmailViaZoho utility will automatically wrap this in the beautified HTML template
    });
  } catch (error) {
    console.error("Auto-receipt failed:", error);
  }
  return null;
});

/**
 * ACTIVITY ALERTS: Firestore Trigger (v2)
 * Notifies the store owner about critical events like logins or inventory alerts.
 */
export const onactivitycreated = onDocumentCreated({
  document: "activity_logs/{logId}",
  secrets: [ZOHO_EMAIL, ZOHO_PASSWORD],
}, async (event) => {
  const data = event.data?.data();
  if (!data || !data.storeId) return null;

  // We only send emails for critical alerts to avoid spam
  const criticalTypes = ["login", "inventory_alert", "staff_onboarding", "inventory_request", "sale", "movement"];
  if (!criticalTypes.includes(data.type)) return null;

  try {
    // 1. Get store owner email
    const storeDoc = await admin.firestore().collection("stores").doc(data.storeId).get();
    const storeData = storeDoc.data();
    if (!storeData || !storeData.ownerId) return null;

    const owner = await admin.auth().getUser(storeData.ownerId);
    const ownerEmail = owner.email;
    if (!ownerEmail) return null;

    // 2. Format and send alert
    const title = `Nexa OS Alert: ${data.title}`;
    const message = `A new activity has been recorded in your store (${storeData.name}):\n\nEvent: ${data.title}\nDetails: ${data.message}\nUser: ${data.userEmail}\nTime: ${new Date().toLocaleString()}\n\nLog in to your dashboard to view more details.`;

    await sendEmailViaZoho({
      to: ownerEmail,
      subject: title,
      text: message,
      actionUrl: `https://${storeData.slug}.nexastoreos.com/app/dashboard`,
      actionLabel: "View Activity Log"
    });
    
    // 3. Create In-App Notification document
    const notificationTypeMap: Record<string, string> = {
      "inventory_alert": "low_stock",
      "inventory_request": "inventory_request",
      "staff_onboarding": "staff_onboarding",
      "login": "login",
      "sale": "sale",
      "movement": "movement"
    };

    await admin.firestore().collection("notifications").add({
      storeId: data.storeId,
      title: data.title,
      message: data.message,
      type: notificationTypeMap[data.type] || "system",
      isRead: false,
      link: data.type === "inventory_request" ? "/app/requests" : (data.type === "inventory_alert" ? "/app/catalog" : (data.type === "sale" ? "/app/sales" : "/app/dashboard")),
      referenceId: data.itemId || data.requestId || data.saleId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Alert email sent and notification created for owner ${ownerEmail} (event: ${data.type})`);
  } catch (error) {
    console.error("Failed to send activity alert:", error);
  }
  return null;
});

/**
 * HELPER: Verify System Admin status
 */
const checkSystemAdmin = async (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  // SELF-HEAL: Ensure primary dev users have the system_admin role
  const devUids = ['cbCWDA2C8KT35O2FyhQG397vAJg2', 'AyUvAqqoqQUj4bvz7O3sET7ij7i2'];
  const devEmails = ['hello@nexastoreos.com', 'talk2icedmist@gmail.com'];
  
  const isDev = devUids.includes(request.auth.uid) || devEmails.includes(request.auth.token.email);

  if (isDev && request.auth.token.role !== 'system_admin') {
    console.log(`CRITICAL: Self-healing role for dev user ${request.auth.uid} (${request.auth.token.email})`);
    try {
      await admin.auth().setCustomUserClaims(request.auth.uid, {
        role: 'system_admin',
        isPlatformAdmin: true
      });
      
      // Also update their Firestore record to match
      await admin.firestore().collection("users").doc(request.auth.uid).set({
        role: 'system_admin',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      throw new HttpsError("permission-denied", "SYSTEM ADMIN ROLE GRANTED. Please LOG OUT and LOG IN AGAIN to refresh your session.");
    } catch (e: any) {
      console.error("Self-heal failed:", e);
      if (e instanceof HttpsError) throw e;
    }
  }

  if (request.auth.token.role !== "system_admin") {
    throw new HttpsError("permission-denied", "Only system admins can perform this action.");
  }
};

/**
 * PING: Connectivity Test
 */
export const ping = onCall({ cors: true }, async () => {
  return { message: "Pong!", timestamp: new Date().toISOString() };
});

/**
 * LIST ALL USERS: Callable Function (v2)
 * Returns a list of all users from Firebase Auth.
 */
export const listallusers = onCall({ cors: true }, async (request) => {
  await checkSystemAdmin(request);

  const { maxResults = 1000, pageToken } = request.data || {};

  try {
    console.log(`System Admin ${request.auth?.uid} is listing users...`);
    const listUsersResult = await admin.auth().listUsers(maxResults, pageToken);
    
    // Fetch associated staff/user records from Firestore to enrich the data
    const users = listUsersResult.users.map((user) => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      disabled: user.disabled,
      lastSignInTime: user.metadata.lastSignInTime,
      creationTime: user.metadata.creationTime,
      customClaims: user.customClaims || {},
    }));

    console.log(`Successfully retrieved ${users.length} users.`);
    return {
      users,
      pageToken: listUsersResult.pageToken,
    };
  } catch (error: any) {
    console.error("CRITICAL: Error listing users from Auth:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    // Return error info as data to avoid SDK stripping
    return {
      error: true,
      errorMessage: error.message || "Unknown error",
      errorCode: error.code || 'no-code',
      errorStack: error.stack
    };
  }
});

/**
 * WIPE USER: Callable Function (v2)
 * Completely deletes a user from Auth and all related Firestore collections.
 */
export const wipeuser = onCall({ cors: true }, async (request) => {
  await checkSystemAdmin(request);

  const { uid } = request.data || {};
  if (!uid) {
    throw new HttpsError("invalid-argument", "User UID is required.");
  }

  try {
    // 1. Delete from Firebase Auth
    await admin.auth().deleteUser(uid);

    // 2. Delete from Firestore 'users' and 'staff'
    const batch = admin.firestore().batch();
    batch.delete(admin.firestore().collection("users").doc(uid));
    batch.delete(admin.firestore().collection("staff").doc(uid));
    
    // Also check for any 'staff' documents where 'uid' field matches (if docId was email/other)
    const staffQuery = await admin.firestore().collection("staff").where("uid", "==", uid).get();
    staffQuery.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();

    console.log(`Successfully wiped user ${uid} from platform.`);
    return { success: true };
  } catch (error: any) {
    console.error("Error wiping user:", error);
    if (error.code === 'auth/user-not-found') {
      // If user not in Auth, still try to clean Firestore
      await admin.firestore().collection("staff").doc(uid).delete();
      return { success: true, message: "User not found in Auth, but Firestore record cleaned." };
    }
    throw new HttpsError("internal", "Failed to wipe user data.");
  }
});

/**
 * UPDATE USER EMAIL: Callable Function (v2)
 * Allows a system admin to change any user's email address.
 * Syncs changes across Auth, 'users' collection, and 'staff' collection.
 */
export const updateuseremail = onCall({ cors: true }, async (request) => {
  await checkSystemAdmin(request);

  const { uid, newEmail } = request.data || {};

  if (!uid || !newEmail || !newEmail.includes('@')) {
    throw new HttpsError("invalid-argument", "Valid UID and new email address are required.");
  }

  try {
    const normalizedEmail = newEmail.toLowerCase();
    console.log(`System Admin ${request.auth?.uid} is updating email for user ${uid} to ${normalizedEmail}`);

    // 1. Update Firebase Auth
    await admin.auth().updateUser(uid, { email: normalizedEmail });

    // 2. Update Firestore 'users' collection
    const userRef = admin.firestore().collection("users").doc(uid);
    await userRef.set({ email: normalizedEmail, updatedAt: new Date().toISOString() }, { merge: true });

    // 3. Update Firestore 'staff' collection (if exists)
    const staffRef = admin.firestore().collection("staff").doc(uid);
    await staffRef.set({ email: normalizedEmail, updatedAt: new Date().toISOString() }, { merge: true });

    // 4. Also check for any 'staff' documents where 'uid' field matches (if docId was email/other)
    const staffQuery = await admin.firestore().collection("staff").where("uid", "==", uid).get();
    const batch = admin.firestore().batch();
    staffQuery.forEach((doc) => {
      batch.update(doc.ref, { email: normalizedEmail, updatedAt: new Date().toISOString() });
    });
    await batch.commit();

    return { success: true, message: `Email updated to ${normalizedEmail} successfully.` };
  } catch (error: any) {
    console.error("Error updating user email:", error);
    throw mapAuthError(error);
  }
});

/**
 * GET PLATFORM STATS: Callable Function (v2)
 * Aggregates high-level metrics across the entire platform.
 */
export const getplatformstats = onCall({ cors: true }, async (request) => {
  await checkSystemAdmin(request);

  try {
    const storesSnap = await admin.firestore().collection("stores").get();
    const usersSnap = await admin.firestore().collection("users").get();
    const staffSnap = await admin.firestore().collection("staff").get();
    // Calculate monthly growth (last 6 months)
    const now = new Date();
    const monthlyGrowth: Record<string, number> = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthYear = d.toLocaleString('default', { month: 'short' });
      monthlyGrowth[monthYear] = 0;
    }

    storesSnap.docs.forEach(doc => {
      const createdAt = doc.data().createdAt;
      if (createdAt) {
        const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        const monthYear = date.toLocaleString('default', { month: 'short' });
        if (monthlyGrowth[monthYear] !== undefined) {
          monthlyGrowth[monthYear]++;
        }
      }
    });

    const growthData = Object.entries(monthlyGrowth).map(([name, stores]) => ({ name, stores }));

    return {
      totalStores: storesSnap.size,
      totalUsers: usersSnap.size,
      totalStaff: staffSnap.size,
      growthData,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error getting platform stats:", error);
    throw new HttpsError("internal", "Failed to retrieve platform statistics.");
  }
});
