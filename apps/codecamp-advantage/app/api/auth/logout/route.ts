import { handleLogout } from "@reading-advantage/api/routes/auth";
import { logStructuredError } from "@reading-advantage/utils/structured-error";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isLegacyCodecampAuthEnabled } from "@/lib/auth-mode";
import {
  CODECAMP_SESSION_COOKIE,
  getCodecampOidcClient,
  readCodecampCookie,
} from "@/lib/company-oidc";
import { getPublicOrigin } from "@/lib/public-url";

/** Expires the Codecamp session cookie with its original host-only attributes. */
function expireCodecampSessionCookie(response: NextResponse): void {
  response.cookies.set(CODECAMP_SESSION_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: true,
  });
}

/**
 * Revokes and clears the session selected by the explicit Codecamp authentication mode.
 * @param request Same-origin browser logout request.
 * @returns Successful logout response with only the active-mode cookie expired.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const publicOrigin = getPublicOrigin(request);
  if (request.headers.get("origin") !== publicOrigin.origin) {
    return NextResponse.json(
      { message: "Invalid request origin" },
      { status: 403 },
    );
  }
  if (isLegacyCodecampAuthEnabled()) return handleLogout(request);

  const token = readCodecampCookie(request, CODECAMP_SESSION_COOKIE);
  let revocationFailed = false;
  if (token) {
    try {
      const revoked = await getCodecampOidcClient().logout(token);
      if (!revoked) {
        revocationFailed = true;
        logStructuredError({ event: "codecamp_logout_revocation_failed" });
      }
    } catch (error) {
      revocationFailed = true;
      logStructuredError({
        event: "codecamp_logout_revocation_error",
        error,
      });
    }
  }
  const response = NextResponse.json(
    { success: !revocationFailed },
    { status: revocationFailed ? 502 : 200 },
  );
  expireCodecampSessionCookie(response);
  return response;
}
