import { accounts, auditEvents, users, type DB } from "@reading-advantage/db";
import type { Role } from "./roles.js";
import { safeMetadata } from "./audit.js";
import { hashPassword } from "./password.js";

/** Stable conflict raised when a first-party username is already registered. */
export class CredentialUsernameConflictError extends Error {
  /** Public machine-readable error code. */
  readonly code = "CREDENTIAL_USERNAME_CONFLICT";

  /** Creates a username-conflict error without exposing database details. */
  constructor() {
    super("Username is already registered");
    this.name = "CredentialUsernameConflictError";
  }
}

/** Input accepted by the interim first-party credential-account adapter. */
export interface CreateCredentialAccountInput {
  username: string;
  displayUsername: string;
  name: string;
  password: string;
  role: Role;
  schoolId: string;
  actorUserId: string;
  actorRole: Role;
}

/** Public credential-account result that excludes credential material. */
export interface CreatedCredentialAccount {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  schoolId: string;
}

/**
 * Detects PostgreSQL unique violations, including errors wrapped by Drizzle.
 * @param error Candidate persistence error.
 * @returns Whether the error represents a unique constraint violation.
 */
function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    code?: unknown;
    constraint?: unknown;
    constraint_name?: unknown;
    cause?: unknown;
  };
  const constraint = candidate.constraint ?? candidate.constraint_name;
  return (
    (candidate.code === "23505" &&
      (constraint === "users_username_unique" ||
        constraint === "users_display_username_unique")) ||
    (candidate.cause !== error && isUniqueViolation(candidate.cause))
  );
}

/**
 * Creates a legacy-schema credential account behind the internal auth adapter.
 * This compatibility path remains replaceable by the company identity adapter.
 * @param db Database client used for the atomic account transaction.
 * @param input Verified account attributes and audit actor.
 * @returns Public account identity without a password or password hash.
 * @throws CredentialUsernameConflictError when either username spelling exists.
 */
export async function createCredentialAccount(
  db: DB,
  input: CreateCredentialAccountInput,
): Promise<CreatedCredentialAccount> {
  const username = input.username.trim().toLowerCase();
  const displayUsername = input.displayUsername.trim();
  const passwordHash = await hashPassword(input.password);
  const userId = crypto.randomUUID();

  try {
    return await db.transaction(async (transaction) => {
      const tx = transaction as unknown as DB;
      const [createdUser] = await tx
        .insert(users)
        .values({
          id: userId,
          username,
          displayUsername,
          name: input.name.trim(),
          role: input.role,
          schoolId: input.schoolId,
          xp: 0,
          level: 1,
          cefrLevel: "A1-",
        })
        .returning({
          id: users.id,
          username: users.username,
          displayUsername: users.displayUsername,
          name: users.name,
          role: users.role,
          schoolId: users.schoolId,
        });

      await tx.insert(accounts).values({
        id: `${userId}_credential`,
        userId,
        providerId: "credential",
        password: passwordHash,
      });

      await tx.insert(auditEvents).values({
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        action: "sales:rep_account_created",
        targetType: "user",
        targetId: userId,
        metadata: safeMetadata({
          source: "sales-advantage-compatibility-adapter",
          schoolId: input.schoolId,
          role: input.role,
        }),
      });

      if (!createdUser?.schoolId) {
        throw new Error("Credential account insert returned no user");
      }
      return {
        id: createdUser.id,
        username: createdUser.username,
        displayName: createdUser.name ?? createdUser.displayUsername,
        role: createdUser.role,
        schoolId: createdUser.schoolId,
      };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new CredentialUsernameConflictError();
    throw error;
  }
}
