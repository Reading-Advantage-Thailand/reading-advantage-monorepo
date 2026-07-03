/**
 * Server-side auth helpers for the marketing app routes.
 *
 * The marketing app exposes internal staff tooling (settings, campaigns, video
 * production). The routes are **global-internal** — they are NOT scoped by
 * `schoolId` because the marketing tables (`campaigns`, `videoProjects`,
 * `videoAssets`, `pastTopics`, `settings`) are classified REFERENTIAL in
 * `packages/domain/src/tenant-registry.ts` and have no `schoolId` column.
 *
 * Authentication policy: every protected route requires a valid session via
 * the `session_token` cookie. Role floor (any authenticated staff vs. an
 * ADMIN-equivalent floor) is `[NEEDS-PO]`. The current contract accepts any
 * authenticated session; tighten to a role floor when the product owner
 * confirms the floor.
 *
 * Tenant/owner scoping: not applicable at the data layer today. The plan
 * defers per-row scoping to a follow-up cycle if `schoolId`/`ownerId`
 * columns are added to the marketing tables.
 */
import {
  AuthError,
  requireAuth as authRequireAuth,
  SESSION_COOKIE_NAME,
} from "@reading-advantage/auth";
import { db } from "@/lib/db";

/**
 * Resolves the session token from a `Request` cookie header. Falls back to
 * `request.cookies.get(...)` when the request is a `NextRequest`. Handles
 * both shapes so route handlers can stay framework-agnostic and the test
 * harness can drive them with raw `Request` objects.
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
 * Require an authenticated session for a marketing route. Returns the
 * resolved `Session` on success; on failure returns a 401 `Response` that
 * the route should return directly. The two-valued return avoids forcing
 * every route to wrap `requireAuth` in a try/catch while keeping the
 * "guard short-circuits before any side effect" contract enforced by the
 * Phase 2A/2B/2C tests.
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
    throw error;
  }
}