import crypto from "crypto";
import { createLogger } from "./logger";

const logger = createLogger("encryption-utils");

if (!process.env.ENCRYPTION_KEY) {
  throw new Error("Missing ENCRYPTION_KEY environment variable");
}

// Use environment variable for encryption key (32 bytes = 256 bits)
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // For GCM, IV length is 12 bytes
const AUTH_TAG_LENGTH = 16; // For GCM, auth tag length is 16 bytes

interface EncryptedData {
  iv: string;
  encryptedData: string;
  authTag: string;
}

export function encrypt(data: string | object): EncryptedData {
  try {
    // Convert object to string if necessary
    const textToEncrypt = typeof data === "string" ? data : JSON.stringify(data);

    // Generate a random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    // Encrypt the data
    let encryptedData = cipher.update(textToEncrypt, "utf8", "hex");
    encryptedData += cipher.final("hex");

    // Get auth tag
    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString("hex"),
      encryptedData,
      authTag: authTag.toString("hex"),
    };
  } catch (error) {
    logger.error({
      message: "Encryption failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new Error("Encryption failed");
  }
}

export function decrypt(encryptedData: EncryptedData): string {
  try {
    // Convert hex strings back to buffers
    const iv = Buffer.from(encryptedData.iv, "hex");
    const authTag = Buffer.from(encryptedData.authTag, "hex");

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData.encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    logger.error({
      message: "Decryption failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new Error("Decryption failed");
  }
}

export function encryptCredentials<T extends object>(credentials: T): string {
  const encrypted = encrypt(credentials);
  return JSON.stringify(encrypted);
}

export function decryptCredentials<T>(encryptedString: string): T {
  const encrypted = JSON.parse(encryptedString) as EncryptedData;
  const decrypted = decrypt(encrypted);
  return JSON.parse(decrypted) as T;
}
