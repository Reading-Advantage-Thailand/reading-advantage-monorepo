import { NextResponse } from "next/server";

import {
  ACCOUNTING_SESSION_COOKIE,
  ACCOUNTING_TRANSACTION_COOKIE,
  getAccountingOidcClient,
  getAccountingPublicOrigin,
  readAccountingCookie,
} from "@/app/lib/company-oidc";

/** Exchanges one exact Accounts callback for an Accounting-local opaque session. */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const publicOrigin = getAccountingPublicOrigin();
  const transaction = readAccountingCookie(
    request,
    ACCOUNTING_TRANSACTION_COOKIE,
  );
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!transaction || !code || !state) {
    return NextResponse.redirect(new URL("/login?error=sso", publicOrigin));
  }
  try {
    const session = await getAccountingOidcClient().exchange({
      code,
      state,
      sealedTransaction: transaction,
    });
    const response = NextResponse.redirect(
      new URL(session.returnTo, publicOrigin),
    );
    response.cookies.set(ACCOUNTING_SESSION_COOKIE, session.accessToken, {
      httpOnly: true,
      // __Host- cookies require Secure; browsers accept Secure on localhost,
      // so this holds for both local http development and https production.
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(
        1,
        Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000),
      ),
    });
    response.cookies.delete(ACCOUNTING_TRANSACTION_COOKIE);
    return response;
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "accounting_oidc_callback_failed",
        requestId: request.headers.get("x-request-id") ?? null,
        method: request.method,
        route: url.pathname,
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    const response = NextResponse.redirect(
      new URL("/login?error=sso", publicOrigin),
    );
    response.cookies.delete(ACCOUNTING_TRANSACTION_COOKIE);
    return response;
  }
}
