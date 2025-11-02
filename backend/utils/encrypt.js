import CryptoJS from "crypto-js";
import dotenv from "dotenv";

dotenv.config();

const SECRET_KEY = process.env.ENCRYPTION_KEY;

if (!SECRET_KEY || SECRET_KEY.length < 32) {
  console.error("⚠️  WARNING: ENCRYPTION_KEY must be at least 32 characters!");
}

/**
 * Encrypt sensitive data
 * @param {string} data - Plain text to encrypt
 * @returns {string} - Encrypted cipher text
 */
export const encrypt = (data) => {
  if (!data) return "";
  try {
    return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
};

/**
 * Decrypt sensitive data
 * @param {string} cipherText - Encrypted text
 * @returns {string} - Decrypted plain text
 */
export const decrypt = (cipherText) => {
  if (!cipherText) return "";
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new Error("Decryption resulted in empty string");
    }
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
};

export default { encrypt, decrypt };