import { NextResponse } from "next/server";

import {
  CODECAMP_SESSION_COOKIE,
  getCodecampOidcClient,
  readCodecampCookie,
} from "@/lib/company-oidc";

/** Revokes and clears only the Codecamp application session. */
export async function POST(request: Request): Promise<NextResponse> {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }
  const token = readCodecampCookie(request, CODECAMP_SESSION_COOKIE);
  if (token) await getCodecampOidcClient().logout(token);
  const response = NextResponse.json({ success: true });
  response.cookies.delete(CODECAMP_SESSION_COOKIE);
  return response;
}
