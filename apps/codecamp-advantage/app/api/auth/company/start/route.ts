import { NextResponse } from "next/server";

import { isLegacyCodecampAuthEnabled } from "@/lib/auth-mode";
import {
  CODECAMP_TRANSACTION_COOKIE,
  getCodecampOidcClient,
} from "@/lib/company-oidc";

/**
 * Starts the Codecamp PKCE handoff only while company mode owns authentication.
 * @param request Browser authorization request.
 * @returns Accounts redirect or an explicit legacy-mode conflict.
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (isLegacyCodecampAuthEnabled()) {
    return NextResponse.json(
      { message: "Legacy Codecamp authentication is active." },
      { status: 409 },
    );
  }
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
