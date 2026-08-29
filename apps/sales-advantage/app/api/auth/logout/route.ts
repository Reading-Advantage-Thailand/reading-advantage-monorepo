import { handleLogout } from "@reading-advantage/api/routes/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isLegacySalesAuthEnabled } from "@/lib/auth-mode";
import {
  SALES_SESSION_COOKIE,
  getSalesOidcClient,
  readSalesCookie,
} from "@/lib/company-oidc";
import { getPublicOrigin } from "@/lib/public-url";

/**
 * Expires the Sales session cookie with its original host-only attributes.
 * @param response Response that receives the expired cookie.
 * @param secure Whether the browser-visible origin uses HTTPS.
 * @returns Nothing.
 */
function expireSalesSessionCookie(
  response: NextResponse,
  secure: boolean,
): void {
  response.cookies.set(SALES_SESSION_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure,
  });
}

/**
 * Revokes and clears the session selected by the explicit Sales auth mode.
 * @param request Same-origin browser logout request.
 * @returns Successful logout response with the active session cookie expired.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const publicOrigin = getPublicOrigin(request);
  if (request.headers.get("origin") !== publicOrigin.origin) {
    return NextResponse.json(
      { message: "Invalid request origin" },
      { status: 403 },
    );
  }
  try {
    if (isLegacySalesAuthEnabled()) {
      return await handleLogout(request);
    }

    const token = readSalesCookie(request, SALES_SESSION_COOKIE);
    if (token) await getSalesOidcClient().logout(token);
    const response = NextResponse.json({ success: true });
    expireSalesSessionCookie(response, publicOrigin.protocol === "https:");
    return response;
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "sales_logout_error",
        detail: error instanceof Error ? error.message : String(error),
      }),
    );
    return NextResponse.json({ message: "Logout failed" }, { status: 500 });
  }
}
