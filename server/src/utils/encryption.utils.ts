import CryptoJS from "crypto-js";
import { createLogger } from "./logger";

const logger = createLogger("encryption-utils");

if (!process.env.ENCRYPTION_KEY) {
  throw new Error("Missing ENCRYPTION_KEY environment variable");
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

export function encrypt(text: string): string {
  try {
    if (!text) {
      throw new Error("Cannot encrypt empty or undefined text");
    }
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  } catch (error) {
    logger.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

export function decrypt(encryptedText: string): string {
  try {
    if (!encryptedText) {
      throw new Error("Cannot decrypt empty or undefined text");
    }
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    logger.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

export function encryptCredentials(credentials: Record<string, string>): Record<string, string> {
  const encrypted: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (value) {
      encrypted[key] = encrypt(value);
    }
  }
  return encrypted;
}

export function decryptCredentials<T>(encryptedCredentials: Record<string, string>): T {
  const decrypted: Record<string, string> = {};
  for (const [key, value] of Object.entries(encryptedCredentials)) {
    if (value) {
      decrypted[key] = decrypt(value);
    }
  }
  return decrypted as T;
}
