import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const DEFAULT_KEY_HEX =
  "d3f4b5c6a7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4";

function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    const buf = Buffer.from(envKey, "hex");
    if (buf.length !== 32) {
      throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
    }
    return buf;
  }
  return Buffer.from(DEFAULT_KEY_HEX, "hex");
}

export function encrypt(value: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decrypt(value: string): string {
  const key = getKey();
  const parts = value.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = Buffer.from(parts[2], "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}
