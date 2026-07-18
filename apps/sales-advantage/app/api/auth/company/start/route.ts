import { NextResponse } from "next/server";

import {
  SALES_TRANSACTION_COOKIE,
  getSalesOidcClient,
} from "@/lib/company-oidc";

/** Starts the Sales PKCE authorization handoff to Accounts. */
export async function GET(request: Request): Promise<NextResponse> {
  const returnTo = new URL(request.url).searchParams.get("returnTo") ?? "/";
  const started = await getSalesOidcClient().start(returnTo);
  const response = NextResponse.redirect(started.authorizationUrl);
  response.cookies.set(SALES_TRANSACTION_COOKIE, started.sealedTransaction, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
