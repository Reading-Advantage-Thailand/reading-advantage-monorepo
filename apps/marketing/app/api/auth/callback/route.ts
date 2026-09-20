import { NextResponse } from "next/server";

import {
  getMarketingOidcClient,
  MARKETING_SESSION_COOKIE,
  MARKETING_TRANSACTION_COOKIE,
  readMarketingCookie,
} from "@/lib/company-oidc";
import { resolveMarketingRole } from "@/lib/marketing-permissions";
import { getPublicOrigin } from "@/lib/public-url";

/**
 * Expires a Marketing host-only cookie with its original attributes.
 * @param response Response that receives the expired cookie.
 * @param name Cookie name to expire.
 * @param secure Whether the browser-visible origin uses HTTPS.
 * @returns Nothing.
 */
function expireCookie(
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

/** Exchanges one exact Accounts callback for a Marketing-local opaque session. */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const publicOrigin = getPublicOrigin(request);
  const secure = publicOrigin.protocol === "https:";
  const transaction = readMarketingCookie(request, MARKETING_TRANSACTION_COOKIE);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!transaction || !code || !state) {
    const response = NextResponse.redirect(
      new URL("/login?error=sso", publicOrigin),
    );
    expireCookie(response, MARKETING_TRANSACTION_COOKIE, secure);
    return response;
  }
  try {
    const session = await getMarketingOidcClient().exchange({
      code,
      state,
      sealedTransaction: transaction,
    });
    if (!resolveMarketingRole(session.identity.roles)) {
      try {
        await getMarketingOidcClient().logout(session.accessToken);
      } catch (error) {
        void error;
      }
      const response = NextResponse.redirect(
        new URL("/login?error=forbidden", publicOrigin),
      );
      expireCookie(response, MARKETING_SESSION_COOKIE, secure);
      expireCookie(response, MARKETING_TRANSACTION_COOKIE, secure);
      return response;
    }
    const response = NextResponse.redirect(new URL(session.returnTo, publicOrigin));
    response.cookies.set(MARKETING_SESSION_COOKIE, session.accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(1, Math.floor(
        (new Date(session.expiresAt).getTime() - Date.now()) / 1000,
      )),
    });
    expireCookie(response, MARKETING_TRANSACTION_COOKIE, secure);
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/login?error=sso", publicOrigin));
    expireCookie(response, MARKETING_TRANSACTION_COOKIE, secure);
    return response;
  }
}
