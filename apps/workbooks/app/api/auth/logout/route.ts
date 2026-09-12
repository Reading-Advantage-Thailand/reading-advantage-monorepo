import { NextResponse } from "next/server";

import {
  getWorkbooksOidcClient,
  WORKBOOKS_SESSION_COOKIE,
  readWorkbooksCookie,
} from "../../../lib/company-oidc";

/** Revokes and clears only the Workbooks application session. */
export async function POST(request: Request): Promise<NextResponse> {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }
  const token = readWorkbooksCookie(request, WORKBOOKS_SESSION_COOKIE);
  if (token) await getWorkbooksOidcClient().logout(token);
  const response = NextResponse.json({ success: true });
  response.cookies.delete(WORKBOOKS_SESSION_COOKIE);
  return response;
}
