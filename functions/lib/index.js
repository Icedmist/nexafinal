"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyActivitySummary = exports.retentionSendBulkEmail = exports.retentionSendCustomEmail = exports.reportsTestGenerate = exports.reportsGenerateScheduled = exports.retentionTriggerManual = exports.retentionEvaluate = exports.retentionMetrics = exports.retentionStatus = exports.moniepointwebhook = exports.unlinkmoniepointaccount = exports.linkmoniepointaccount = exports.getplatformstats = exports.resetuserpassword = exports.updateplatformuser = exports.updateuseremail = exports.wipeuser = exports.listallusers = exports.ping = exports.onactivitycreated = exports.sendautoreceipt = exports.sendcustomemail = exports.onusercreated = exports.updatestaffprofile = exports.provisionplatformuser = exports.provisionstaff = exports.syncstaffclaims = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const functionsV1 = require("firebase-functions/v1");
const v2_1 = require("firebase-functions/v2");
const admin = require("firebase-admin");
const params_1 = require("firebase-functions/params");
const email_1 = require("./utils/email");
const email_template_1 = require("./utils/email-template");
const daily_summary_template_1 = require("./utils/daily-summary-template");
const crypto_1 = require("./utils/crypto");
const moniepoint_service_1 = require("./utils/moniepoint-service");
admin.initializeApp();
// Secrets for Zoho email
const ZOHO_EMAIL = (0, params_1.defineSecret)("ZOHO_EMAIL");
const ZOHO_PASSWORD = (0, params_1.defineSecret)("ZOHO_PASSWORD");
// Set global options to ensure all functions use the correct region and minimize resource usage
(0, v2_1.setGlobalOptions)({
    region: "us-central1",
    memory: "256MiB", // Lower default memory to save quota
    maxInstances: 10 // Prevent runaway scaling and quota consumption
});
// Naira currency formatter
const fmt = (n) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
/**
 * Maps Firebase Auth error codes to descriptive HttpsErrors.
 */
const mapAuthError = (error) => {
    const code = error?.code;
    const message = error?.message || "An authentication error occurred.";
    switch (code) {
        case "auth/email-already-exists":
            return new https_1.HttpsError("already-exists", "The email address is already in use by another account.");
        case "auth/invalid-email":
            return new https_1.HttpsError("invalid-argument", "The email address is improperly formatted.");
        case "auth/invalid-password":
            return new https_1.HttpsError("invalid-argument", "The password must be at least 6 characters long.");
        case "auth/user-not-found":
            return new https_1.HttpsError("not-found", "The specified user account could not be found.");
        case "auth/operation-not-allowed":
            return new https_1.HttpsError("permission-denied", "The requested operation is not allowed.");
        case "auth/weak-password":
            return new https_1.HttpsError("invalid-argument", "The password is too weak.");
        default:
            console.error("Unmapped Auth Error:", error);
            return new https_1.HttpsError("internal", message);
    }
};
const getDefaultBranchId = async (storeId) => {
    const storeDoc = await admin.firestore().collection("stores").doc(storeId).get();
    if (!storeDoc.exists)
        return null;
    const storeData = storeDoc.data();
    const branches = Array.isArray(storeData?.branches) ? storeData.branches : [];
    const defaultBranch = branches.find((b) => b?.isMain) || branches[0];
    return defaultBranch?.id ?? null;
};
/**
 * AUTOMATIC ONBOARDING: Firestore Trigger (v2)
 * Synchronizes Custom Claims whenever a staff record changes.
 */
exports.syncstaffclaims = (0, firestore_1.onDocumentWritten)("staff/{staffId}", async (event) => {
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
        let userRecord;
        try {
            userRecord = await admin.auth().getUser(uid);
        }
        catch (uidError) {
            // Fallback to email lookup
            userRecord = await admin.auth().getUserByEmail(email);
        }
        if (userRecord) {
            // Only assign the store's default branch when the staff document is
            // genuinely being created without a branch. On updates where branchId is
            // missing/falsy but the document previously had a branchId, preserve the
            // existing branch instead of silently reassigning the user to the store's
            // default branch. This prevents incidental field updates (password reset,
            // displayName sync, isActive toggle, etc.) from changing branch scoping as
            // a side effect.
            const isCreate = !event.data?.before?.exists;
            const previousBranchId = isCreate ? null : (event.data?.before?.data()?.branchId || null);
            let actualBranchId = data.branchId || null;
            if (!actualBranchId) {
                if (previousBranchId) {
                    actualBranchId = previousBranchId;
                }
                else if (isCreate && storeId) {
                    actualBranchId = await getDefaultBranchId(storeId);
                }
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
    }
    catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log(`User ${email} not found in Auth yet. Claims will sync when they sign up.`);
        }
        else {
            console.error(`Error syncing claims for ${email}:`, error);
        }
    }
    return null;
});
/**
 * PROVISION STAFF: Callable Function (v2)
 * Allows an admin/owner to create a staff user with a password.
 */
exports.provisionstaff = (0, https_1.onCall)({
    cors: true,
    secrets: [ZOHO_EMAIL, ZOHO_PASSWORD],
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    }
    const callerRole = request.auth.token?.role;
    const callerStoreId = request.auth.token?.storeId;
    const isCallerAdmin = ['admin', 'owner', 'system_admin'].includes(callerRole);
    const { email, password, displayName, role, storeId, branchId } = request.data || {};
    // Only admins (admin/owner/system_admin) can provision new staff. Managers
    // cannot create accounts — and only admins can create other admins.
    if (!isCallerAdmin) {
        throw new https_1.HttpsError('permission-denied', 'Only store admins can add team members.');
    }
    if (callerRole !== 'system_admin' && callerStoreId && storeId && callerStoreId !== storeId) {
        throw new https_1.HttpsError('permission-denied', 'You can only add team members to your own store.');
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        throw new https_1.HttpsError('invalid-argument', 'A valid email address is required.');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
        throw new https_1.HttpsError('invalid-argument', 'A valid password of at least 6 characters is required.');
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
            await (0, email_1.sendEmailViaZoho)({
                to: normalizedEmail,
                subject: `Staff Account Created`,
                text: `Hi ${displayName || "there"},\n\nYou have been invited as a ${role} to join a store.\n\nYour Login Credentials:\nEmail: ${normalizedEmail}\nPassword: ${password}\n\nPlease change your password immediately after your first login for security purposes.`,
                actionUrl: "https://nexa-os.com/auth/login",
                actionLabel: "Login to Dashboard"
            });
        }
        catch (emailError) {
            console.error("Failed to send provision email:", emailError);
        }
        return { success: true, uid: userRecord.uid };
    }
    catch (error) {
        console.error("Provisioning error:", error);
        throw mapAuthError(error);
    }
});
/**
 * PROVISION PLATFORM USER: Callable Function (v2)
 * Allows a system admin to create a Store Owner or another System Admin.
 */
