import type { PostgresJsDatabase } from "@reading-advantage/db";
import type * as schema from "@reading-advantage/db/schema";
import { validateSession, type Session } from "./session.js";
import { ROLE_HIERARCHY, type Role } from "./roles.js";
import { AuthError } from "./assert.js";

type Db = PostgresJsDatabase<typeof schema>;

export async function getSession(
  db: Db,
  token: string | undefined
): Promise<Session | null> {
  if (!token) {
    return null;
  }
  return validateSession(db, token);
}

export async function requireAuth(
  db: Db,
  token: string | undefined
): Promise<Session> {
  const session = await getSession(db, token);
  if (!session) {
    throw new AuthError("Authentication required", "UNAUTHORIZED");
  }
  return session;
}

export async function requireRole(
  db: Db,
  token: string | undefined,
  requiredRole: Role
): Promise<Session> {
  const session = await requireAuth(db, token);
  if (ROLE_HIERARCHY[session.user.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new AuthError(
      `Requires role ${requiredRole} or higher`,
      "FORBIDDEN"
    );
  }
  return session;
}

export function hasRole(session: Session, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[session.user.role] >= ROLE_HIERARCHY[requiredRole];
}

export const SESSION_COOKIE_NAME = "session_token";
