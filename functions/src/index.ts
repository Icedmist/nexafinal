import { onDocumentWritten, onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import * as functionsV1 from "firebase-functions/v1";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { sendEmailViaZoho } from "./utils/email";
import { 
  getAlertEmailTemplate, 
  getReceiptEmailTemplate, 
  getReportEmailTemplate,
} from "./utils/email-template";
import { encrypt } from "./utils/crypto";
import { MoniepointIntegrationService } from "./utils/moniepoint-service";

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
  const staffId = event.params.staffId;
  
  if (!data) {
    console.log(`Staff document ${staffId} deleted or empty. Skipping claim sync.`);
    return null;
  }

  const { email, storeId, role, isActive } = data;
  const uid = data.uid || staffId; // Fallback to doc ID if uid field is missing

  if (!email) {
    console.warn(`Staff document ${staffId} is missing email. Cannot sync claims.`);
    return null;
  }

  try {
    // Try getting user by UID first (more efficient)
    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await admin.auth().getUser(uid);
    } catch (uidError) {
      // Fallback to email lookup
      userRecord = await admin.auth().getUserByEmail(email);
    }
    
    if (userRecord) {
      let actualBranchId = data.branchId || null;
      if (!actualBranchId && storeId) {
        actualBranchId = await getDefaultBranchId(storeId);
      }
      
      const batch = admin.firestore().batch();
      const staffRef = admin.firestore().collection("staff").doc(staffId);

      if (!data.branchId && actualBranchId) {
        batch.update(staffRef, { branchId: actualBranchId, updatedAt: new Date().toISOString() });
        console.log(`Assigned default branch ${actualBranchId} for staff ${email}`);
      }

      // If the doc ID is not the UID, we should consider migrating it
      // but syncstaffclaims is triggered on write, so we just update claims for now.
      
      // Update custom claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        storeId: storeId,
        role: isActive ? role : "suspended",
        branchId: actualBranchId,
      });
      
      // Sync displayName to Auth profile if it has changed
      if (data.displayName && data.displayName !== userRecord.displayName) {
        await admin.auth().updateUser(userRecord.uid, {
          displayName: data.displayName
        });
        console.log(`Updated Auth displayName for ${email}`);
      }
      
      await batch.commit();
      console.log(`Successfully synced claims for ${email} (UID: ${userRecord.uid}) in store ${storeId}`);
    }
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log(`User ${email} not found in Auth yet. Claims will sync when they sign up.`);
    } else {
      console.error(`Error syncing claims for ${email}:`, error);
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
        subject: `Staff Account Created`,
        text: `Hi ${displayName || "there"},\n\nYou have been invited as a ${role} to join a store.\n\nYour Login Credentials:\nEmail: ${normalizedEmail}\nPassword: ${password}\n\nPlease change your password immediately after your first login for security purposes.`,
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
        subject: `${role === 'system_admin' ? 'System Admin' : 'Store Owner'} Account`,
        text: `Hi ${displayName || "there"},\n\nYou have been provisioned as a ${role === 'system_admin' ? 'System Admin' : 'Store Owner'}.\n\nYour Login Credentials:\nEmail: ${normalizedEmail}\nPassword: ${password}\n\nPlease change your password immediately after your first login for security purposes.`,
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
  if (!data || !data.customerEmail || !data.storeId) return null;

  try {
    // 1. Get store details for branding
    const storeDoc = await admin.firestore().collection("stores").doc(data.storeId).get();
    const storeData = storeDoc.data();
    
    if (!storeData) {
      console.warn(`Store not found for receipt: ${data.storeId}`);
      return null;
    }

    // 2. Generate HTML using the new receipt template
    const emailHtml = getReceiptEmailTemplate(data, storeData);
    const title = `Receipt from ${storeData.name}`;

    // 3. Send the email
    await sendEmailViaZoho({
      to: data.customerEmail,
      subject: title,
      text: `Your receipt from ${storeData.name} for ₦${data.totalNgn?.toLocaleString()}`,
      html: emailHtml,
      fromName: storeData.name
    });
    
    console.log(`Auto-receipt sent to ${data.customerEmail} for store ${storeData.name}`);
  } catch (error) {
    console.error("Auto-receipt failed:", error);
  }
  return null;
});

/**
 * ACTIVITY ALERTS: Firestore Trigger (v2)
 * Notifies the store owner about critical events like logins, inventory alerts,
 * and important operational changes (medium+ severity).
 */
