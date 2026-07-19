import { handleLogout } from "@reading-advantage/api/routes/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isLegacyCodecampAuthEnabled } from "@/lib/auth-mode";
import {
  CODECAMP_SESSION_COOKIE,
  getCodecampOidcClient,
  readCodecampCookie,
} from "@/lib/company-oidc";

/**
 * Revokes and clears the session selected by the explicit Codecamp authentication mode.
 * @param request Same-origin browser logout request.
 * @returns Successful logout response with only the active-mode cookie expired.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json(
      { message: "Invalid request origin" },
      { status: 403 },
    );
  }
  if (isLegacyCodecampAuthEnabled()) return handleLogout(request);

  const token = readCodecampCookie(request, CODECAMP_SESSION_COOKIE);
  if (token) await getCodecampOidcClient().logout(token);
  const response = NextResponse.json({ success: true });
  response.cookies.delete(CODECAMP_SESSION_COOKIE);
  return response;
}
