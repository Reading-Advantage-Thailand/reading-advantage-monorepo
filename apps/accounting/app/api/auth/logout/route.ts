import { NextResponse } from "next/server";
import { logStructuredError } from "@reading-advantage/utils/structured-error";

import {
  ACCOUNTING_SESSION_COOKIE,
  getAccountingOidcClient,
  readAccountingCookie,
} from "@/app/lib/company-oidc";
import { requireSameOrigin } from "@/app/lib/route-helpers";

/**
 * Expires the Accounting session cookie with its host-only attributes.
 * @param response Response that receives the expired cookie.
 * @param secure Whether the browser-visible target uses HTTPS.
 * @returns Nothing.
 */
function expireSessionCookie(response: NextResponse, secure: boolean): void {
  response.cookies.set(ACCOUNTING_SESSION_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure,
  });
}

/** Revokes and clears only the Accounting application session. */
export async function POST(request: Request): Promise<Response> {
  const origin = requireSameOrigin(request);
  if (!origin.ok) return origin.response;
  const publicOrigin = origin.publicOrigin;
  const secure =
    process.env.NODE_ENV === "production" || publicOrigin.protocol === "https:";
  const token = readAccountingCookie(request, ACCOUNTING_SESSION_COOKIE);
  try {
    if (token) await getAccountingOidcClient().logout(token);
  } catch (error) {
    logStructuredError({ event: "accounting_logout_error", error });
    const failure = NextResponse.json(
      { message: "Logout failed" },
      { status: 500 },
    );
    expireSessionCookie(failure, secure);
    return failure;
  }
  const response = NextResponse.json({ success: true });
  expireSessionCookie(response, secure);
  return response;
}
