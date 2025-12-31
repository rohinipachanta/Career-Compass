import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// ENCRYPTION_KEY is required in production, optional in development
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function isEncryptionEnabled(): boolean {
  return !!ENCRYPTION_KEY && ENCRYPTION_KEY.length >= 32;
}

function validateEncryption(): void {
  if (IS_PRODUCTION && !isEncryptionEnabled()) {
    console.error("WARNING: ENCRYPTION_KEY is not set in production. Achievement data will not be encrypted.");
  }
}

async function getDerivedKey(): Promise<Buffer> {
  if (!ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY not set");
  }
  return (await scryptAsync(ENCRYPTION_KEY, "achievement-salt", 32)) as Buffer;
}

export async function encryptText(text: string): Promise<string> {
  // If encryption is not enabled, return text as-is
  if (!isEncryptionEnabled()) {
    return text;
  }
  
  const key = await getDerivedKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export async function decryptText(encryptedData: string): Promise<string> {
  // Check if data appears to be encrypted (has the expected format)
  const parts = encryptedData.split(":");
  if (parts.length !== 3 || parts[0].length !== 32 || parts[1].length !== 32) {
    // Data is not encrypted, return as-is
    return encryptedData;
  }
  
  // If encryption is not enabled but data is encrypted, we can't decrypt
  if (!isEncryptionEnabled()) {
    console.warn("Data appears encrypted but ENCRYPTION_KEY is not set");
    return encryptedData;
  }
  
  try {
    const key = await getDerivedKey();
    
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    // If decryption fails, return original (for backward compatibility)
    console.error("Decryption failed:", error);
    return encryptedData;
  }
}

export function isEncrypted(text: string): boolean {
  const parts = text.split(":");
  return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
}