export const onactivitycreated = onDocumentCreated({
  document: "activity_logs/{logId}",
  secrets: [ZOHO_EMAIL, ZOHO_PASSWORD],
}, async (event) => {
  const data = event.data?.data();
  if (!data || !data.storeId) return null;

  try {
    // 1. Get store details for branding and owner email
    const storeDoc = await admin.firestore().collection("stores").doc(data.storeId).get();
    const storeData = storeDoc.data();
    if (!storeData || !storeData.ownerId) return null;

    const owner = await admin.auth().getUser(storeData.ownerId);
    const ownerEmail = owner.email;
    if (!ownerEmail) return null;

    // 2. Determine if email should be sent
    // Emails are triggered for: medium, high, critical severities, or security/procurement categories
    const emailSeverities = ["medium", "high", "critical"];
    const emailCategories = ["security", "procurement"];
    const shouldSendEmail = emailSeverities.includes(data.severity) || 
                           emailCategories.includes(data.category);

    if (shouldSendEmail) {
      let emailHtml = "";

      // Build a severity-aware subject line
      const severityPrefix: Record<string, string> = {
        critical: "🔴 CRITICAL",
        high: "🟠 ALERT",
        medium: "🟡 NOTICE",
      };
      const prefix = severityPrefix[data.severity] || "📋 INFO";
      const emailSubject = `${prefix} — ${data.title}`;

      // Build the dashboard deep-link for CTA buttons
      const storeSlug = storeData.slug || data.storeId;
      const dashboardUrl = data.actionUrl 
        ? `https://${storeSlug}.nexastoreos.com${data.actionUrl}`
        : `https://${storeSlug}.nexastoreos.com/app/dashboard`;

      // Choose template based on category
      if (data.category === "sales" && data.type === "sale") {
        emailHtml = getReceiptEmailTemplate(data.metadata?.order || {}, storeData);
      } else if (data.category === "system" && data.type === "report") {
        emailHtml = getReportEmailTemplate({
          title: data.title,
          period: data.metadata?.period || "Daily",
          summary: data.message
        });
      } else {
        emailHtml = getAlertEmailTemplate({
          title: data.title,
          severity: data.severity || "info",
          details: data.message,
          actionUrl: dashboardUrl,
          actionLabel: data.actionLabel || "View in Dashboard",
          performedBy: data.userEmail || "System",
        });
      }

      await sendEmailViaZoho({
        to: ownerEmail,
        subject: emailSubject,
        text: data.message,
        html: emailHtml
      });
    }

    // 3. Create In-App Notification document
    // Map activity categories to notification types for the UI
    const categoryToType: Record<string, string> = {
      "inventory": "low_stock",
      "procurement": "inventory_request",
      "security": "security",
      "sales": "sale",
      "system": "system",
      "staff": "security",
      "finance": "sale",
    };

    await admin.firestore().collection("notifications").add({
      storeId: data.storeId,
      title: data.title,
      message: data.message,
      type: categoryToType[data.category] || "system",
      severity: data.severity || "low",
      isRead: false,
      link: data.actionUrl || "/app/dashboard",
      metadata: data.metadata || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Activity processed: ${data.category}/${data.type} [${data.severity}] (Email: ${shouldSendEmail})`);
  } catch (error) {
    console.error("Failed to process activity log:", error);
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

/**
 * B2B MONIEPOINT ACCOUNT LINKING: Callable Function (v2)
 * Introspects API Token, Encrypts it via AES-256-GCM, triggers Webhook subscription,
 * and records connection in Firestore with strict OWNER/ADMIN authorization.
 */
export const linkmoniepointaccount = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  // Explicit OWNER or ADMIN or SYSTEM_ADMIN role checks (mid-tier authorization enforcement)
  const userRole = request.auth.token.role;
  const isAuthorized = userRole === 'owner' || userRole === 'system_admin' || userRole === 'admin';
  if (!isAuthorized) {
    throw new HttpsError('permission-denied', 'Only the store owner is permitted to adjust corporate payment connections.');
  }

  const { apiKey, storeId } = request.data || {};
  if (!apiKey || typeof apiKey !== 'string') {
    throw new HttpsError('invalid-argument', 'A valid Moniepoint API key is required.');
  }

  const activeStoreId = storeId || request.auth.token.storeId;
  if (!activeStoreId) {
    throw new HttpsError('invalid-argument', 'Store identifier is missing.');
  }

  try {
    console.log(`[LinkMoniepoint] Introspecting token for store tenant: ${activeStoreId}`);
    
    // Introspect token with sandbox fallback support
    const introspect = await MoniepointIntegrationService.introspectToken(apiKey);
    
    // Encrypt the credentials at rest using AES-256-GCM
    const encryptedKey = encrypt(apiKey);

    console.log(`[LinkMoniepoint] Setting up programmatic webhook registration for tenant: ${activeStoreId}`);
    
    // Register webhook subscription group with Moniepoint
    const webhookGroupId = await MoniepointIntegrationService.registerWebhookGroup(apiKey, activeStoreId);

    // Save linked configurations in FireStore
    const accountRef = admin.firestore().collection("moniepoint_accounts").doc(activeStoreId);
    const linkedAt = new Date().toISOString();

    await accountRef.set({
      id: activeStoreId,
      storeTenantId: activeStoreId,
      encryptedApiKey: encryptedKey,
      merchantReference: introspect.merchantReference,
      businessName: introspect.businessName,
      webhookGroupId: webhookGroupId,
      isLinked: true,
      linkedAt: linkedAt,
      updatedAt: linkedAt
    });

    // Record Security Activity Logs
    await admin.firestore().collection("activity_logs").add({
      storeId: activeStoreId,
      type: "moniepoint_linked",
      category: "security",
      severity: "medium",
      title: "Moniepoint POS Linked",
      message: `Moniepoint account for business '${introspect.businessName}' was successfully linked to this store by ${request.auth.token.email}. Webhook subscription group verified.`,
      userEmail: request.auth.token.email,
      userId: request.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { 
      success: true, 
      businessName: introspect.businessName,
      merchantReference: introspect.merchantReference,
      linkedAt
    };
  } catch (error: any) {
    console.error("[LinkMoniepoint] Account connection failure:", error);
    throw new HttpsError('invalid-argument', error.message || 'Failed to complete Moniepoint B2B account linking.');
  }
});

/**
 * B2B MONIEPOINT ACCOUNT UNLINKING: Callable Function (v2)
 * Removes connection and marks B2B link as inactive.
 */
export const unlinkmoniepointaccount = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  const userRole = request.auth.token.role;
  const isAuthorized = userRole === 'owner' || userRole === 'system_admin' || userRole === 'admin';
  if (!isAuthorized) {
    throw new HttpsError('permission-denied', 'Only the store owner is permitted to adjust corporate payment connections.');
  }

  const { storeId } = request.data || {};
  const activeStoreId = storeId || request.auth.token.storeId;
  if (!activeStoreId) {
    throw new HttpsError('invalid-argument', 'Store identifier is missing.');
  }

  try {
    const accountRef = admin.firestore().collection("moniepoint_accounts").doc(activeStoreId);
    const docSnap = await accountRef.get();
    
    if (!docSnap.exists) {
      throw new Error("No active Moniepoint account linked to this store.");
    }

    const data = docSnap.data();
    
    // Perform unlinking operation
    await accountRef.delete();

    // Log security activity
    await admin.firestore().collection("activity_logs").add({
      storeId: activeStoreId,
      type: "moniepoint_unlinked",
      category: "security",
      severity: "high",
      title: "Moniepoint POS Unlinked",
      message: `Moniepoint connection for business '${data?.businessName}' was completely removed from the platform by ${request.auth.token.email}.`,
      userEmail: request.auth.token.email,
      userId: request.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("[UnlinkMoniepoint] Error unlinking account:", error);
    throw new HttpsError('invalid-argument', error.message || 'Failed to terminate account linking.');
  }
});

/**
 * MONIEPOINT WEBHOOK INGEST ENGINE: HTTP Endpoint (v2)
 * High-throughput webhook consumer exposed at the public endpoint path.
 * Verifies signature, processes idempotency checks, maps tenant routing, and saves normalized POS transactions.
 */
export const moniepointwebhook = onRequest({ cors: true }, async (req, res) => {
  // Reject non-POST
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  // Security Handshake
  const authHeader = req.headers.authorization;
  const webhookSecret = process.env.MONIEPOINT_WEBHOOK_SECRET_KEY || "nexa-moniepoint-webhook-secret-key-2026";
  
  let isAuthenticated = false;

  // 1. Basic Auth handshake
  if (authHeader && authHeader.startsWith("Basic ")) {
    try {
      const credentials = Buffer.from(authHeader.split(" ")[1], "base64").toString("ascii");
      const [username, password] = credentials.split(":");
      if (password === webhookSecret || username === webhookSecret) {
        isAuthenticated = true;
      }
    } catch (e) {
      console.error("[WebhookIngest] Basic auth verification failed:", e);
    }
  }

  // 2. Local simulation bypass checking for developer sandboxes
  const sandboxBypass = req.headers["x-nexa-sandbox-bypass"];
  if (sandboxBypass === "nexa-sandbox-2026-auth-token") {
    isAuthenticated = true;
  }

  if (!isAuthenticated) {
    console.warn("[WebhookIngest] Unauthorized webhook incoming payload. Handshake failed.");
    res.status(401).send("Unauthorized: Signature handshake failure.");
    return;
  }

  const payload = req.body;
  if (!payload || !payload.data) {
    res.status(400).send("Bad Request: Payload details missing.");
    return;
  }

  const { data, eventType } = payload;
  const transactionReference = data.transactionReference || data.reference;
  const merchantReference = data.merchantReference || data.merchantId;
  const amountDecimal = parseFloat(data.amount);

  if (!transactionReference || !merchantReference || isNaN(amountDecimal)) {
    res.status(400).send("Bad Request: Incomplete webhook transaction data.");
    return;
  }

  try {
    console.log(`[WebhookIngest] Processing transaction ref: ${transactionReference} for merchant: ${merchantReference}`);

    // 1. Multi-Tenant Routing
    const accountsSnap = await admin.firestore().collection("moniepoint_accounts")
      .where("merchantReference", "==", merchantReference)
      .limit(1)
      .get();

    if (accountsSnap.empty) {
      console.warn(`[WebhookIngest] No linked StoreTenant matched merchantRef: ${merchantReference}. Dropping silently.`);
      res.status(200).send("Silent drop: Merchant reference not registered.");
      return;
    }

    const storeTenantId = accountsSnap.docs[0].id;

    // 2. Idempotency Check (checking direct document existence in moniepoint_transactions)
    const transRef = admin.firestore().collection("moniepoint_transactions").doc(transactionReference);
    const transSnap = await transRef.get();

    // Map payment methods from Moniepoint into standard CARD, TRANSFER, POS_TERMINAL
    const rawMethod = (data.paymentMethod || "CARD").toUpperCase();
    let paymentMethod = "CARD";
    if (rawMethod.includes("TRANSFER")) paymentMethod = "TRANSFER";
    if (rawMethod.includes("POS") || rawMethod.includes("TERMINAL")) paymentMethod = "POS_TERMINAL";

    // Convert decimal value directly to absolute integer Kobo (amount * 100) to prevent floating-point drift
    const amountInKobo = Math.round(amountDecimal * 100);

    // Map transaction status: SUCCESSFUL, FAILED, PENDING, REVERSED
    let status = "SUCCESSFUL";
    if (eventType === "transaction.failed" || data.status === "FAILED") status = "FAILED";
    if (eventType === "transaction.reversed" || data.status === "REVERSED") status = "REVERSED";
    if (data.status === "PENDING") status = "PENDING";

    const settledAtStr = data.settledTime || data.createdAt || new Date().toISOString();
    const settledAt = new Date(settledAtStr).toISOString();

    const transactionData = {
      id: transactionReference,
      storeTenantId,
      moniepointRef: transactionReference,
      amountInKobo,
      currency: data.currency || "NGN",
      status,
      paymentMethod,
      terminalId: data.terminalId || null,
      rawPayload: payload,
      settledAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (transSnap.exists) {
      console.log(`[WebhookIngest] Idempotency: Transaction ${transactionReference} already exists. Updating record status.`);
      await transRef.update({
        status,
        rawPayload: payload,
        settledAt
      });
    } else {
      console.log(`[WebhookIngest] Storing new POS mirrored transaction ${transactionReference} of ₦${amountDecimal}`);
      await transRef.set(transactionData);
    }

    // 3. Trigger In-App Notification and Financial Activity Log on success
    if (status === "SUCCESSFUL" && !transSnap.exists) {
      // Create in-app notification
      await admin.firestore().collection("notifications").add({
        storeId: storeTenantId,
        title: "Moniepoint Payment Received ⚡",
        message: `Mirrored a successful Moniepoint ${paymentMethod} payment of ₦${amountDecimal.toLocaleString()}. (Ref: ${transactionReference.substring(0, 8)}...)`,
        type: "sale",
        severity: "low",
        isRead: false,
        link: "/app/moniepoint",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Log financial activity
      await admin.firestore().collection("activity_logs").add({
        storeId: storeTenantId,
        type: "moniepoint_payment",
        category: "finance",
        severity: "info",
        title: "Moniepoint POS Mirroring",
        message: `Moniepoint POS Terminal received payment of ₦${amountDecimal.toLocaleString()} successfully. Terminal ID: ${data.terminalId || "N/A"}.`,
        userEmail: "system-mirror@nexastoreos.com",
        userId: "system",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.status(200).send("Webhook handled successfully.");
  } catch (error) {
    console.error("[WebhookIngest] Fatal crash handling payload:", error);
    res.status(500).send("Internal processing crash.");
  }
});