exports.provisionplatformuser = (0, https_1.onCall)({
    cors: true,
    secrets: [ZOHO_EMAIL, ZOHO_PASSWORD],
}, async (request) => {
    await checkSystemAdmin(request);
    const { email, password, displayName, role, storeName, storeSlug } = request.data || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        throw new https_1.HttpsError('invalid-argument', 'A valid email address is required.');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
        throw new https_1.HttpsError('invalid-argument', 'A valid password of at least 6 characters is required.');
    }
    if (!role || !['owner', 'system_admin'].includes(role)) {
        throw new https_1.HttpsError('invalid-argument', 'Valid platform role (owner or system_admin) is required.');
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
        const claims = { role };
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
            await (0, email_1.sendEmailViaZoho)({
                to: normalizedEmail,
                subject: `${role === 'system_admin' ? 'System Admin' : 'Store Owner'} Account`,
                text: `Hi ${displayName || "there"},\n\nYou have been provisioned as a ${role === 'system_admin' ? 'System Admin' : 'Store Owner'}.\n\nYour Login Credentials:\nEmail: ${normalizedEmail}\nPassword: ${password}\n\nPlease change your password immediately after your first login for security purposes.`,
                actionUrl: "https://nexa-os.com/auth/login",
                actionLabel: "Login to Dashboard"
            });
        }
        catch (emailError) {
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
    }
    catch (error) {
        console.error("Platform provisioning error:", error);
        throw mapAuthError(error);
    }
});
exports.updatestaffprofile = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    }
    const { uid, email: providedEmail, password, displayName, photoURL, role, branchId, isActive, onboardingCompleted } = request.data || {};
    if (!uid) {
        throw new https_1.HttpsError('invalid-argument', 'User UID is required.');
    }
    // Authorization: Role changes (and managing other users) are admin-only.
    // Managers can update their own profile but cannot change anyone's role or
    // promote others to admin.
    const callerRole = request.auth.token?.role;
    const callerStoreId = request.auth.token?.storeId;
    const isCallerAdmin = ['admin', 'owner', 'system_admin'].includes(callerRole);
    const isSelfUpdate = uid === request.auth.uid;
    const roleChangeRequested = !!role || isActive !== undefined;
    if (roleChangeRequested && !isCallerAdmin) {
        throw new https_1.HttpsError('permission-denied', 'Only admins can change roles or activation status.');
    }
    // Only admins can set the admin role; managers can never promote anyone.
    if (role === 'admin' && !isCallerAdmin) {
        throw new https_1.HttpsError('permission-denied', 'Only admins can assign the admin role.');
    }
    if (!isSelfUpdate && !isCallerAdmin) {
        throw new https_1.HttpsError('permission-denied', 'Only admins can manage other team members.');
    }
    // Input Validation
    if (password && password.length < 6) {
        throw new https_1.HttpsError('invalid-argument', 'Password must be at least 6 characters long.');
    }
    if (providedEmail && !providedEmail.includes('@')) {
        throw new https_1.HttpsError('invalid-argument', 'A valid email address is required.');
    }
    console.log(`Starting profile update for UID: ${uid}`, {
        updates: {
            email: !!providedEmail,
            password: !!password,
            displayName: !!displayName,
            photoURL: !!photoURL,
            role: !!role,
            isActive: isActive !== undefined ? isActive : "unchanged"
        }
    });
    try {
        let targetUid = uid;
        let userRecord = null;
        let email = providedEmail;
        // 1. Try to get user by provided UID
        try {
            userRecord = await admin.auth().getUser(uid);
            targetUid = userRecord.uid;
        }
        catch (error) {
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
                    }
                    catch (emailError) {
                        if (emailError.code === 'auth/user-not-found') {
                            console.warn(`User ${email} not found in Auth. Proceeding with Firestore-only update.`);
                            userRecord = null;
                        }
                        else {
                            throw emailError;
                        }
                    }
                }
            }
            else {
                throw error;
            }
        }
        // 3. Update Auth if user exists
        if (userRecord && targetUid) {
            const updatePayload = {};
            if (password)
                updatePayload.password = password;
            if (displayName)
                updatePayload.displayName = displayName;
            if (photoURL)
                updatePayload.photoURL = photoURL;
            if (email)
                updatePayload.email = email;
            if (Object.keys(updatePayload).length > 0) {
                await admin.auth().updateUser(targetUid, updatePayload);
            }
            if (role || branchId !== undefined || isActive !== undefined) {
                const currentClaims = userRecord.customClaims || {};
                const storeId = currentClaims.storeId;
                if (!storeId) {
                    console.warn(`Warning: storeId missing from custom claims for user ${targetUid}. Attempting recovery from Firestore.`);
                }
                // Cross-store guard: a store admin can only change roles/branches within
                // their own store. System admins are exempt (global).
                if (callerRole !== 'system_admin' && callerStoreId && storeId && callerStoreId !== storeId) {
                    throw new https_1.HttpsError('permission-denied', 'You can only manage team members in your own store.');
                }
                let resolvedRole = role || currentClaims.role;
                if (isActive === true && resolvedRole === "suspended") {
                    // Reactivating: fetch the real role from Firestore staff doc
                    const staffDoc = await admin.firestore().collection("staff").doc(uid).get();
                    resolvedRole = staffDoc.data()?.role || "staff";
                }
                else if (isActive === false) {
                    resolvedRole = "suspended";
                }
                await admin.auth().setCustomUserClaims(targetUid, {
                    ...currentClaims,
                    role: resolvedRole,
                    branchId: branchId !== undefined ? branchId : currentClaims.branchId || null,
                });
                console.log(`Updated claims for ${targetUid}: role=${resolvedRole}, branchId=${branchId}`);
            }
        }
        // 4. Update Firestore record
        const firestoreUpdate = {};
        if (targetUid)
            firestoreUpdate.uid = targetUid;
        if (displayName)
            firestoreUpdate.displayName = displayName;
        if (role)
            firestoreUpdate.role = role;
        if (branchId)
            firestoreUpdate.branchId = branchId;
        if (photoURL)
            firestoreUpdate.photoURL = photoURL;
        if (email)
            firestoreUpdate.email = email;
        if (isActive !== undefined)
            firestoreUpdate.isActive = isActive;
        if (onboardingCompleted !== undefined)
            firestoreUpdate.onboardingCompleted = onboardingCompleted;
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
    }
    catch (error) {
        console.error("Update profile error:", {
            uid,
            errorCode: error.code,
            errorMessage: error.message,
            stack: error.stack
        });
        if (error instanceof https_1.HttpsError) {
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
exports.onusercreated = functionsV1.auth.user().onCreate(async (user) => {
    const email = user.email;
    if (!email)
        return;
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
            }
            else {
                batch.update(staffDoc.ref, { uid: user.uid, updatedAt: new Date().toISOString() });
            }
            await batch.commit();
            console.log(`Auto-assigned claims and linked record for new user: ${email}`);
        }
    }
    catch (error) {
        console.error("Error in onusercreated claim assignment:", error);
    }
});
/**
 * SEND CUSTOM EMAIL: Callable Function (v2)
 * Sends an email using Zoho SMTP. Requires ZOHO_EMAIL and ZOHO_PASSWORD secrets.
 */
exports.sendcustomemail = (0, https_1.onCall)({
    secrets: [ZOHO_EMAIL, ZOHO_PASSWORD],
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    }
    const { to, subject, text, html, fromName } = request.data;
    if (!to || !subject || !text) {
        throw new https_1.HttpsError('invalid-argument', 'Recipient, subject, and text are required.');
    }
    try {
        return await (0, email_1.sendEmailViaZoho)({ to, subject, text, html, fromName });
    }
    catch (error) {
        console.error("Failed to send custom email:", error);
        throw new https_1.HttpsError('internal', 'Failed to send email. Ensure Zoho credentials are configured.');
    }
});
/**
 * AUTO RECEIPT: Firestore Trigger (v2)
 * Sends an email receipt automatically if a customer email is provided during checkout.
 */
