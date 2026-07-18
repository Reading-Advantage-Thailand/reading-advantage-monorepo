import { NextResponse } from "next/server";

import {
  SALES_SESSION_COOKIE,
  SALES_TRANSACTION_COOKIE,
  getSalesOidcClient,
  getSalesPublicOrigin,
  readSalesCookie,
} from "@/lib/company-oidc";

/** Exchanges one exact Accounts callback for a Sales-local opaque session. */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const publicOrigin = getSalesPublicOrigin();
  const transaction = readSalesCookie(request, SALES_TRANSACTION_COOKIE);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!transaction || !code || !state) {
    return NextResponse.redirect(new URL("/?error=sso", publicOrigin));
  }
  try {
    const session = await getSalesOidcClient().exchange({
      code,
      state,
      sealedTransaction: transaction,
    });
    const response = NextResponse.redirect(new URL(session.returnTo, publicOrigin));
    response.cookies.set(SALES_SESSION_COOKIE, session.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(1, Math.floor(
        (new Date(session.expiresAt).getTime() - Date.now()) / 1000,
      )),
    });
    response.cookies.delete(SALES_TRANSACTION_COOKIE);
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/?error=sso", publicOrigin));
    response.cookies.delete(SALES_TRANSACTION_COOKIE);
    return response;
  }
}
