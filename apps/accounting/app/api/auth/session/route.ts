import { NextResponse } from "next/server";

import {
  ACCOUNTING_SESSION_COOKIE,
  accountingSessionUser,
  getAccountingOidcClient,
  readAccountingCookie,
} from "@/app/lib/company-oidc";

/** Returns the current revocation-aware Accounting application session. */
export async function GET(request: Request): Promise<NextResponse> {
  const token = readAccountingCookie(request, ACCOUNTING_SESSION_COOKIE);
  const session = token
    ? await getAccountingOidcClient().introspect(token)
    : null;
  const user = session ? accountingSessionUser(session.identity) : null;
  return NextResponse.json(
    { session: user ? { user } : null },
    {
      status: !session ? 401 : !user ? 403 : 200,
      headers: { "Cache-Control": "no-store, private" },
    },
  );
}
