import argon2 from "@node-rs/argon2";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { accounts } from "@reading-advantage/db/schema";
import type { PostgresJsDatabase } from "@reading-advantage/db";
import type * as schema from "@reading-advantage/db/schema";

type Db = PostgresJsDatabase<typeof schema>;

/** OWASP-recommended Argon2id parameters (2024). */
export const ARGON2ID_OPTS = {
  type: 2, // argon2.Algorithm.Argon2id
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Hashes a password using Argon2id with OWASP-recommended parameters.
 * @param password - The plaintext password to hash
 * @returns The Argon2id hash string (prefixed with `$argon2id$`)
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2ID_OPTS);
}

/**
 * Verifies a plaintext password against a hash.
 * Transparently handles both Argon2id (`$argon2id$`) and legacy bcrypt (`$2a$`/`$2b$`) hashes.
 * @param password - The plaintext password to verify
 * @param hash - The hash to compare against (Argon2id or bcrypt)
 * @returns True if password matches hash, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    if (hash.startsWith("$argon2id$")) {
      return await argon2.verify(hash, password);
    }
    // Legacy bcrypt hash — dispatch to bcrypt for verification
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * One-shot migration: re-hash a bcrypt password to Argon2id on successful login.
 * If the stored hash is already Argon2id, this is a no-op.
 * @param db - Database client (Drizzle instance)
 * @param userId - The user whose password to re-hash
 * @param password - The plaintext password to verify and re-hash
 * @param storedHash - The current password hash from the database
 * @returns Object indicating whether migration occurred
 * @throws Never — returns { migrated: false } on verification failure
 */
export async function rehashOnLogin(
  db: Db,
  userId: string,
  password: string,
  storedHash: string,
): Promise<{ migrated: boolean }> {
  if (storedHash.startsWith("$argon2id$")) {
    return { migrated: false };
  }

  // Legacy bcrypt hash — verify then re-hash
  const valid = await bcrypt.compare(password, storedHash);
  if (!valid) {
    return { migrated: false };
  }

  const newHash = await argon2.hash(password, ARGON2ID_OPTS);
  await db
    .update(accounts)
    .set({ password: newHash, updatedAt: new Date() })
    .where(eq(accounts.userId, userId));

  return { migrated: true };
}