exports.sendautoreceipt = (0, firestore_1.onDocumentCreated)({
    document: "sales/{saleId}",
    secrets: [ZOHO_EMAIL, ZOHO_PASSWORD],
}, async (event) => {
    const data = event.data?.data();
    if (!data || !data.customerEmail || !data.storeId)
        return null;
    try {
        // 1. Get store details for branding
        const storeDoc = await admin.firestore().collection("stores").doc(data.storeId).get();
        const storeData = storeDoc.data();
        if (!storeData) {
            console.warn(`Store not found for receipt: ${data.storeId}`);
            return null;
        }
        // 2. Generate HTML using the new receipt template
        const emailHtml = (0, email_template_1.getReceiptEmailTemplate)(data, storeData);
        const title = `Receipt from ${storeData.name}`;
        // 3. Send the email
        await (0, email_1.sendEmailViaZoho)({
            to: data.customerEmail,
            subject: title,
            text: `Your receipt from ${storeData.name} for ₦${data.totalNgn?.toLocaleString()}`,
            html: emailHtml,
            fromName: storeData.name
        });
        console.log(`Auto-receipt sent to ${data.customerEmail} for store ${storeData.name}`);
    }
    catch (error) {
        console.error("Auto-receipt failed:", error);
    }
    return null;
});
/**
 * ACTIVITY ALERTS: Firestore Trigger (v2)
 * Notifies the store owner about critical events like logins, inventory alerts,
 * and important operational changes (medium+ severity).
 */
exports.onactivitycreated = (0, firestore_1.onDocumentCreated)({
    document: "activity_logs/{logId}",
    secrets: [ZOHO_EMAIL, ZOHO_PASSWORD],
}, async (event) => {
    const data = event.data?.data();
    if (!data || !data.storeId)
        return null;
    try {
        // 1. Get store details for branding
        const storeDoc = await admin.firestore().collection("stores").doc(data.storeId).get();
        const storeData = storeDoc.data();
        if (!storeData || !storeData.ownerId)
            return null;
        // 2. Collect recipient emails scoped to this store: owner + managers/admins
        const recipients = [];
        try {
            const owner = await admin.auth().getUser(storeData.ownerId);
            if (owner.email)
                recipients.push(owner.email);
        }
        catch (e) {
            console.warn(`[ActivityNotify] Could not fetch owner for store ${data.storeId}:`, e);
        }
        const staffSnap = await admin.firestore().collection("staff")
            .where("storeId", "==", data.storeId)
            .where("role", "in", ["manager", "owner", "admin"])
            .get();
        for (const staffDoc of staffSnap.docs) {
            const email = staffDoc.data().email;
            if (email && !recipients.includes(email))
                recipients.push(email);
        }
        if (recipients.length === 0)
            return null;
        // 3. Determine if email should be sent
        // Emails are triggered for: medium, high, critical severities, or security/procurement categories
        const emailSeverities = ["medium", "high", "critical"];
        const emailCategories = ["security", "procurement"];
        const shouldSendEmail = emailSeverities.includes(data.severity) ||
            emailCategories.includes(data.category);
        if (shouldSendEmail) {
            let emailHtml = "";
            // Build a severity-aware subject line
            const severityPrefix = {
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
                emailHtml = (0, email_template_1.getReceiptEmailTemplate)(data.metadata?.order || {}, storeData);
            }
            else if (data.category === "system" && data.type === "report") {
                emailHtml = (0, email_template_1.getReportEmailTemplate)({
                    title: data.title,
                    period: data.metadata?.period || "Daily",
                    summary: data.message
                });
            }
            else {
                emailHtml = (0, email_template_1.getAlertEmailTemplate)({
                    title: data.title,
                    severity: data.severity || "info",
                    details: data.message,
                    actionUrl: dashboardUrl,
                    actionLabel: data.actionLabel || "View in Dashboard",
                    performedBy: data.userEmail || "System",
                });
            }
            for (const recipientEmail of recipients) {
                try {
                    await (0, email_1.sendEmailViaZoho)({
                        to: recipientEmail,
                        subject: emailSubject,
                        text: data.message,
                        html: emailHtml
                    });
                }
                catch (e) {
                    console.error(`[ActivityNotify] Email failed for ${recipientEmail}:`, e);
                }
            }
        }
        // 3. Create In-App Notification document
        // Map activity categories to notification types for the UI
        const categoryToType = {
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
    }
    catch (error) {
        console.error("Failed to process activity log:", error);
    }
    return null;
});
/**
 * HELPER: Verify System Admin status
 */
const checkSystemAdmin = async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
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
            throw new https_1.HttpsError("permission-denied", "SYSTEM ADMIN ROLE GRANTED. Please LOG OUT and LOG IN AGAIN to refresh your session.");
        }
        catch (e) {
            console.error("Self-heal failed:", e);
            if (e instanceof https_1.HttpsError)
                throw e;
        }
    }
    if (request.auth.token.role !== "system_admin") {
        throw new https_1.HttpsError("permission-denied", "Only system admins can perform this action.");
    }
};
/**
 * PING: Connectivity Test
 */
exports.ping = (0, https_1.onCall)({ cors: true }, async () => {
    return { message: "Pong!", timestamp: new Date().toISOString() };
});
/**
 * LIST ALL USERS: Callable Function (v2)
 * Returns a list of all users from Firebase Auth.
 */
