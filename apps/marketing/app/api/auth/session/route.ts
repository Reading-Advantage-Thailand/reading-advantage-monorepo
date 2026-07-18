import { NextResponse } from "next/server";

import {
  getMarketingOidcClient,
  MARKETING_SESSION_COOKIE,
  marketingSessionUser,
  readMarketingCookie,
} from "@/lib/company-oidc";

/** Returns the current revocation-aware Marketing application session. */
export async function GET(request: Request): Promise<NextResponse> {
  const token = readMarketingCookie(request, MARKETING_SESSION_COOKIE);
  const session = token ? await getMarketingOidcClient().introspect(token) : null;
  const user = session ? marketingSessionUser(session.identity) : null;
  return NextResponse.json(
    { session: user ? { user } : null },
    {
      status: session && !user ? 403 : 200,
      headers: { "Cache-Control": "no-store, private" },
    },
  );
}
