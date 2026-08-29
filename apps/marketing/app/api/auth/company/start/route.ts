import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  getMarketingOidcClient,
  MARKETING_TRANSACTION_COOKIE,
} from "@/lib/company-oidc";
import {
  getMarketingCallbackOrigin,
  getPublicOrigin,
} from "@/lib/public-url";

/**
 * Starts the Marketing PKCE authorization handoff to Accounts.
 * @param request Browser authorization request.
 * @returns The callback-origin handoff or Accounts redirect.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const returnTo = requestUrl.searchParams.get("returnTo") ?? "/";
  const publicOrigin = getPublicOrigin(request);
  const callbackOrigin = getMarketingCallbackOrigin();
  if (publicOrigin.origin !== callbackOrigin.origin) {
    const handoffUrl = new URL(requestUrl.pathname, callbackOrigin);
    handoffUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(handoffUrl);
  }
  const client = getMarketingOidcClient();
  let started;
  try {
    started = await client.start(returnTo);
  } catch (error) {
    if (!(error instanceof ZodError)) throw error;
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "marketing_sso_unsafe_return_to",
      }),
    );
    started = await client.start("/");
  }
  const response = NextResponse.redirect(started.authorizationUrl);
  response.cookies.set(MARKETING_TRANSACTION_COOKIE, started.sealedTransaction, {
    httpOnly: true,
    secure: publicOrigin.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
