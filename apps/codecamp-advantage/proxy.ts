import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  if (pathname.match(/^\/(th|en)\/admin/) || pathname === "/admin" || pathname.startsWith("/admin/")) {
    const sessionToken = request.cookies.get("session_token")?.value;
    if (!sessionToken) {
      const homeUrl = new URL("/", request.url);
      homeUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(homeUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
