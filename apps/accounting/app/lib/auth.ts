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
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACCOUNTING_SESSION_COOKIE,
  accountingSessionUser,
  getAccountingOidcClient,
  readAccountingCookie,
} from "@/app/lib/company-oidc";

/** Session user projection produced by Accounts introspection. */
type AccountingSessionUser = NonNullable<
  ReturnType<typeof accountingSessionUser>
>;

/** Outcome of resolving an opaque Accounting session token. */
type ResolvedAccountingSession =
  | { readonly kind: "missing-token" }
  | { readonly kind: "inactive" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "ok"; readonly user: AccountingSessionUser };

/**
 * Resolves an accounting session user from an opaque session token.
 * @param token Opaque Accounts session token, or undefined when missing.
 * @returns A discriminated session outcome for the route or page guard.
 */
async function resolveAccountingSessionFromToken(
  token: string | undefined,
): Promise<ResolvedAccountingSession> {
  if (!token) {
    return { kind: "missing-token" };
  }
  const session = await getAccountingOidcClient().introspect(token);
  if (!session) {
    return { kind: "inactive" };
  }
  const user = accountingSessionUser(session.identity);
  if (!user) {
    return { kind: "forbidden" };
  }
  return { kind: "ok", user };
}

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
        user: AccountingSessionUser;
      };
    }
  | { ok: false; response: Response }
> {
  const token = readAccountingCookie(request, ACCOUNTING_SESSION_COOKIE);
  try {
    const resolved = await resolveAccountingSessionFromToken(token);
    if (resolved.kind === "missing-token" || resolved.kind === "inactive") {
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
    if (resolved.kind === "forbidden") {
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
    return { ok: true, session: { user: resolved.user } };
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

/**
 * Loads the Accounting session for a server component, or redirects to sign-in.
 * @returns The verified accounting session user.
 */
export async function getAccountingSessionOrRedirect(): Promise<{
  user: AccountingSessionUser;
}> {
  let resolved: ResolvedAccountingSession;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCOUNTING_SESSION_COOKIE)?.value;
    resolved = await resolveAccountingSessionFromToken(token);
  } catch {
    redirect("/login");
  }
  if (resolved.kind !== "ok") {
    redirect("/login");
  }
  return { user: resolved.user };
}