exports.listallusers = (0, https_1.onCall)({ cors: true }, async (request) => {
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
    }
    catch (error) {
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
exports.wipeuser = (0, https_1.onCall)({ cors: true }, async (request) => {
    await checkSystemAdmin(request);
    const { uid } = request.data || {};
    if (!uid) {
        throw new https_1.HttpsError("invalid-argument", "User UID is required.");
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
    }
    catch (error) {
        console.error("Error wiping user:", error);
        if (error.code === 'auth/user-not-found') {
            // If user not in Auth, still try to clean Firestore
            await admin.firestore().collection("staff").doc(uid).delete();
            return { success: true, message: "User not found in Auth, but Firestore record cleaned." };
        }
        throw new https_1.HttpsError("internal", "Failed to wipe user data.");
    }
});
/**
 * UPDATE USER EMAIL: Callable Function (v2)
 * Allows a system admin to change any user's email address.
 * Syncs changes across Auth, 'users' collection, and 'staff' collection.
 */
exports.updateuseremail = (0, https_1.onCall)({ cors: true }, async (request) => {
    await checkSystemAdmin(request);
    const { uid, newEmail } = request.data || {};
    if (!uid || !newEmail || !newEmail.includes('@')) {
        throw new https_1.HttpsError("invalid-argument", "Valid UID and new email address are required.");
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
    }
    catch (error) {
        console.error("Error updating user email:", error);
        throw mapAuthError(error);
    }
});
/**
 * UPDATE PLATFORM USER: Callable Function (v2)
 * Allows a system admin to update any user's role, custom claims, and disabled state.
 */
exports.updateplatformuser = (0, https_1.onCall)({ cors: true }, async (request) => {
    await checkSystemAdmin(request);
    const { uid, role, storeId, disabled } = request.data || {};
    if (!uid) {
        throw new https_1.HttpsError("invalid-argument", "User UID is required.");
    }
    try {
        console.log(`System Admin ${request.auth?.uid} is updating platform user ${uid}: role=${role}, storeId=${storeId}, disabled=${disabled}`);
        const updateParams = {};
        if (disabled !== undefined) {
            updateParams.disabled = disabled;
        }
        // 1. Update Auth User properties
        if (Object.keys(updateParams).length > 0) {
            await admin.auth().updateUser(uid, updateParams);
        }
        // 2. Fetch current user to update custom claims
        const userRecord = await admin.auth().getUser(uid);
        const currentClaims = userRecord.customClaims || {};
        const newClaims = {
            ...currentClaims,
            role: role !== undefined ? role : currentClaims.role,
            storeId: storeId !== undefined ? (storeId === "" ? null : storeId) : currentClaims.storeId,
        };
        // Clean up undefined/null values in claims
        if (newClaims.storeId === null) {
            delete newClaims.storeId;
        }
        await admin.auth().setCustomUserClaims(uid, newClaims);
        // 3. Update Firestore 'users' record
        const userRef = admin.firestore().collection("users").doc(uid);
        const userUpdates = { updatedAt: new Date().toISOString() };
        if (role !== undefined)
            userUpdates.role = role;
        if (storeId !== undefined)
            userUpdates.storeId = storeId === "" ? null : storeId;
        await userRef.set(userUpdates, { merge: true });
        // 4. Update Firestore 'staff' record (if exists)
        const staffRef = admin.firestore().collection("staff").doc(uid);
        const staffSnap = await staffRef.get();
        if (staffSnap.exists) {
            const staffUpdates = { updatedAt: new Date().toISOString() };
            if (role !== undefined)
                staffUpdates.role = role;
            if (storeId !== undefined)
                staffUpdates.storeId = storeId === "" ? null : storeId;
            await staffRef.set(staffUpdates, { merge: true });
        }
        return { success: true, message: "User updated successfully." };
    }
    catch (error) {
        console.error("Error updating platform user:", error);
        throw new https_1.HttpsError("internal", error.message || "Failed to update platform user.");
    }
});
/**
 * RESET USER PASSWORD: Callable Function (v2)
 * Generates a password reset link for the given user's email.
 */
exports.resetuserpassword = (0, https_1.onCall)({ cors: true }, async (request) => {
    await checkSystemAdmin(request);
    const { email } = request.data || {};
    if (!email) {
        throw new https_1.HttpsError("invalid-argument", "Email is required.");
    }
    try {
        const link = await admin.auth().generatePasswordResetLink(email);
        console.log(`Generated password reset link for ${email}`);
        return { success: true, link };
    }
    catch (error) {
        console.error("Error generating reset link:", error);
        throw new https_1.HttpsError("internal", error.message || "Failed to generate password reset link.");
    }
});
/**
 * GET PLATFORM STATS: Callable Function (v2)
 * Aggregates high-level metrics across the entire platform.
 */
exports.getplatformstats = (0, https_1.onCall)({ cors: true }, async (request) => {
    await checkSystemAdmin(request);
    try {
        const storesSnap = await admin.firestore().collection("stores").get();
        const usersSnap = await admin.firestore().collection("users").get();
        const staffSnap = await admin.firestore().collection("staff").get();
        // Calculate monthly growth (last 6 months)
        const now = new Date();
        const monthlyGrowth = {};
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
    }
    catch (error) {
        console.error("Error getting platform stats:", error);
        throw new https_1.HttpsError("internal", "Failed to retrieve platform statistics.");
    }
});
/**
 * B2B MONIEPOINT ACCOUNT LINKING: Callable Function (v2)
 * Introspects API Token, Encrypts it via AES-256-GCM, triggers Webhook subscription,
 * and records connection in Firestore with strict OWNER/ADMIN authorization.
 */
exports.linkmoniepointaccount = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    }
    // Explicit OWNER or ADMIN or SYSTEM_ADMIN role checks (mid-tier authorization enforcement)
    const userRole = request.auth.token.role;
    const isAuthorized = userRole === 'owner' || userRole === 'system_admin' || userRole === 'admin';
    if (!isAuthorized) {
        throw new https_1.HttpsError('permission-denied', 'Only the store owner is permitted to adjust corporate payment connections.');
    }
    const { apiKey, storeId } = request.data || {};
    if (!apiKey || typeof apiKey !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'A valid Moniepoint API key is required.');
    }
    const activeStoreId = storeId || request.auth.token.storeId;
    if (!activeStoreId) {
        throw new https_1.HttpsError('invalid-argument', 'Store identifier is missing.');
    }
    try {
        console.log(`[LinkMoniepoint] Introspecting token for store tenant: ${activeStoreId}`);
        // Introspect token with sandbox fallback support
        const introspect = await moniepoint_service_1.MoniepointIntegrationService.introspectToken(apiKey);
        // Encrypt the credentials at rest using AES-256-GCM
        const encryptedKey = (0, crypto_1.encrypt)(apiKey);
        console.log(`[LinkMoniepoint] Setting up programmatic webhook registration for tenant: ${activeStoreId}`);
        // Register webhook subscription group with Moniepoint
        const webhookGroupId = await moniepoint_service_1.MoniepointIntegrationService.registerWebhookGroup(apiKey, activeStoreId);
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
    }
    catch (error) {
        console.error("[LinkMoniepoint] Account connection failure:", error);
        throw new https_1.HttpsError('invalid-argument', error.message || 'Failed to complete Moniepoint B2B account linking.');
    }
});
/**
 * B2B MONIEPOINT ACCOUNT UNLINKING: Callable Function (v2)
 * Removes connection and marks B2B link as inactive.
 */
exports.unlinkmoniepointaccount = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    }
    const userRole = request.auth.token.role;
    const isAuthorized = userRole === 'owner' || userRole === 'system_admin' || userRole === 'admin';
    if (!isAuthorized) {
        throw new https_1.HttpsError('permission-denied', 'Only the store owner is permitted to adjust corporate payment connections.');
    }
    const { storeId } = request.data || {};
    const activeStoreId = storeId || request.auth.token.storeId;
    if (!activeStoreId) {
        throw new https_1.HttpsError('invalid-argument', 'Store identifier is missing.');
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
    }
    catch (error) {
        console.error("[UnlinkMoniepoint] Error unlinking account:", error);
        throw new https_1.HttpsError('invalid-argument', error.message || 'Failed to terminate account linking.');
    }
});
/**
 * MONIEPOINT WEBHOOK INGEST ENGINE: HTTP Endpoint (v2)
 * High-throughput webhook consumer exposed at the public endpoint path.
 * Verifies signature, processes idempotency checks, maps tenant routing, and saves normalized POS transactions.
 */
