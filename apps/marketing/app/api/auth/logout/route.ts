import { NextResponse } from "next/server";

import {
  getMarketingOidcClient,
  MARKETING_SESSION_COOKIE,
  readMarketingCookie,
} from "@/lib/company-oidc";
import { getPublicOrigin } from "@/lib/public-url";

/** Revokes and clears only the Marketing application session. */
export async function POST(request: Request): Promise<NextResponse> {
  const publicOrigin = getPublicOrigin(request);
  if (request.headers.get("origin") !== publicOrigin.origin) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }
  const token = readMarketingCookie(request, MARKETING_SESSION_COOKIE);
  if (token) await getMarketingOidcClient().logout(token);
  const response = NextResponse.json({ success: true });
  response.cookies.set(MARKETING_SESSION_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: publicOrigin.protocol === "https:",
  });
  return response;
}
