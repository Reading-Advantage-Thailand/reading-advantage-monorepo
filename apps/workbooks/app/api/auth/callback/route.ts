import { NextResponse } from "next/server";

import {
  getWorkbooksOidcClient,
  getWorkbooksPublicOrigin,
  WORKBOOKS_SESSION_COOKIE,
  WORKBOOKS_TRANSACTION_COOKIE,
  readWorkbooksCookie,
} from "../../../lib/company-oidc";

/** Exchanges one exact Accounts callback for a Workbooks-local opaque session. */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const publicOrigin = getWorkbooksPublicOrigin();
  const transaction = readWorkbooksCookie(request, WORKBOOKS_TRANSACTION_COOKIE);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!transaction || !code || !state) {
    return NextResponse.redirect(new URL("/?error=sso", publicOrigin));
  }
  try {
    const session = await getWorkbooksOidcClient().exchange({
      code,
      state,
      sealedTransaction: transaction,
    });
    const response = NextResponse.redirect(new URL(session.returnTo, publicOrigin));
    response.cookies.set(WORKBOOKS_SESSION_COOKIE, session.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(1, Math.floor(
        (new Date(session.expiresAt).getTime() - Date.now()) / 1000,
      )),
    });
    response.cookies.delete(WORKBOOKS_TRANSACTION_COOKIE);
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/?error=sso", publicOrigin));
    response.cookies.delete(WORKBOOKS_TRANSACTION_COOKIE);
    return response;
  }
}
