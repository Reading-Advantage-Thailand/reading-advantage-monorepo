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
  return NextResponse.json(
    { session: session ? { user: marketingSessionUser(session.identity) } : null },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
