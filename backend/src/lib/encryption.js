import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Derives a 32-byte (256-bit) encryption key from environment or deterministic local fallback.
 */
function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || process.env.JWT_SECRET || "argoes_default_merchant_master_secret_key_2026";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: base64(iv):base64(authTag):base64(encryptedData)
 *
 * @param {string} plainText
 * @returns {string|null} Encrypted payload string or null
 */
export function encrypt(plainText) {
  if (plainText === null || plainText === undefined || plainText === "") {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    let encrypted = cipher.update(String(plainText), "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag();

    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
  } catch (error) {
    console.error("[Encryption] Encryption error:", error.message);
    throw new Error("Failed to encrypt sensitive data");
  }
}

/**
 * Decrypts an AES-256-GCM encrypted payload string.
 * Expects format: base64(iv):base64(authTag):base64(encryptedData)
 *
 * @param {string} cipherText
 * @returns {string|null} Decrypted plaintext string or null
 */
export function decrypt(cipherText) {
  if (!cipherText || typeof cipherText !== "string") {
    return null;
  }

  // If already plain or unformatted, return safely
  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    return cipherText;
  }

  try {
    const key = getEncryptionKey();
    const [ivB64, authTagB64, encryptedB64] = parts;
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedB64, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.warn("[Encryption] Decryption error (possible invalid key or corrupted payload):", error.message);
    return null;
  }
}

/**
 * Masks a sensitive secret string for secure client-side preview.
 * e.g., "rzp_live_1234567890abcdef" -> "rzp_live_••••••••cdef"
 *
 * @param {string} str - String to mask
 * @param {number} visibleTrailing - Number of trailing characters to leave visible
 * @returns {string} Masked string
 */
export function maskSecret(str, visibleTrailing = 4) {
  if (!str || typeof str !== "string") return "";
  const trimmed = str.trim();
  if (trimmed.length <= visibleTrailing) {
    return "••••";
  }

  // Preserve prefix if standard (e.g. rzp_live_, rzp_test_, EAAG)
  let prefix = "";
  if (trimmed.startsWith("rzp_live_")) {
    prefix = "rzp_live_";
  } else if (trimmed.startsWith("rzp_test_")) {
    prefix = "rzp_test_";
  }

  const remainder = trimmed.slice(prefix.length);
  if (remainder.length <= visibleTrailing) {
    return `${prefix}••••`;
  }

  const maskedPortion = "•".repeat(Math.min(remainder.length - visibleTrailing, 10));
  const trailing = remainder.slice(-visibleTrailing);

  return `${prefix}${maskedPortion}${trailing}`;
}

export default {
  encrypt,
  decrypt,
  maskSecret,
};

