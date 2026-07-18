import { NextResponse } from "next/server";

import {
  CODECAMP_TRANSACTION_COOKIE,
  getCodecampOidcClient,
} from "@/lib/company-oidc";

/** Starts the Codecamp PKCE authorization handoff to Accounts. */
export async function GET(request: Request): Promise<NextResponse> {
  const returnTo = new URL(request.url).searchParams.get("returnTo") ?? "/";
  const started = await getCodecampOidcClient().start(returnTo);
  const response = NextResponse.redirect(started.authorizationUrl);
  response.cookies.set(CODECAMP_TRANSACTION_COOKIE, started.sealedTransaction, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
