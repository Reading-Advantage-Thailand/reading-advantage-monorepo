import { NextResponse } from "next/server";

import {
  ACCOUNTING_TRANSACTION_COOKIE,
  getAccountingOidcClient,
} from "@/app/lib/company-oidc";

/** Starts the Accounting PKCE authorization handoff to Accounts. */
export async function GET(request: Request): Promise<NextResponse> {
  const returnTo = new URL(request.url).searchParams.get("returnTo") ?? "/";
  const started = await getAccountingOidcClient().start(returnTo);
  const response = NextResponse.redirect(started.authorizationUrl);
  response.cookies.set(
    ACCOUNTING_TRANSACTION_COOKIE,
    started.sealedTransaction,
    {
      httpOnly: true,
      // __Host- cookies require Secure; browsers accept Secure on localhost,
      // so this holds for both local http development and https production.
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    },
  );
  return response;
}
