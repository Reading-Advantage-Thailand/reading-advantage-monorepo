import { NextResponse } from "next/server";

import {
  getMarketingOidcClient,
  MARKETING_SESSION_COOKIE,
  readMarketingCookie,
} from "@/lib/company-oidc";

/** Revokes and clears only the Marketing application session. */
export async function POST(request: Request): Promise<NextResponse> {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }
  const token = readMarketingCookie(request, MARKETING_SESSION_COOKIE);
  if (token) await getMarketingOidcClient().logout(token);
  const response = NextResponse.json({ success: true });
  response.cookies.delete(MARKETING_SESSION_COOKIE);
  return response;
}
