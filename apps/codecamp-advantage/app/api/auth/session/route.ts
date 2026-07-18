import { NextResponse } from "next/server";

import {
  CODECAMP_SESSION_COOKIE,
  codecampSessionUser,
  getCodecampOidcClient,
  readCodecampCookie,
} from "@/lib/company-oidc";

/** Returns the current revocation-aware Codecamp application session. */
export async function GET(request: Request): Promise<NextResponse> {
  const token = readCodecampCookie(request, CODECAMP_SESSION_COOKIE);
  const session = token ? await getCodecampOidcClient().introspect(token) : null;
  return NextResponse.json(
    { session: session ? { user: codecampSessionUser(session.identity) } : null },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
