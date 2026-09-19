import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  DEFAULT_ACCOUNTING_ORIGIN,
  getPublicUrl,
} from "./app/lib/public-url";

const ACCOUNTING_SESSION_COOKIE = "__Host-ra_accounting_session";

/**
 * Routes unauthenticated browsers hitting protected Accounting pages to the
 * company sign-in landing. The proxy performs only a routing hint from cookie
 * presence; exact Accounting-role authorization is enforced by the
 * revocation-aware backend guard in `app/lib/auth.ts`.
 * @param request The incoming page request.
 * @returns The next response, or a redirect to the sign-in page.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(ACCOUNTING_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    let loginUrl: URL;
    try {
      loginUrl = getPublicUrl(request, "/login");
    } catch {
      loginUrl = new URL("/login", DEFAULT_ACCOUNTING_ORIGIN);
    }
    loginUrl.searchParams.set("returnTo", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
