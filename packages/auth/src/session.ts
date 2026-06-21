
import { createHash } from "node:crypto";
import { count, eq, and, gt, type PostgresJsDatabase } from "@reading-advantage/db";
import { sessions, users } from "@reading-advantage/db/schema";
import type * as schema from "@reading-advantage/db/schema";
import type { UserContext } from "./tenant.js";

type Db = PostgresJsDatabase<typeof schema>;

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  user: UserContext;
}

export interface CreateSessionResult extends Session {
  /** Raw token for cookie wiring — never stored in DB */
  token: string;
}

/**
 * Creates a new session for a user.
 * @param db - Database client
 * @param userId - The user ID to create session for
 * @param opts - Optional metadata (ipAddress, userAgent)
 * @returns The created session object including raw token for cookie wiring (expires in 7 days)
 * @throws {Error} Throws if user not found after creation
 */
export async function createSession(
  db: Db,
  userId: string,
  opts?: { ipAddress?: string; userAgent?: string }
): Promise<CreateSessionResult> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // FR-10: Cap active sessions at 10 per user (count only non-expired).
  // The count, eviction, and insert are wrapped in a transaction so
  // concurrent logins cannot race past the cap.
  const session = await db.transaction(async (tx) => {
    const now = new Date();
    const countResult = await tx
      .select({ value: count() })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, now)));
    const sessionCount = Number(countResult[0]?.value ?? 0);
    if (sessionCount >= 10) {
      const oldestRows = await tx
        .select({ id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, now)))
        .orderBy(sessions.createdAt)
        .limit(1);
      if (oldestRows[0]) {
        await tx.delete(sessions).where(eq(sessions.id, oldestRows[0].id));
      }
    }

    // FR-1: store tokenHash only, not the raw token
    const [inserted] = await tx
      .insert(sessions)
      .values({
        id: crypto.randomUUID(),
        tokenHash,
        userId,
        expiresAt,
        ...(opts?.ipAddress ? { ipAddress: opts.ipAddress } : {}),
        ...(opts?.userAgent ? { userAgent: opts.userAgent } : {}),
      })
      .returning();

    return inserted;
  });

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      schoolId: users.schoolId,
      xp: users.xp,
      level: users.level,
      cefrLevel: users.cefrLevel,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found after session creation");
  }

  return {
    id: session.id,
    token,
    userId: session.userId,
    expiresAt: session.expiresAt,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      xp: user.xp,
      level: user.level,
      cefrLevel: user.cefrLevel,
    },
  };
}

/**
 * Deletes a session by token.
 * @param db - Database client
 * @param token - The session token to delete
 * @returns Resolves when the deletion attempt is complete
 */
export async function deleteSession(
  db: Db,
  token: string
): Promise<void> {
  // FR-1: hash the incoming token before deletion
  const tokenHash = sha256Hex(token);
  const deleted = await db
    .delete(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .returning();
  // If no rows matched, the session was already deleted or never existed — safe to ignore.
  // Real DB errors (connection, constraint) propagate naturally.
}

/**
 * Validates a session token and returns the session if valid.
 * @param db - Database client
 * @param token - The session token to validate
 * @returns The session object if valid, null otherwise (includes cleanup of expired sessions)
 */
export async function validateSession(
  db: Db,
  token: string
): Promise<Session | null> {
  // FR-1: hash the incoming token before lookup
  const tokenHash = sha256Hex(token);
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!session) {
    return null;
  }

  // Lazy cleanup: delete expired sessions
  if (session.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return null;
  }

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      schoolId: users.schoolId,
      xp: users.xp,
      level: users.level,
      cefrLevel: users.cefrLevel,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return null;
  }

  return {
    id: session.id,
    userId: session.userId,
    expiresAt: session.expiresAt,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      xp: user.xp,
      level: user.level,
      cefrLevel: user.cefrLevel,
    },
  };
}

/**
 * Revokes all sessions for a user.
 * @param db - Database client
 * @param userId - The user ID whose sessions to revoke
 * @returns Object with count of revoked sessions
 */
export async function revokeAllUserSessions(
  db: Db,
  userId: string
): Promise<{ revoked: number }> {
  const deleted = await db
    .delete(sessions)
    .where(eq(sessions.userId, userId))
    .returning();
  return { revoked: deleted.length };
}
