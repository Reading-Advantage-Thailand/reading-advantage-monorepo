import crypto from "crypto";
import { eq, type PostgresJsDatabase } from "@reading-advantage/db";
import { sessions, users } from "@reading-advantage/db/schema";
import type * as schema from "@reading-advantage/db/schema";
import type { UserContext } from "./tenant.js";

type Db = PostgresJsDatabase<typeof schema>;

export interface Session {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  user: UserContext;
}

export async function createSession(
  db: Db,
  userId: string
): Promise<Session> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [session] = await db
    .insert(sessions)
    .values({
      id: crypto.randomUUID(),
      token,
      userId,
      expiresAt,
    })
    .returning();

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      schoolId: users.schoolId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found after session creation");
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
    },
  };
}

export async function validateSession(
  db: Db,
  token: string
): Promise<Session | null> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
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
    },
  };
}

export async function deleteSession(
  db: Db,
  token: string
): Promise<void> {
  try {
    await db.delete(sessions).where(eq(sessions.token, token));
  } catch {
    // Silently catch — session may already be deleted
  }
}
