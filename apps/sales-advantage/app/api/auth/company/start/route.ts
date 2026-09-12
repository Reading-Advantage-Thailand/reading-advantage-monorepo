import { parseCompanyOidcReturnTo } from "@reading-advantage/auth";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { isLegacySalesAuthEnabled } from "@/lib/auth-mode";
import {
  SALES_TRANSACTION_COOKIE,
  getSalesOidcClient,
} from "@/lib/company-oidc";
import { resolveRequestLocale } from "@/lib/locale-resolution";
import { getPublicOrigin, getSalesCallbackOrigin } from "@/lib/public-url";

/**
 * Starts the Sales PKCE authorization handoff to Accounts.
 * @param request Browser authorization request.
 * @returns The legacy landing page, callback-origin handoff, or Accounts redirect.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const requestedReturnTo = requestUrl.searchParams.get("returnTo") ?? "/";
  let returnTo: string;
  try {
    returnTo = parseCompanyOidcReturnTo(requestedReturnTo);
  } catch (error) {
    if (!(error instanceof ZodError)) throw error;
    console.warn(
      JSON.stringify({ level: "warn", event: "sales_sso_unsafe_return_to" }),
    );
    returnTo = "/";
  }
  const publicOrigin = getPublicOrigin(request);
  if (isLegacySalesAuthEnabled()) {
    const { locale } = resolveRequestLocale(request);
    return NextResponse.redirect(new URL(`/${locale}/`, publicOrigin));
  }
  const callbackOrigin = getSalesCallbackOrigin();
  if (publicOrigin.origin !== callbackOrigin.origin) {
    const handoffUrl = new URL(requestUrl.pathname, callbackOrigin);
    handoffUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(handoffUrl);
  }
  const client = getSalesOidcClient();
  const started = await client.start(returnTo);
  const response = NextResponse.redirect(started.authorizationUrl);
  response.cookies.set(SALES_TRANSACTION_COOKIE, started.sealedTransaction, {
    httpOnly: true,
    secure: publicOrigin.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
