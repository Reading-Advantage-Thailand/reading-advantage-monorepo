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
  if (token) await getAccountingOidcClient().logout(token);
  const response = NextResponse.json({ success: true });
  response.cookies.delete(ACCOUNTING_SESSION_COOKIE);
  return response;
}
