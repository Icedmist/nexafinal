"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrypt = exports.encrypt = void 0;
const crypto = require("crypto");
/**
 * Derives a 32-byte encryption key from the environment secret or a secure fallback.
 */
const getEncryptionKey = () => {
    const secret = process.env.MONIEPOINT_ENCRYPTION_KEY || "nexa-storeos-moniepoint-crypto-salt-2026-safe";
    return crypto.createHash("sha256").update(secret).digest();
};
/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a colon-separated string: iv:authTag:encryptedData
 */
const encrypt = (text) => {
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(12); // Standard 12 bytes IV for GCM
        const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
        let encrypted = cipher.update(text, "utf8", "hex");
        encrypted += cipher.final("hex");
        const authTag = cipher.getAuthTag().toString("hex");
        return `${iv.toString("hex")}:${authTag}:${encrypted}`;
    }
    catch (error) {
        console.error("Encryption failed:", error);
        throw new Error("Failed to encrypt sensitive token.");
    }
};
exports.encrypt = encrypt;
/**
 * Decrypts an AES-256-GCM encrypted string.
 * Expects format: iv:authTag:encryptedData
 */
const decrypt = (encryptedText) => {
    try {
        const key = getEncryptionKey();
        const parts = encryptedText.split(":");
        if (parts.length !== 3) {
            throw new Error("Invalid encrypted text format. Expected 'iv:authTag:encryptedHex'");
        }
        const [ivHex, authTagHex, encryptedHex] = parts;
        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(authTagHex, "hex");
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedHex, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    }
    catch (error) {
        console.error("Decryption failed:", error);
        throw new Error("Failed to decrypt sensitive token. Check keys/integrity.");
    }
};
exports.decrypt = decrypt;
//# sourceMappingURL=crypto.js.map