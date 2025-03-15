// @ts-ignore
const simpleEncryptor = require("simple-encryptor");
import { createLogger } from "./logger";

const logger = createLogger("encryption-utils");

if (!process.env.ENCRYPTION_KEY) {
  throw new Error("Missing ENCRYPTION_KEY environment variable");
}

const encryptor = simpleEncryptor(process.env.ENCRYPTION_KEY);

export function encrypt(text: string): string {
  try {
    if (!text) {
      logger.warn("Attempting to encrypt empty or undefined text");
      throw new Error("Cannot encrypt empty or undefined text");
    }
    logger.info({
      message: "Encrypting text",
      textLength: text.length,
    });
    const encrypted = encryptor.encrypt(text);
    logger.info({
      message: "Text encrypted successfully",
      encryptedLength: encrypted.length,
    });
    return encrypted;
  } catch (error) {
    logger.error({
      message: "Encryption error",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error("Failed to encrypt data");
  }
}

export function decrypt(encryptedText: string): string {
  try {
    if (!encryptedText) {
      logger.warn("Attempting to decrypt empty or undefined text");
      throw new Error("Cannot decrypt empty or undefined text");
    }
    logger.info({
      message: "Decrypting text",
      encryptedLength: encryptedText.length,
    });
    const decrypted = encryptor.decrypt(encryptedText);
    if (decrypted === false || decrypted === null || decrypted === undefined) {
      throw new Error("Decryption failed");
    }
    logger.info({
      message: "Text decrypted successfully",
      decryptedLength: decrypted.length,
    });
    return decrypted;
  } catch (error) {
    logger.error({
      message: "Decryption error",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      encryptedTextLength: encryptedText.length,
    });
    throw new Error("Failed to decrypt data");
  }
}

export function encryptCredentials(credentials: Record<string, any>): Record<string, any> {
  const encrypted: Record<string, any> = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (value !== null && value !== undefined) {
      if (typeof value === "object" && !Array.isArray(value)) {
        encrypted[key] = encryptCredentials(value);
      } else if (typeof value === "string") {
        encrypted[key] = encrypt(value);
      } else {
        encrypted[key] = value;
      }
    }
  }
  return encrypted;
}

export function decryptCredentials<T>(encryptedCredentials: Record<string, any>): T {
  const decrypted: Record<string, any> = {};
  for (const [key, value] of Object.entries(encryptedCredentials)) {
    if (value !== null && value !== undefined) {
      if (typeof value === "object" && !Array.isArray(value)) {
        decrypted[key] = decryptCredentials(value);
      } else if (typeof value === "string") {
        try {
          decrypted[key] = decrypt(value);
        } catch (error) {
          // If decryption fails, assume the value is not encrypted
          decrypted[key] = value;
        }
      } else {
        decrypted[key] = value;
      }
    }
  }
  return decrypted as T;
}
