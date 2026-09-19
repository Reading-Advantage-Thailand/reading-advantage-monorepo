import { parseCompanyOidcReturnTo } from "@reading-advantage/auth/company-identity";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  ACCOUNTING_TRANSACTION_COOKIE,
  getAccountingOidcClient,
} from "@/app/lib/company-oidc";
import {
  getAccountingCallbackOrigin,
  getPublicOrigin,
} from "@/app/lib/public-url";

/**
 * Starts the Accounting PKCE authorization handoff to Accounts.
 * @param request Browser authorization request.
 * @returns A callback-origin handoff or Accounts authorization redirect.
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
      JSON.stringify({
        event: "accounting_sso_unsafe_return_to",
        level: "warn",
      }),
    );
    returnTo = "/";
  }
  let publicOrigin: URL;
  let callbackOrigin: URL;
  try {
    publicOrigin = getPublicOrigin(request);
    callbackOrigin = getAccountingCallbackOrigin();
  } catch {
    callbackOrigin = getAccountingCallbackOrigin();
    publicOrigin = callbackOrigin;
  }
  if (publicOrigin.origin !== callbackOrigin.origin) {
    const handoffUrl = new URL(requestUrl.pathname, callbackOrigin);
    handoffUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(handoffUrl);
  }
  const started = await getAccountingOidcClient().start(returnTo);
  const response = NextResponse.redirect(started.authorizationUrl);
  response.cookies.set(
    ACCOUNTING_TRANSACTION_COOKIE,
    started.sealedTransaction,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" ||
        publicOrigin.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    },
  );
  return response;
}
