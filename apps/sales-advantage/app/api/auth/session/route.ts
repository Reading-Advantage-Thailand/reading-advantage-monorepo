import { NextResponse } from "next/server";

import {
  SALES_SESSION_COOKIE,
  getSalesOidcClient,
  readSalesCookie,
  salesSessionUser,
} from "@/lib/company-oidc";

/** Returns the current revocation-aware Sales application session. */
export async function GET(request: Request): Promise<NextResponse> {
  const token = readSalesCookie(request, SALES_SESSION_COOKIE);
  const session = token ? await getSalesOidcClient().introspect(token) : null;
  return NextResponse.json(
    {
      session: session
        ? { user: await salesSessionUser(session.identity) }
        : null,
    },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
