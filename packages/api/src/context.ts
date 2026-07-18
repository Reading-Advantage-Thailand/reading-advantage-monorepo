import { z } from "zod";
import { db } from "@reading-advantage/db";
import {
  validateSession,
  type AuthContext,
  type UserContext,
  type Tenant,
} from "@reading-advantage/auth";
import { createTenantDB } from "@reading-advantage/domain/db-contract";
import type { Context } from "./trpc.js";
import { cookies } from "next/headers";

export const roleSchema = z.enum([
  "INTERN",
  "STUDENT",
  "TEACHER",
  "ADMIN",
  "SYSTEM",
  "SALES_REP",
  "SALES_ADMIN",
]);

/** Legacy cookie or bearer evidence resolved by the shared auth database adapter. */
export interface LegacyContextOptions {
  /** Selects the legacy session adapter; omitted for backward compatibility. */
  readonly mode?: "legacy";
  /** Legacy bearer/session evidence resolved by the shared auth database adapter. */
  readonly authorization?: string | null;
}

/** A principal already verified by a product's provider-neutral auth adapter. */
export interface VerifiedPrincipalContextOptions {
  /** Prevents all legacy cookie and bearer fallback. */
  readonly mode: "verified-principal";
  /** Already verified provider-neutral principal from an application auth adapter. */
  readonly principal: UserContext | null;
}

/** Discriminated authentication evidence accepted by shared tRPC context. */
export type CreateContextOptions =
  | LegacyContextOptions
  | VerifiedPrincipalContextOptions;

/**
 * Extracts the auth session token from request headers or cookies.
 *
 * @param opts - Options containing optional authorization header
 * @param opts.authorization - Optional Authorization header value (e.g., "Bearer <token>")
 * @returns The auth token string, or undefined if not found
 */
export async function getAuthToken(
  opts: LegacyContextOptions = {},
): Promise<string | undefined> {
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
 * @param opts Authentication evidence and its explicit resolution mode.
 * @returns The tRPC context object with db, tenantDb, and auth properties
 */
export async function createContext(
  opts: CreateContextOptions = {},
): Promise<Context> {
  let auth: AuthContext | null = null;

  try {
    if (opts.mode === "verified-principal") {
      if (opts.principal) {
        const user: UserContext = {
          ...opts.principal,
          role: roleSchema.parse(opts.principal.role),
        };
        auth = {
          user,
          tenant: {
            schoolId: user.schoolId,
            organizationId: user.organizationId ?? null,
            organizationKey: user.organizationKey ?? null,
          },
        };
      }
    } else {
      const token = await getAuthToken(opts);
      if (!token) {
        auth = null;
      } else {
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
    }
  } catch {
    // Session validation failed — auth stays null
  }

  try {
    const tenantDb = createTenantDB(db, auth?.tenant ?? { schoolId: null });
    return { db, tenantDb, auth };
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "context_db_error",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      }),
    );
    const tenantDb = createTenantDB(db, { schoolId: null });
    return { db, tenantDb, auth };
  }
}
