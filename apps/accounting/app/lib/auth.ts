/**
 * Server-side auth helpers for the accounting app routes.
 *
 * Every protected route requires a live Accounts-issued Accounting application
 * session carrying an exact STAFF, OWNER, or ACCOUNTANT role. The guard is
 * revocation-aware: each call introspects the opaque session token against
 * Accounts, so suspended or revoked sessions are denied immediately. Product
 * routes never query the identity database directly and never perform any
 * app-local password or credential sign-in.
 */
import {
  ACCOUNTING_SESSION_COOKIE,
  accountingSessionUser,
  getAccountingOidcClient,
  readAccountingCookie,
} from "@/app/lib/company-oidc";

/**
 * Requires an active Accounts-issued Accounting STAFF, OWNER, or ACCOUNTANT session.
 * @param request The route request carrying the application session cookie.
 * @returns The resolved session or a response that the route must return.
 *   Never throws: unexpected authentication or introspection failures are
 *   logged server-side and converted into a 503 response.
 */
export async function requireAccountingSession(request: Request): Promise<
  | {
      ok: true;
      session: {
        user: NonNullable<ReturnType<typeof accountingSessionUser>>;
      };
    }
  | { ok: false; response: Response }
> {
  const token = readAccountingCookie(request, ACCOUNTING_SESSION_COOKIE);
  try {
    if (!token) {
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
    const session = await getAccountingOidcClient().introspect(token);
    if (!session) {
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
    const user = accountingSessionUser(session.identity);
    if (!user) {
      return {
        ok: false,
        response: new Response(
          JSON.stringify({ message: "Accounting access required" }),
          {
            status: 403,
            headers: { "content-type": "application/json" },
          },
        ),
      };
    }
    return { ok: true, session: { user } };
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "accounting_session_guard_failed",
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ message: "Authentication unavailable" }),
        {
          status: 503,
          headers: { "content-type": "application/json" },
        },
      ),
    };
  }
}