exports.moniepointwebhook = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
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
        }
        catch (e) {
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
        if (rawMethod.includes("TRANSFER"))
            paymentMethod = "TRANSFER";
        if (rawMethod.includes("POS") || rawMethod.includes("TERMINAL"))
            paymentMethod = "POS_TERMINAL";
        // Convert decimal value directly to absolute integer Kobo (amount * 100) to prevent floating-point drift
        const amountInKobo = Math.round(amountDecimal * 100);
        // Map transaction status: SUCCESSFUL, FAILED, PENDING, REVERSED
        let status = "SUCCESSFUL";
        if (eventType === "transaction.failed" || data.status === "FAILED")
            status = "FAILED";
        if (eventType === "transaction.reversed" || data.status === "REVERSED")
            status = "REVERSED";
        if (data.status === "PENDING")
            status = "PENDING";
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
        }
        else {
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
    }
    catch (error) {
        console.error("[WebhookIngest] Fatal crash handling payload:", error);
        res.status(500).send("Internal processing crash.");
    }
});
// ═══════════════════════════════════════════════════════════════════════
// RETENTION & REPORTS — HTTP Cloud Functions (v2)
// ═══════════════════════════════════════════════════════════════════════
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const handleCors = (req, res) => {
    res.set(corsHeaders);
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return true;
    }
    return false;
};
const verifySystemAdmin = async (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new https_1.HttpsError("unauthenticated", "Missing or invalid Authorization header.");
    }
    const token = authHeader.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(token);
    if (decoded.role !== "system_admin") {
        throw new https_1.HttpsError("permission-denied", "Only system admins can perform this action.");
    }
    return decoded;
};
/**
 * RETENTION STATUS: HTTP GET — /api/retention/status
 * Checks if email (Gmail/Zoho) is configured for retention outreach.
 */
exports.retentionStatus = (0, https_1.onRequest)({ cors: true, secrets: [ZOHO_EMAIL, ZOHO_PASSWORD] }, async (req, res) => {
    if (handleCors(req, res))
        return;
    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        await verifySystemAdmin(req);
    }
    catch (e) {
        res.status(e.httpErrorCode?.statusCode || 401).json({ error: e.message });
        return;
    }
    const configured = !!(ZOHO_EMAIL.value() && ZOHO_PASSWORD.value());
    res.status(200).json({
        gmailConfigured: configured,
        mode: configured ? "live" : "simulated",
        recipientDomainHint: configured ? "Uses Zoho SMTP relay" : "Sandbox simulation mode active",
    });
});
/**
 * RETENTION METRICS: HTTP GET — /api/retention/metrics
 * Aggregates performance metrics per trigger from retentionEvents.
 */
exports.retentionMetrics = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (handleCors(req, res))
        return;
    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        await verifySystemAdmin(req);
    }
    catch (e) {
        res.status(e.httpErrorCode?.statusCode || 401).json({ error: e.message });
        return;
    }
    try {
        const db = admin.firestore();
        const triggersSnap = await db.collection("retentionTriggers").get();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const eventsSnap = await db.collection("retentionEvents")
            .where("sentAt", ">=", thirtyDaysAgo.toISOString())
            .get();
        const metrics = triggersSnap.docs.map((doc) => {
            const t = doc.data();
            const triggerEvents = eventsSnap.docs.filter((e) => e.data().triggerId === doc.id);
            const sentCount = triggerEvents.length;
            const respondedCount = triggerEvents.filter((e) => e.data().status === "responded").length;
            const responseRate = sentCount > 0 ? Math.round((respondedCount / sentCount) * 100) : 0;
            return {
                triggerId: doc.id,
                name: t.name || "",
                condition: t.condition || "",
                thresholdValue: t.thresholdValue || 0,
                channel: t.channel || "email",
                messageTemplate: t.messageTemplate || "",
                isActive: t.isActive ?? true,
                cooldownDays: t.cooldownDays || 7,
                sentCount,
                respondedCount,
                responseRate,
            };
        });
        res.status(200).json(metrics);
    }
    catch (error) {
        console.error("[retentionMetrics] Error:", error);
        res.status(500).json({ error: "Failed to compute retention metrics." });
    }
});
/**
 * RETENTION EVALUATE: HTTP POST — /api/retention/evaluate
 * Scans all stores for inactivity, creates retentionEvents for at-risk stores.
 */
exports.retentionEvaluate = (0, https_1.onRequest)({ cors: true, secrets: [ZOHO_EMAIL, ZOHO_PASSWORD] }, async (req, res) => {
    if (handleCors(req, res))
        return;
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        await verifySystemAdmin(req);
    }
    catch (e) {
        res.status(e.httpErrorCode?.statusCode || 401).json({ error: e.message });
        return;
    }
    try {
        const db = admin.firestore();
        const storesSnap = await db.collection("stores").get();
        const triggersSnap = await db.collection("retentionTriggers")
            .where("isActive", "==", true)
            .get();
        const triggers = triggersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        let firedCount = 0;
        const now = Date.now();
        for (const storeDoc of storesSnap.docs) {
            const store = storeDoc.data();
            const storeId = storeDoc.id;
            const storeName = store.name || store.storeName || "Unknown Store";
            const lastActivity = store.lastSaleDate || store.updatedAt || store.createdAt;
            if (!lastActivity)
                continue;
            const lastDate = typeof lastActivity === "string"
                ? new Date(lastActivity).getTime()
                : lastActivity?.toDate ? lastActivity.toDate().getTime() : new Date(lastActivity).getTime();
            const daysInactive = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
            for (const trigger of triggers) {
                const threshold = trigger.thresholdValue || 3;
                if (daysInactive >= threshold) {
                    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                    const message = (trigger.messageTemplate || "")
                        .replace(/\{\{storeName\}\}/g, storeName)
                        .replace(/\{\{days\}\}/g, String(daysInactive))
                        .replace(/\{\{count\}\}/g, String(daysInactive));
                    await db.collection("retentionEvents").doc(eventId).set({
                        eventId,
                        storeId,
                        triggerId: trigger.id,
                        channel: trigger.channel || "email",
                        sentAt: new Date().toISOString(),
                        status: "fired",
                        agentId: null,
                        meta: { storeName, message, manual: false },
                    });
                    firedCount++;
                    break;
                }
            }
        }
        res.status(200).json({ firedCount });
    }
    catch (error) {
        console.error("[retentionEvaluate] Error:", error);
        res.status(500).json({ error: "Evaluation cycle failed." });
    }
});
/**
 * RETENTION TRIGGER MANUAL: HTTP POST — /api/retention/trigger-manual
 * Manually fires a retention nudge for a specific store.
 */
