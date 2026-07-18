/**
 * Server-side auth helpers for the marketing app routes.
 *
 * The marketing app exposes internal staff tooling (settings, campaigns, video
 * production). The routes are **global-internal** — they are NOT scoped by
 * `schoolId` because the marketing tables (`campaigns`, `videoProjects`,
 * `videoAssets`, `pastTopics`, `settings`) are classified REFERENTIAL in
 * `packages/domain/src/tenant-registry.ts` and have no `schoolId` column.
 *
 * Every protected route requires a live Accounts-issued Marketing application
 * session with an exact `MEMBER` or `ADMIN` role. Product routes never query
 * the identity database directly.
 *
 * Tenant/owner scoping: not applicable at the data layer today. The plan
 * defers per-row scoping to a follow-up cycle if `schoolId`/`ownerId`
 * columns are added to the marketing tables.
 */
import type { Role } from "@reading-advantage/auth";

import {
  getMarketingOidcClient,
  MARKETING_SESSION_COOKIE,
  marketingSessionUser,
  readMarketingCookie,
} from "@/lib/company-oidc";
import {
  hasMarketingPermission,
  type MarketingPermission,
} from "./marketing-permissions";

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
 * Requires an active Accounts-issued Marketing MEMBER or ADMIN session.
 * @param request The route request carrying the application session cookie.
 * @returns The resolved session or a response that the route must return.
 * @throws Unexpected authentication or database failures.
 */
export async function requireMarketingSession(
  request: Request,
): Promise<
  | { ok: true; session: { user: NonNullable<ReturnType<typeof marketingSessionUser>> } }
  | { ok: false; response: Response }
> {
  const token = readMarketingCookie(request, MARKETING_SESSION_COOKIE);
  try {
    if (!token) {
      return {
        ok: false,
        response: new Response(JSON.stringify({ message: "Authentication required" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      };
    }
    const session = await getMarketingOidcClient().introspect(token);
    if (!session) {
      return {
        ok: false,
        response: new Response(JSON.stringify({ message: "Authentication required" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      };
    }
    const user = marketingSessionUser(session.identity);
    if (!user) {
      return {
        ok: false,
        response: new Response(JSON.stringify({ message: "Marketing access required" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      };
    }
    return { ok: true, session: { user } };
  } catch {
    return {
      ok: false,
      response: new Response(JSON.stringify({ message: "Authentication unavailable" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
    };
  }
}

/**
 * Requires an active Marketing session authorized for one named operation.
 * @param request The route request carrying the application session cookie.
 * @param permission The reviewed Marketing permission required by the route.
 * @returns The authorized session or a response that the route must return.
 * @throws Unexpected authentication or database failures.
 */
export async function requireMarketingPermission(
  request: Request,
  permission: MarketingPermission,
): ReturnType<typeof requireMarketingSession> {
  const guard = await requireMarketingSession(request);
  if (!guard.ok) return guard;
  if (!hasMarketingPermission(guard.session.user.role, permission)) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ message: "Marketing permission required" }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        },
      ),
    };
  }
  return guard;
}
