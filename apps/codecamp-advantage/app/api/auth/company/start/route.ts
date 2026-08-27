import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { isLegacyCodecampAuthEnabled } from "@/lib/auth-mode";
import {
  CODECAMP_TRANSACTION_COOKIE,
  getCodecampOidcClient,
} from "@/lib/company-oidc";
import { getPublicOrigin } from "@/lib/public-url";

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
  const publicOrigin = getPublicOrigin(request);
  const client = getCodecampOidcClient();
  let started;
  try {
    started = await client.start(returnTo);
  } catch (error) {
    if (!(error instanceof ZodError)) throw error;
    console.warn(JSON.stringify({ level: "warn", event: "codecamp_sso_unsafe_return_to" }));
    started = await client.start("/");
  }
  const response = NextResponse.redirect(started.authorizationUrl);
  response.cookies.set(CODECAMP_TRANSACTION_COOKIE, started.sealedTransaction, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || publicOrigin.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
