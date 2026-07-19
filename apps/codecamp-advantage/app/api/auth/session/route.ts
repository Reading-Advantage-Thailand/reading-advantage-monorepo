import { handleSession } from "@reading-advantage/api/routes/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isLegacyCodecampAuthEnabled } from "@/lib/auth-mode";
import {
  CODECAMP_SESSION_COOKIE,
  getCodecampOidcClient,
  readCodecampCookie,
  resolveCodecampSessionUser,
} from "@/lib/company-oidc";

/**
 * Returns the session selected by the explicit Codecamp authentication mode.
 * @param request Browser session request.
 * @returns Legacy local session or revocation-aware Accounts application session.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (isLegacyCodecampAuthEnabled()) return handleSession(request);

  const token = readCodecampCookie(request, CODECAMP_SESSION_COOKIE);
  const session = token ? await getCodecampOidcClient().introspect(token) : null;
  const user = session ? await resolveCodecampSessionUser(session.identity) : null;
  return NextResponse.json(
    { session: user ? { user } : null },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
