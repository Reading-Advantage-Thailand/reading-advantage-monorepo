import type { PostgresJsDatabase } from "@reading-advantage/db";
import type * as schema from "@reading-advantage/db/schema";
import { validateSession, type Session } from "./session.js";
import { ROLE_HIERARCHY, type Role } from "./roles.js";
import { AuthError } from "./assert.js";

type Db = PostgresJsDatabase<typeof schema>;

/**
 * Gets a session from a token.
 * @param db - Database client
 * @param token - The session token (optional)
 * @returns The session object or null if not found/invalid
 */
export async function getSession(
  db: Db,
  token: string | undefined
): Promise<Session | null> {
  if (!token) {
    return null;
  }
  return validateSession(db, token);
}

/**
 * Requires authentication and returns the session.
 * @param db - Database client
 * @param token - The session token (optional)
 * @returns The valid session object
 * @throws {AuthError} Throws if no valid session found
 */
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

/**
 * Requires a specific role level or higher for access.
 * @param db - Database client
 * @param token - The session token (optional)
 * @param requiredRole - The minimum role required
 * @returns The valid session object if role is sufficient
 * @throws {AuthError} Throws if not authenticated or role insufficient
 */
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

/**
 * Checks if a session has the required role level or higher.
 * @param session - The session to check
 * @param requiredRole - The minimum role required
 * @returns True if session user role meets or exceeds requiredRole
 */
export function hasRole(session: Session, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[session.user.role] >= ROLE_HIERARCHY[requiredRole];
}

export const SESSION_COOKIE_NAME = "session_token";
