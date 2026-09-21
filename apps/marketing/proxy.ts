import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MARKETING_SESSION_COOKIE } from "./app/lib/company-oidc";

const protectedPathPattern = /^\/(?:settings|campaigns)(?:\/|$)/;

/**
 * Redirects unauthenticated visitors away from protected Marketing pages.
 * @param request Incoming page request.
 * @returns A redirect to login or the normal request continuation.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const sessionToken = request.cookies.get(MARKETING_SESSION_COOKIE)?.value;

  if (!protectedPathPattern.test(pathname) || sessionToken) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/settings/:path*", "/campaigns/:path*"],
};
