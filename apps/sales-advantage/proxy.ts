import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { isLegacySalesAuthEnabled } from "./lib/auth-mode";

const SALES_SESSION_COOKIE = "__Host-ra_sales_session";
const LEGACY_SESSION_COOKIE = "session_token";
const intlMiddleware = createIntlMiddleware(routing);

function getPublicUrl(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  url.protocol = forwardedProto ? `${forwardedProto}:` : url.protocol;
  url.host = forwardedHost ?? url.host;
  if (forwardedHost && !forwardedHost.includes(":")) {
    url.port = "";
  }
  url.pathname = pathname;
  url.search = "";

  return url;
}

function isProtectedPath(lowerPath: string): boolean {
  return /^\/(?:th|en)?\/?(?:admin|module|lesson)(?:\/|$)/.test(lowerPath);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const lowerPath = pathname.toLowerCase();

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (isProtectedPath(lowerPath)) {
    const sessionCookie = isLegacySalesAuthEnabled()
      ? LEGACY_SESSION_COOKIE
      : SALES_SESSION_COOKIE;
    const sessionToken = request.cookies.get(sessionCookie)?.value;
    const redirectTarget = pathname + search;

    if (!sessionToken) {
      const homeUrl = getPublicUrl(request, "/");
      homeUrl.searchParams.set("redirectTo", redirectTarget);
      return NextResponse.redirect(homeUrl);
    }

    // The proxy performs only a routing hint from cookie presence. Exact
    // SALES_ADMIN authorization is enforced by the revocation-aware backend.
  }

  const hasLocalePrefix = routing.locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (!hasLocalePrefix) {
    const localeUrl = getPublicUrl(
      request,
      `/${routing.defaultLocale}${pathname === "/" ? "/" : pathname}`,
    );
    localeUrl.search = search;
    const response = NextResponse.redirect(localeUrl);
    response.cookies.set("NEXT_LOCALE", routing.defaultLocale, {
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
