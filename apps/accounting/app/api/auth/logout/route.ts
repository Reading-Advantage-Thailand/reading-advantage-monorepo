import { NextResponse } from "next/server";

import {
  ACCOUNTING_SESSION_COOKIE,
  getAccountingOidcClient,
  readAccountingCookie,
} from "@/app/lib/company-oidc";
import { getPublicOrigin } from "@/app/lib/public-url";

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
export async function POST(request: Request): Promise<NextResponse> {
  let publicOrigin: URL;
  try {
    publicOrigin = getPublicOrigin(request);
  } catch {
    return NextResponse.json(
      { message: "Invalid request origin" },
      { status: 403 },
    );
  }
  if (request.headers.get("origin") !== publicOrigin.origin) {
    return NextResponse.json(
      { message: "Invalid request origin" },
      { status: 403 },
    );
  }
  const secure =
    process.env.NODE_ENV === "production" || publicOrigin.protocol === "https:";
  const token = readAccountingCookie(request, ACCOUNTING_SESSION_COOKIE);
  try {
    if (token) await getAccountingOidcClient().logout(token);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "accounting_logout_error",
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
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
