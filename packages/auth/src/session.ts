
import { createHash } from "node:crypto";
import { count, eq, type PostgresJsDatabase } from "@reading-advantage/db";
import { sessions, users } from "@reading-advantage/db/schema";
import type * as schema from "@reading-advantage/db/schema";
import type { UserContext } from "./tenant.js";

type Db = PostgresJsDatabase<typeof schema>;

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export interface Session {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  user: UserContext;
}

/**
 * Creates a new session for a user.
 * @param db - Database client
 * @param userId - The user ID to create session for
 * @param opts - Optional metadata (ipAddress, userAgent)
 * @returns The created session object including token (expires in 7 days)
 * @throws {Error} Throws if user not found after creation
 */
export async function createSession(
  db: Db,
  userId: string,
  opts?: { ipAddress?: string; userAgent?: string }
): Promise<Session> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // FR-10: Cap active sessions at 10 per user
  const countResult = await db
    .select({ value: count() })
    .from(sessions)
    .where(eq(sessions.userId, userId));
  const sessionCount = Number(countResult[0]?.value ?? 0);
  if (sessionCount >= 10) {
    const oldestRows = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(sessions.createdAt)
      .limit(1);
    if (oldestRows[0]) {
      await db.delete(sessions).where(eq(sessions.id, oldestRows[0].id));
    }
  }

  // FR-1: store tokenHash only, not the raw token
  const insertValues: Record<string, unknown> = {
    id: crypto.randomUUID(),
    tokenHash,
    userId,
    expiresAt,
  };
  if (opts?.ipAddress) insertValues.ipAddress = opts.ipAddress;
  if (opts?.userAgent) insertValues.userAgent = opts.userAgent;

  const [session] = await db
    .insert(sessions)
    .values(insertValues as Parameters<typeof db.insert>[0] extends { values: (v: infer V) => unknown } ? V : never)
    .returning();

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
      role: user.role as UserContext["role"],
      schoolId: user.schoolId,
      xp: user.xp,
      level: user.level,
      cefrLevel: user.cefrLevel,
    },
  };
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
    token: session.token,
    userId: session.userId,
    expiresAt: session.expiresAt,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as UserContext["role"],
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
 */
export async function deleteSession(
  db: Db,
  token: string
): Promise<void> {
  try {
    // FR-1: hash the incoming token before deletion
    const tokenHash = sha256Hex(token);
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  } catch {
    // Silently catch — session may already be deleted
  }
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
