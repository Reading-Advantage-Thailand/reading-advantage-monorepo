import { NextResponse } from "next/server";
import { logStructuredError } from "@reading-advantage/utils/structured-error";

import {
  SALES_SESSION_COOKIE,
  SALES_TRANSACTION_COOKIE,
  getSalesOidcClient,
  readSalesCookie,
  salesSessionRole,
} from "@/lib/company-oidc";
import { getPublicOrigin } from "@/lib/public-url";

/**
 * Expires a Sales host-only cookie with its original attributes.
 * @param response Response that receives the expired cookie.
 * @param name Exact Sales cookie name.
 * @param secure Whether the browser-visible origin uses HTTPS.
 * @returns Nothing.
 */
function expireHostCookie(
  response: NextResponse,
  name: string,
  secure: boolean,
): void {
  response.cookies.set(name, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure,
  });
}

/** Exchanges one exact Accounts callback for a Sales-local opaque session. */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const publicOrigin = getPublicOrigin(request);
  const secure = publicOrigin.protocol === "https:";
  const transaction = readSalesCookie(request, SALES_TRANSACTION_COOKIE);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!transaction || !code || !state) {
    const response = NextResponse.redirect(new URL("/?error=sso", publicOrigin));
    expireHostCookie(response, SALES_TRANSACTION_COOKIE, secure);
    return response;
  }
  try {
    const session = await getSalesOidcClient().exchange({
      code,
      state,
      sealedTransaction: transaction,
    });
    try {
      salesSessionRole(session.identity);
    } catch {
      try {
        const revoked = await getSalesOidcClient().logout(session.accessToken);
        if (!revoked) {
          logStructuredError({ event: "sales_callback_revocation_failed" });
        }
      } catch (error) {
        logStructuredError({
          event: "sales_callback_revocation_error",
          error,
        });
      }
      const response = NextResponse.redirect(
        new URL("/?error=forbidden", publicOrigin),
      );
      expireHostCookie(response, SALES_SESSION_COOKIE, secure);
      expireHostCookie(response, SALES_TRANSACTION_COOKIE, secure);
      return response;
    }
    const response = NextResponse.redirect(new URL(session.returnTo, publicOrigin));
    response.cookies.set(SALES_SESSION_COOKIE, session.accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(1, Math.floor(
        (new Date(session.expiresAt).getTime() - Date.now()) / 1000,
      )),
    });
    expireHostCookie(response, SALES_TRANSACTION_COOKIE, secure);
    return response;
  } catch (error) {
    logStructuredError({
      event: "sales_oidc_callback_failed",
      requestId: request.headers.get("x-request-id") ?? null,
      error,
      fields: { method: request.method, route: url.pathname },
    });
    const response = NextResponse.redirect(new URL("/?error=sso", publicOrigin));
    expireHostCookie(response, SALES_TRANSACTION_COOKIE, secure);
    return response;
  }
}