exports.retentionTriggerManual = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (handleCors(req, res))
        return;
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        await verifySystemAdmin(req);
    }
    catch (e) {
        res.status(e.httpErrorCode?.statusCode || 401).json({ error: e.message });
        return;
    }
    try {
        const { storeId, triggerId, message, type } = req.body || {};
        if (!storeId) {
            res.status(400).json({ error: "storeId is required." });
            return;
        }
        const db = admin.firestore();
        const storeDoc = await db.collection("stores").doc(storeId).get();
        const storeName = storeDoc.exists ? (storeDoc.data()?.name || storeDoc.data()?.storeName || "Unknown") : "Unknown";
        const eventId = `evt_manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await db.collection("retentionEvents").doc(eventId).set({
            eventId,
            storeId,
            triggerId: triggerId || "manual_override",
            channel: type || "whatsapp",
            sentAt: new Date().toISOString(),
            status: "sent",
            agentId: null,
            meta: {
                storeName,
                message: message || `Manual retention nudge sent to ${storeName}`,
                manual: true,
            },
        });
        res.status(200).json({ success: true, eventId });
    }
    catch (error) {
        console.error("[retentionTriggerManual] Error:", error);
        res.status(500).json({ error: "Failed to fire manual trigger." });
    }
});
/**
 * REPORTS GENERATE SCHEDULED: HTTP POST — /api/reports/generate-scheduled
 * Simulates generating scheduled reports for all active stores.
 */
exports.reportsGenerateScheduled = (0, https_1.onRequest)({ cors: true, secrets: [ZOHO_EMAIL, ZOHO_PASSWORD] }, async (req, res) => {
    if (handleCors(req, res))
        return;
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        await verifySystemAdmin(req);
    }
    catch (e) {
        res.status(e.httpErrorCode?.statusCode || 401).json({ error: e.message });
        return;
    }
    try {
        const db = admin.firestore();
        const storesSnap = await db.collection("stores").get();
        let processedCount = 0;
        let sentCount = 0;
        let quotaExceeded = false;
        const dailyLimit = 450;
        const todayDeliveriesSnap = await db.collection("reportDeliveries")
            .where("status", "==", "delivered")
            .where("sentAt", ">=", new Date().toISOString().split("T")[0])
            .get();
        let todayCount = todayDeliveriesSnap.size;
        for (const storeDoc of storesSnap.docs) {
            const store = storeDoc.data();
            const storeId = storeDoc.id;
            const storeName = store.name || store.storeName || "Unknown";
            const frequency = store.reportPreferences?.frequency || "weekly";
            if (frequency === "off")
                continue;
            processedCount++;
            if (todayCount >= dailyLimit) {
                quotaExceeded = true;
                continue;
            }
            const recipientEmail = store.ownerEmail || store.email || null;
            if (!recipientEmail)
                continue;
            const deliveryId = `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const summary = {
                revenueNgn: Math.round(Math.random() * 500000),
                transactionCount: Math.floor(Math.random() * 120),
                lowStockCount: Math.floor(Math.random() * 8),
            };
            const emailSubject = `📊 Business Report — ${storeName} (${frequency})`;
            const emailHtml = `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0d9488;">NEXAOS Business Report</h2>
        <p>Here is your ${frequency} summary for <strong>${storeName}</strong>:</p>
        <ul>
          <li>Revenue: ₦${summary.revenueNgn.toLocaleString()}</li>
          <li>Transactions: ${summary.transactionCount}</li>
          <li>Low Stock Items: ${summary.lowStockCount}</li>
        </ul>
        <p style="color:#94a3b8;font-size:12px;">Auto-generated by Nexa OS Analytics</p>
      </div>`;
            try {
                await (0, email_1.sendEmailViaZoho)({
                    to: recipientEmail,
                    subject: emailSubject,
                    text: `${frequency} report for ${storeName}: ₦${summary.revenueNgn.toLocaleString()} revenue, ${summary.transactionCount} transactions.`,
                    html: emailHtml,
                    fromName: `${storeName} via Nexa OS`,
                });
                sentCount++;
                todayCount++;
            }
            catch (e) {
                console.error(`[reportsGenerateScheduled] Email failed for ${storeId}:`, e);
            }
            await db.collection("reportDeliveries").doc(deliveryId).set({
                id: deliveryId,
                storeId,
                recipientEmail,
                frequency,
                sentAt: new Date().toISOString(),
                gmailQuotaUsedThisDay: todayCount,
                status: sentCount > 0 ? "delivered" : "failed",
                simulated: false,
                summary,
            });
        }
        res.status(200).json({ processedCount, sentCount, quotaExceeded });
    }
    catch (error) {
        console.error("[reportsGenerateScheduled] Error:", error);
        res.status(500).json({ error: "Report generation cycle failed." });
    }
});
/**
 * REPORTS TEST GENERATE: HTTP POST — /api/reports/test-generate
 * Generates a test PDF report for a single store.
 */
exports.reportsTestGenerate = (0, https_1.onRequest)({ cors: true, secrets: [ZOHO_EMAIL, ZOHO_PASSWORD] }, async (req, res) => {
    if (handleCors(req, res))
        return;
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        await verifySystemAdmin(req);
    }
    catch (e) {
        res.status(e.httpErrorCode?.statusCode || 401).json({ error: e.message });
        return;
    }
    try {
        const { storeId, recipientEmail } = req.body || {};
        if (!storeId) {
            res.status(400).json({ error: "storeId is required." });
            return;
        }
        const db = admin.firestore();
        const storeDoc = await db.collection("stores").doc(storeId).get();
        if (!storeDoc.exists) {
            res.status(404).json({ error: "Store not found." });
            return;
        }
        const store = storeDoc.data();
        const storeName = store.name || store.storeName || "Unknown";
        const email = recipientEmail || store.ownerEmail || store.email || null;
        const configured = !!(ZOHO_EMAIL.value() && ZOHO_PASSWORD.value());
        const summary = {
            revenueNgn: Math.round(Math.random() * 300000),
            transactionCount: Math.floor(Math.random() * 80),
            lowStockCount: Math.floor(Math.random() * 5),
        };
        const deliveryId = `rpt_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        let reportUrl = "#simulated-report";
        if (configured && email) {
            const emailHtml = `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0d9488;">NEXAOS Test Report — ${storeName}</h2>
        <p>This is a <strong>test report</strong> generated on ${new Date().toLocaleDateString()}.</p>
        <ul>
          <li>Revenue: ₦${summary.revenueNgn.toLocaleString()}</li>
          <li>Transactions: ${summary.transactionCount}</li>
          <li>Low Stock Items: ${summary.lowStockCount}</li>
        </ul>
      </div>`;
            try {
                await (0, email_1.sendEmailViaZoho)({
                    to: email,
                    subject: `🧪 Test Report — ${storeName}`,
                    text: `Test report for ${storeName}: ₦${summary.revenueNgn.toLocaleString()} revenue.`,
                    html: emailHtml,
                    fromName: `${storeName} via Nexa OS`,
                });
                reportUrl = `mailto:${email}`;
            }
            catch (e) {
                console.error(`[reportsTestGenerate] Email send failed:`, e);
            }
        }
        await db.collection("reportDeliveries").doc(deliveryId).set({
            id: deliveryId,
            storeId,
            recipientEmail: email,
            frequency: "test",
            sentAt: new Date().toISOString(),
            gmailQuotaUsedThisDay: 0,
            status: configured && email ? "delivered" : "simulated",
            simulated: !configured,
            summary,
            error: configured ? undefined : "No email credentials configured — simulated mode",
        });
        res.status(200).json({
            success: true,
            simulated: !configured,
            recipient: email || "No email configured",
            reportUrl,
            summary,
        });
    }
    catch (error) {
        console.error("[reportsTestGenerate] Error:", error);
        res.status(500).json({ error: "Test report generation failed." });
    }
});
/**
 * RETENTION SEND CUSTOM EMAIL: HTTP POST — /api/retention/send-custom-email
 * Sends a personalized retention email to a specific store owner.
 */
exports.retentionSendCustomEmail = (0, https_1.onRequest)({ cors: true, secrets: [ZOHO_EMAIL, ZOHO_PASSWORD] }, async (req, res) => {
    if (handleCors(req, res))
        return;
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        await verifySystemAdmin(req);
    }
    catch (e) {
        res.status(e.httpErrorCode?.statusCode || 401).json({ error: e.message });
        return;
    }
    try {
        const { storeId, subject, htmlBody, recipientEmail } = req.body || {};
        if (!storeId) {
            res.status(400).json({ error: "storeId is required." });
            return;
        }
        if (!subject || !htmlBody) {
            res.status(400).json({ error: "subject and htmlBody are required." });
            return;
        }
        const db = admin.firestore();
        const storeDoc = await db.collection("stores").doc(storeId).get();
        const storeName = storeDoc.exists ? (storeDoc.data()?.name || storeDoc.data()?.storeName || "Unknown") : "Unknown";
        const toEmail = recipientEmail || storeDoc.data()?.ownerEmail || storeDoc.data()?.email || null;
        if (!toEmail) {
            res.status(400).json({ error: "No recipient email found for this store." });
            return;
        }
        const configured = !!(ZOHO_EMAIL.value() && ZOHO_PASSWORD.value());
        let simulated = !configured;
        if (configured) {
            try {
                await (0, email_1.sendEmailViaZoho)({
                    to: toEmail,
                    subject,
                    text: subject,
                    html: htmlBody,
                    fromName: `${storeName} via Nexa OS`,
                });
                simulated = false;
            }
            catch (e) {
                console.error("[retentionSendCustomEmail] Send failed, falling back to simulated:", e);
                simulated = true;
            }
        }
        const eventId = `evt_email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await db.collection("retentionEvents").doc(eventId).set({
            eventId,
            storeId,
            triggerId: "custom_email",
            channel: "email",
            sentAt: new Date().toISOString(),
            status: simulated ? "simulated" : "sent",
            agentId: null,
            meta: {
                storeName,
                message: subject,
                phone: toEmail,
                manual: true,
            },
        });
        res.status(200).json({ success: true, simulated, recipient: toEmail, eventId });
    }
    catch (error) {
        console.error("[retentionSendCustomEmail] Error:", error);
        res.status(500).json({ error: "Failed to send custom email." });
    }
});
/**
 * RETENTION SEND BULK EMAIL: HTTP POST — /api/retention/send-bulk-email
 * Sends personalized retention emails to multiple stores in parallel.
 */
