import { NextResponse } from "next/server";

import {
  getMarketingOidcClient,
  MARKETING_SESSION_COOKIE,
  MARKETING_TRANSACTION_COOKIE,
  readMarketingCookie,
} from "@/lib/company-oidc";
import { getPublicOrigin } from "@/lib/public-url";

/**
 * Expires the Marketing transaction cookie with its original attributes.
 * @param response Response that receives the expired cookie.
 * @param secure Whether the browser-visible origin uses HTTPS.
 * @returns Nothing.
 */
function expireTransactionCookie(
  response: NextResponse,
  secure: boolean,
): void {
  response.cookies.set(MARKETING_TRANSACTION_COOKIE, "", {
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
    expireTransactionCookie(response, secure);
    return response;
  }
  try {
    const session = await getMarketingOidcClient().exchange({
      code,
      state,
      sealedTransaction: transaction,
    });
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
    expireTransactionCookie(response, secure);
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/login?error=sso", publicOrigin));
    expireTransactionCookie(response, secure);
    return response;
  }
}
