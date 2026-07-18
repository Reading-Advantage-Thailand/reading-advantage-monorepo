/**
 * Server-side auth helpers for the marketing app routes.
 *
 * The marketing app exposes internal staff tooling (settings, campaigns, video
 * production). The routes are **global-internal** — they are NOT scoped by
 * `schoolId` because the marketing tables (`campaigns`, `videoProjects`,
 * `videoAssets`, `pastTopics`, `settings`) are classified REFERENTIAL in
 * `packages/domain/src/tenant-registry.ts` and have no `schoolId` column.
 *
 * Compatibility authentication policy: every protected route requires a valid
 * session via the `session_token` cookie and an exact legacy `ADMIN` allow-list.
 * The company-identity cutover replaces this compatibility policy with
 * Marketing `MEMBER`/`ADMIN` application roles through the internal SSO
 * adapter; product routes must never query the identity database directly.
 *
 * Tenant/owner scoping: not applicable at the data layer today. The plan
 * defers per-row scoping to a follow-up cycle if `schoolId`/`ownerId`
 * columns are added to the marketing tables.
 */
import {
  AuthError,
  requireAuth as authRequireAuth,
  SESSION_COOKIE_NAME,
  type Role,
} from "@reading-advantage/auth";
import { db } from "@/lib/db";

const LEGACY_MARKETING_ROLES: ReadonlySet<Role> = new Set(["ADMIN"]);

/**
 * Reports whether a shared-auth role may use the interim Marketing boundary.
 * @param role The authenticated shared role to evaluate.
 * @returns Whether the role is explicitly admitted before company-identity cutover.
 */
export function hasLegacyMarketingAccess(role: Role): boolean {
  return LEGACY_MARKETING_ROLES.has(role);
}

/**
 * Resolves the session token from a `Request` cookie header. Falls back to
 * `request.cookies.get(...)` when the request is a `NextRequest`. Handles
 * both shapes so route handlers can stay framework-agnostic and the test
 * harness can drive them with raw `Request` objects.
 * @param request The route request carrying the application session cookie.
 * @returns The raw session token, or undefined when the cookie is absent.
 */
function readSessionToken(request: Request): string | undefined {
  // NextRequest exposes `.cookies.get(name)`. Standard Request does not.
  const cookies = (
    request as Request & {
      cookies?: { get: (name: string) => { value: string } | undefined };
    }
  ).cookies;
  if (cookies?.get) {
    return cookies.get(SESSION_COOKIE_NAME)?.value;
  }
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE_NAME) {
      return rest.join("=");
    }
  }
  return undefined;
}

/**
 * Requires a legacy administrator session for a protected Marketing route.
 * @param request The route request carrying the application session cookie.
 * @returns The resolved session or a response that the route must return.
 * @throws Unexpected authentication or database failures.
 */
export async function requireMarketingSession(
  request: Request,
): Promise<
  | { ok: true; session: Awaited<ReturnType<typeof authRequireAuth>> }
  | { ok: false; response: Response }
> {
  const token = readSessionToken(request);
  try {
    const session = await authRequireAuth(db, token);
    if (!hasLegacyMarketingAccess(session.user.role)) {
      throw new AuthError("Marketing access required", "FORBIDDEN");
    }
    return { ok: true, session };
  } catch (error) {
    if (error instanceof AuthError && error.code === "UNAUTHORIZED") {
      return {
        ok: false,
        response: new Response(
          JSON.stringify({ message: "Authentication required" }),
          {
            status: 401,
            headers: { "content-type": "application/json" },
          },
        ),
      };
    }
    if (error instanceof AuthError && error.code === "FORBIDDEN") {
      return {
        ok: false,
        response: new Response(
          JSON.stringify({ message: "Marketing access required" }),
          {
            status: 403,
            headers: { "content-type": "application/json" },
          },
        ),
      };
    }
    throw error;
  }
}
