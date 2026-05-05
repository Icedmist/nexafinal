"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreated = exports.syncStaffClaims = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
/**
 * AUTOMATIC ONBOARDING: Firestore Trigger
 * Triggered whenever a new staff record is created or updated.
 * Automatically synchronizes Custom Claims to the user's Auth profile.
 */
exports.syncStaffClaims = functions.firestore
    .document("staff/{staffId}")
    .onWrite(async (change, context) => {
    const data = change.after.exists ? change.after.data() : null;
    // If staff record was deleted, we should ideally remove claims, 
    // but for now we just handle creation/updates.
    if (!data)
        return null;
    const { email, storeId, role, isActive } = data;
    try {
        // Find the user by email
        const userRecord = await admin.auth().getUserByEmail(email);
        if (userRecord) {
            // Set Custom Claims based on the staff record
            // If inactive, we could strip claims, but isActive is handled in app logic/rules.
            await admin.auth().setCustomUserClaims(userRecord.uid, {
                storeId: storeId,
                role: isActive ? role : "requestor"
            });
            console.log(`Successfully synced claims for ${email} in store ${storeId}`);
        }
    }
    catch (error) {
        if (error.code === 'auth/user-not-found') {
            // User hasn't signed up yet. 
            // Claims will be synced when they first log in (handled by onUserCreated).
            console.log(`User ${email} not found yet. Claims will sync on signup.`);
        }
        else {
            console.error("Error syncing claims:", error);
        }
    }
    return null;
});
/**
 * AUTH TRIGGER: onUserCreated
 * Ensures that if a user was added to the staff list BEFORE they signed up,
 * their claims are assigned the moment they create their account.
 */
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
    const email = user.email;
    if (!email)
        return;
    try {
        // Search for any staff records with this email
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
    }
    catch (error) {
        console.error("Error in onUserCreated claim assignment:", error);
    }
});
//# sourceMappingURL=index.js.map