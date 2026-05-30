import { z } from "zod";
import { db } from "@reading-advantage/db";
import { validateSession, type AuthContext, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "@reading-advantage/domain";
import type { Context } from "./trpc.js";
import { cookies } from "next/headers";

export const roleSchema = z.enum(["INTERN", "STUDENT", "TEACHER", "ADMIN", "SYSTEM"]);

interface CreateContextOptions {
  authorization?: string | null;
}

/**
 * Extracts the auth session token from request headers or cookies.
 *
 * @param opts - Options containing optional authorization header
 * @param opts.authorization - Optional Authorization header value (e.g., "Bearer <token>")
 * @returns The auth token string, or undefined if not found
 */
export async function getAuthToken(opts: CreateContextOptions = {}): Promise<string | undefined> {
  const cookieStore = await cookies();
  let token = cookieStore.get("session_token")?.value;

  if (!token && opts.authorization?.startsWith("Bearer ")) {
    token = opts.authorization.slice(7);
  }

  return token;
}

/**
 * Creates the tRPC request context with database access and auth state.
 *
 * @param opts - Options containing optional authorization header
 * @param opts.authorization - Optional Authorization header value (e.g., "Bearer <token>")
 * @returns The tRPC context object with db, tenantDb, and auth properties
 */
export async function createContext(opts: CreateContextOptions = {}): Promise<Context> {
  let auth: AuthContext | null = null;

  try {
    const token = await getAuthToken(opts);

    if (token) {
      const session = await validateSession(db, token);
      if (session) {
        const user: UserContext = {
          id: session.user.id,
          username: session.user.username,
          name: session.user.name,
          role: roleSchema.parse(session.user.role),
          schoolId: session.user.schoolId,
          xp: session.user.xp,
          level: session.user.level,
          cefrLevel: session.user.cefrLevel,
        };

        const tenant: Tenant = {
          schoolId: session.user.schoolId,
        };

        auth = { user, tenant };
      }
    }
  } catch {
    // Session validation failed — auth stays null
  }

  const tenantDb = createTenantDB(db, auth?.tenant ?? { schoolId: null });

  return { db, tenantDb, auth };
}
