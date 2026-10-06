import { randomBytes } from "node:crypto";
import { hashPassword } from "@reading-advantage/auth";
import { eq, type SQL } from "drizzle-orm";
import { accounts, sessions } from "@reading-advantage/db/schema";

/** Minimal insert surface shared by the db client and a transaction. */
interface InsertCapable {
  insert: (table: typeof accounts) => {
    values: (row: typeof accounts.$inferInsert) => {
      onConflictDoUpdate: (config: {
        target: [typeof accounts.userId, typeof accounts.providerId];
        set: Partial<typeof accounts.$inferInsert>;
      }) => PromiseLike<unknown>;
    };
  };
}

/**
 * Hashes a new password with argon2id through the shared auth package.
 * @param password The plaintext password.
 * @returns The argon2id hash.
 */
export async function hashNewPassword(password: string): Promise<string> {
  return hashPassword(password);
}

/**
 * Builds an argon2id hash of a random secret for accounts without a chosen password.
 * @returns The argon2id hash of an unguessable value.
 */
export async function generateRandomPasswordHash(): Promise<string> {
  return hashPassword(randomBytes(18).toString("base64url"));
}

/**
 * Writes the credential account row that the shared login route reads.
 * The shared login verifies `accounts.password`, so every password write
 * must reach this row as well as the legacy `users.password` column.
 * @param tx A db client or transaction.
 * @param userId The owner of the credential.
 * @param passwordHash The argon2id hash to store.
 */
export async function upsertCredentialAccount(
  tx: InsertCapable,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await tx
    .insert(accounts)
    .values({
      id: `${userId}_credential`,
      userId,
      providerId: "credential",
      password: passwordHash,
    })
    .onConflictDoUpdate({
      target: [accounts.userId, accounts.providerId],
      set: { password: passwordHash, updatedAt: new Date() },
    });
}

/** Minimal delete surface shared by the db client and a transaction. */
interface DeleteCapable {
  delete: (table: typeof sessions) => {
    where: (condition: SQL) => PromiseLike<unknown>;
  };
}

/**
 * Deletes every session of one account inside the caller's transaction,
 * so a password write and its revocation commit or roll back together.
 * @param tx A db client or transaction.
 * @param userId The account whose sessions end.
 */
export async function revokeSessionsInTx(tx: DeleteCapable, userId: string): Promise<void> {
  await tx.delete(sessions).where(eq(sessions.userId, userId));
}
