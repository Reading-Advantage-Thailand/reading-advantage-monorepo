import { NextResponse } from "next/server";

import {
  getMarketingOidcClient,
  MARKETING_SESSION_COOKIE,
  MARKETING_TRANSACTION_COOKIE,
  readMarketingCookie,
} from "@/lib/company-oidc";

/** Exchanges one exact Accounts callback for a Marketing-local opaque session. */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const transaction = readMarketingCookie(request, MARKETING_TRANSACTION_COOKIE);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!transaction || !code || !state) {
    return NextResponse.redirect(new URL("/login?error=sso", url.origin));
  }
  try {
    const session = await getMarketingOidcClient().exchange({
      code,
      state,
      sealedTransaction: transaction,
    });
    const response = NextResponse.redirect(new URL(session.returnTo, url.origin));
    response.cookies.set(MARKETING_SESSION_COOKIE, session.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(1, Math.floor(
        (new Date(session.expiresAt).getTime() - Date.now()) / 1000,
      )),
    });
    response.cookies.delete(MARKETING_TRANSACTION_COOKIE);
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/login?error=sso", url.origin));
    response.cookies.delete(MARKETING_TRANSACTION_COOKIE);
    return response;
  }
}
