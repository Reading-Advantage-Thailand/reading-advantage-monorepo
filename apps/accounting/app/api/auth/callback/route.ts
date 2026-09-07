import { NextResponse } from "next/server";
import { logStructuredError } from "@reading-advantage/utils/structured-error";

import {
  ACCOUNTING_SESSION_COOKIE,
  ACCOUNTING_TRANSACTION_COOKIE,
  getAccountingOidcClient,
  readAccountingCookie,
  resolveAccountingRole,
} from "@/app/lib/company-oidc";
import {
  getAccountingCallbackOrigin,
  getPublicOrigin,
} from "@/app/lib/public-url";

/**
 * Expires an Accounting host-only transaction cookie.
 * @param response Response that receives the expired cookie.
 * @param secure Whether the browser-visible target uses HTTPS.
 * @returns Nothing.
 */
function expireTransactionCookie(
  response: NextResponse,
  secure: boolean,
): void {
  response.cookies.set(ACCOUNTING_TRANSACTION_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure,
  });
}

/** Exchanges one exact Accounts callback for an Accounting-local opaque session. */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  let publicOrigin: URL;
  try {
    publicOrigin = getPublicOrigin(request);
  } catch {
    publicOrigin = getAccountingCallbackOrigin();
  }
  const secure =
    process.env.NODE_ENV === "production" || publicOrigin.protocol === "https:";
  const transaction = readAccountingCookie(
    request,
    ACCOUNTING_TRANSACTION_COOKIE,
  );
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!transaction || !code || !state) {
    const response = NextResponse.redirect(
      new URL("/login?error=sso", publicOrigin),
    );
    expireTransactionCookie(response, secure);
    return response;
  }
  try {
    const session = await getAccountingOidcClient().exchange({
      code,
      state,
      sealedTransaction: transaction,
    });
    if (!resolveAccountingRole(session.identity.roles)) {
      try {
        await getAccountingOidcClient().logout(session.accessToken);
      } catch (error) {
        logStructuredError({
          event: "accounting_callback_revocation_error",
          error,
        });
      }
      const response = NextResponse.redirect(
        new URL("/login?error=forbidden", publicOrigin),
      );
      expireTransactionCookie(response, secure);
      return response;
    }
    const response = NextResponse.redirect(
      new URL(session.returnTo, publicOrigin),
    );
    response.cookies.set(ACCOUNTING_SESSION_COOKIE, session.accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(
        1,
        Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000),
      ),
    });
    expireTransactionCookie(response, secure);
    return response;
  } catch (error) {
    logStructuredError({
      event: "accounting_oidc_callback_failed",
      requestId: request.headers.get("x-request-id") ?? null,
      error,
      fields: { method: request.method, route: url.pathname },
    });
    const response = NextResponse.redirect(
      new URL("/login?error=sso", publicOrigin),
    );
    expireTransactionCookie(response, secure);
    return response;
  }
}