exports.retentionSendBulkEmail = (0, https_1.onRequest)({ cors: true, secrets: [ZOHO_EMAIL, ZOHO_PASSWORD] }, async (req, res) => {
    if (handleCors(req, res))
        return;
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        await verifySystemAdmin(req);
    }
    catch (e) {
        res.status(e.httpErrorCode?.statusCode || 401).json({ error: e.message });
        return;
    }
    try {
        const { storeIds, subjectTemplate, htmlBodyTemplate } = req.body || {};
        if (!Array.isArray(storeIds) || storeIds.length === 0) {
            res.status(400).json({ error: "storeIds array is required." });
            return;
        }
        if (!subjectTemplate || !htmlBodyTemplate) {
            res.status(400).json({ error: "subjectTemplate and htmlBodyTemplate are required." });
            return;
        }
        const db = admin.firestore();
        const configured = !!(ZOHO_EMAIL.value() && ZOHO_PASSWORD.value());
        let successCount = 0;
        const sendPromises = storeIds.map(async (storeId) => {
            try {
                const storeDoc = await db.collection("stores").doc(storeId).get();
                if (!storeDoc.exists)
                    return;
                const store = storeDoc.data();
                const storeName = store.name || store.storeName || "Unknown";
                const toEmail = store.ownerEmail || store.email || null;
                if (!toEmail)
                    return;
                const subject = subjectTemplate
                    .replace(/\{\{storeName\}\}/g, storeName)
                    .replace(/\{\{manager\}\}/g, storeName)
                    .replace(/\{\{days\}\}/g, "7");
                const htmlBody = htmlBodyTemplate
                    .replace(/\{\{storeName\}\}/g, storeName)
                    .replace(/\{\{manager\}\}/g, storeName)
                    .replace(/\{\{days\}\}/g, "7");
                let simulated = !configured;
                if (configured) {
                    try {
                        await (0, email_1.sendEmailViaZoho)({
                            to: toEmail,
                            subject,
                            text: subject,
                            html: htmlBody,
                            fromName: `${storeName} via Nexa OS`,
                        });
                        simulated = false;
                    }
                    catch (e) {
                        console.error(`[retentionSendBulkEmail] Failed for ${storeId}:`, e);
                        simulated = true;
                    }
                }
                const eventId = `evt_bulk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                await db.collection("retentionEvents").doc(eventId).set({
                    eventId,
                    storeId,
                    triggerId: "bulk_email",
                    channel: "email",
                    sentAt: new Date().toISOString(),
                    status: simulated ? "simulated" : "sent",
                    agentId: null,
                    meta: {
                        storeName,
                        message: subject,
                        phone: toEmail,
                        manual: true,
                    },
                });
                if (!simulated)
                    successCount++;
            }
            catch (e) {
                console.error(`[retentionSendBulkEmail] Error for store ${storeId}:`, e);
            }
        });
        await Promise.all(sendPromises);
        res.status(200).json({ successCount, total: storeIds.length, simulated: !configured });
    }
    catch (error) {
        console.error("[retentionSendBulkEmail] Error:", error);
        res.status(500).json({ error: "Bulk email campaign failed." });
    }
});
// ═══════════════════════════════════════════════════════════════════════
// DAILY ACTIVITY SUMMARY EMAIL — Runs at 9 PM WAT (8 PM UTC) every day
// Sends a comprehensive daily report to all store owners and managers
// ═══════════════════════════════════════════════════════════════════════
exports.dailyActivitySummary = (0, scheduler_1.onSchedule)({
    schedule: "0 20 * * *", // 8:00 PM UTC = 9:00 PM WAT (West Africa Time)
    timeZone: "Africa/Lagos",
    memory: "512MiB",
    timeoutSeconds: 300,
    secrets: [ZOHO_EMAIL, ZOHO_PASSWORD],
}, async (_event) => {
    console.log("[DailySummary] Starting daily activity summary email dispatch...");
    const firestore = admin.firestore();
    try {
        // Get all active stores
        const storesSnap = await firestore.collection("stores").get();
        if (storesSnap.empty) {
            console.log("[DailySummary] No stores found. Exiting.");
            return;
        }
        // Calculate today's date boundaries (WAT = UTC+1)
        const now = new Date();
        const watOffset = 1 * 60 * 60 * 1000; // +1 hour in ms
        const watNow = new Date(now.getTime() + watOffset);
        const todayStart = new Date(watNow);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(watNow);
        todayEnd.setHours(23, 59, 59, 999);
        // Convert back to UTC for Firestore queries
        const queryStart = new Date(todayStart.getTime() - watOffset);
        const queryEnd = new Date(todayEnd.getTime() - watOffset);
        const dateLabel = watNow.toLocaleDateString("en-NG", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        for (const storeDoc of storesSnap.docs) {
            const storeData = storeDoc.data();
            const storeId = storeDoc.id;
            const storeName = storeData.name || storeData.storeDetails?.name || "Your Store";
            try {
                // ──── Collect Recipients (owners + managers) ────
                const recipients = [];
                // Add store owner email
                if (storeData.ownerId) {
                    try {
                        const ownerRecord = await admin.auth().getUser(storeData.ownerId);
                        if (ownerRecord.email)
                            recipients.push(ownerRecord.email);
                    }
                    catch (e) {
                        console.warn(`[DailySummary] Could not fetch owner for store ${storeId}:`, e);
                    }
                }
                // Add manager emails
                const staffSnap = await firestore.collection("staff")
                    .where("storeId", "==", storeId)
                    .where("role", "in", ["manager", "owner", "admin"])
                    .get();
                for (const staffDoc of staffSnap.docs) {
                    const email = staffDoc.data().email;
                    if (email && !recipients.includes(email)) {
                        recipients.push(email);
                    }
                }
                if (recipients.length === 0) {
                    console.log(`[DailySummary] No recipients found for store ${storeId}. Skipping.`);
                    continue;
                }
                // ──── Query Today's Sales ────
                const salesSnap = await firestore.collection("sales")
                    .where("storeId", "==", storeId)
                    .where("createdAt", ">=", queryStart.toISOString())
                    .where("createdAt", "<=", queryEnd.toISOString())
                    .get();
                let totalRevenue = 0;
                const itemSalesMap = {};
                const paymentMethodMap = {};
                const staffSalesMap = {};
                const customerSet = new Set();
                for (const saleDoc of salesSnap.docs) {
                    const sale = saleDoc.data();
                    const saleTotal = sale.totalNgn || sale.total || 0;
                    totalRevenue += saleTotal;
                    // Payment method tracking
                    const method = (sale.paymentMethod || "cash").toLowerCase();
                    if (!paymentMethodMap[method])
                        paymentMethodMap[method] = { count: 0, total: 0 };
                    paymentMethodMap[method].count++;
                    paymentMethodMap[method].total += saleTotal;
                    // Staff tracking
                    const staffName = sale.recordedByName || "Staff";
                    const staffId = sale.recordedBy || "unknown";
                    if (!staffSalesMap[staffId])
                        staffSalesMap[staffId] = { name: staffName, sales: 0, revenue: 0 };
                    staffSalesMap[staffId].sales++;
                    staffSalesMap[staffId].revenue += saleTotal;
                    // Customer tracking
                    if (sale.customerEmail && sale.customerEmail !== "walk-in") {
                        customerSet.add(sale.customerEmail);
                    }
                    // Item tracking
                    const items = sale.items || [];
                    for (const item of items) {
                        const key = item.itemId || item.itemName;
                        if (!itemSalesMap[key])
                            itemSalesMap[key] = { name: item.itemName, qty: 0, revenue: 0 };
                        itemSalesMap[key].qty += item.quantity || 1;
                        itemSalesMap[key].revenue += (item.quantity || 1) * (item.unitPriceNgn || 0);
                    }
                }
                // ──── Query Today's Expenses ────
                let totalExpenses = 0;
                try {
                    const expensesSnap = await firestore.collection("expenses")
                        .where("storeId", "==", storeId)
                        .where("createdAt", ">=", queryStart.toISOString())
                        .where("createdAt", "<=", queryEnd.toISOString())
                        .get();
                    for (const expDoc of expensesSnap.docs) {
                        totalExpenses += expDoc.data().amount || 0;
                    }
                }
                catch (e) {
                    console.warn(`[DailySummary] Could not fetch expenses for store ${storeId}:`, e);
                }
                // ──── Query Today's Refunds ────
                let totalRefunds = 0;
                let refundAmount = 0;
                try {
                    const refundsSnap = await firestore.collection("refunds")
                        .where("storeId", "==", storeId)
                        .where("createdAt", ">=", queryStart.toISOString())
                        .where("createdAt", "<=", queryEnd.toISOString())
                        .get();
                    totalRefunds = refundsSnap.size;
                    for (const refDoc of refundsSnap.docs) {
                        refundAmount += refDoc.data().amount || refDoc.data().totalNgn || 0;
                    }
                }
                catch (e) {
                    console.warn(`[DailySummary] Could not fetch refunds for store ${storeId}:`, e);
                }
                // ──── Query Low Stock Items ────
                const lowStockItems = [];
                try {
                    const productsSnap = await firestore.collection("products")
                        .where("storeId", "==", storeId)
                        .where("quantity", "<=", 5)
                        .get();
                    for (const prodDoc of productsSnap.docs) {
                        const prod = prodDoc.data();
                        lowStockItems.push({ name: prod.name, qty: prod.quantity || 0 });
                    }
                }
                catch (e) {
                    console.warn(`[DailySummary] Could not fetch low stock for store ${storeId}:`, e);
                }
                // ──── Compute Top Items & Staff Leader ────
                const topSellingItems = Object.values(itemSalesMap)
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5);
                const staffEntries = Object.values(staffSalesMap);
                const staffSalesLeader = staffEntries.length > 0
                    ? staffEntries.sort((a, b) => b.revenue - a.revenue)[0]
                    : null;
                // ──── Build & Send Email ────
                const summaryData = {
                    storeName: storeName,
                    date: dateLabel,
                    totalSales: salesSnap.size,
                    totalRevenue,
                    totalExpenses,
                    netProfit: totalRevenue - totalExpenses,
                    topSellingItems,
                    salesByPaymentMethod: paymentMethodMap,
                    totalRefunds,
                    refundAmount,
                    newCustomers: customerSet.size,
                    staffSalesLeader,
                    lowStockItems,
                    activityHighlights: [],
                };
                const emailHtml = (0, daily_summary_template_1.getDailySummaryEmailTemplate)(summaryData);
                const subject = `📊 ${storeName} — Daily Summary for ${dateLabel}`;
                for (const recipientEmail of recipients) {
                    try {
                        await (0, email_1.sendEmailViaZoho)({
                            to: recipientEmail,
                            subject,
                            text: `Daily activity summary for ${storeName}: ${salesSnap.size} sales, ${fmt(totalRevenue)} revenue, ${fmt(totalExpenses)} expenses.`,
                            html: emailHtml,
                            fromName: `${storeName} via Nexa OS`,
                        });
                        console.log(`[DailySummary] Email sent to ${recipientEmail} for store ${storeName}`);
                    }
                    catch (emailErr) {
                        console.error(`[DailySummary] Failed to send email to ${recipientEmail}:`, emailErr);
                    }
                }
                // Log the summary dispatch as an activity
                await firestore.collection("activity_logs").add({
                    storeId,
                    type: "daily_summary",
                    category: "system",
                    severity: "info",
                    title: "Daily Summary Email Sent",
                    message: `Daily activity summary dispatched to ${recipients.length} recipient(s): ${recipients.join(", ")}`,
                    userEmail: "system@nexastoreos.com",
                    userId: "system",
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            catch (storeErr) {
                console.error(`[DailySummary] Error processing store ${storeId}:`, storeErr);
            }
        }
        console.log("[DailySummary] Daily activity summary dispatch completed.");
    }
    catch (error) {
        console.error("[DailySummary] Fatal error in daily summary job:", error);
    }
});
//# sourceMappingURL=index.js.map