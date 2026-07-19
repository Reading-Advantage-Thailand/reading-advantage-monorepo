import { NextResponse } from "next/server";

import {
  CODECAMP_SESSION_COOKIE,
  getCodecampOidcClient,
  readCodecampCookie,
  resolveCodecampSessionUser,
} from "@/lib/company-oidc";

/** Returns the current revocation-aware Codecamp application session. */
export async function GET(request: Request): Promise<NextResponse> {
  const token = readCodecampCookie(request, CODECAMP_SESSION_COOKIE);
  const session = token ? await getCodecampOidcClient().introspect(token) : null;
  const user = session ? await resolveCodecampSessionUser(session.identity) : null;
  return NextResponse.json(
    { session: user ? { user } : null },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
