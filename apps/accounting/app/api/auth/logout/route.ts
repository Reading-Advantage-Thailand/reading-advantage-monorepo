import { NextResponse } from "next/server";

import {
  ACCOUNTING_SESSION_COOKIE,
  getAccountingOidcClient,
  readAccountingCookie,
} from "@/app/lib/company-oidc";

/** Revokes and clears only the Accounting application session. */
export async function POST(request: Request): Promise<NextResponse> {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json(
      { message: "Invalid request origin" },
      { status: 403 },
    );
  }
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
    failure.cookies.delete(ACCOUNTING_SESSION_COOKIE);
    return failure;
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete(ACCOUNTING_SESSION_COOKIE);
  return response;
}
