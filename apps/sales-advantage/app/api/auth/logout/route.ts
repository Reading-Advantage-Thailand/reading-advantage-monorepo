import { NextResponse } from "next/server";

import {
  SALES_SESSION_COOKIE,
  getSalesOidcClient,
  readSalesCookie,
} from "@/lib/company-oidc";

/** Revokes and clears only the Sales application session. */
export async function POST(request: Request): Promise<NextResponse> {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }
  const token = readSalesCookie(request, SALES_SESSION_COOKIE);
  if (token) await getSalesOidcClient().logout(token);
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SALES_SESSION_COOKIE);
  return response;
}
