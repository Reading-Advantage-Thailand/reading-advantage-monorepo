import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const CODECAMP_SESSION_COOKIE = "__Host-ra_codecamp_session";
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

function isAdminPath(lowerPath: string): boolean {
  return (
    lowerPath === "/admin" ||
    lowerPath.startsWith("/admin/") ||
    /^\/(th|en)\/admin(\/|$)/.test(lowerPath)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const lowerPath = pathname.toLowerCase();

  if (lowerPath.startsWith("/webhooks/")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  if (isAdminPath(lowerPath)) {
    const sessionToken = request.cookies.get(CODECAMP_SESSION_COOKIE)?.value;
    const redirectTarget = pathname + search;

    if (!sessionToken) {
      const homeUrl = getPublicUrl(request, "/");
      homeUrl.searchParams.set("redirectTo", redirectTarget);
      return NextResponse.redirect(homeUrl);
    }

    // The proxy performs only a routing hint from cookie presence. Exact ADMIN
    // authorization is enforced by the revocation-aware tRPC/backend context.
  }

  const hasLocalePrefix = routing.locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
  if (!hasLocalePrefix) {
    const localeUrl = getPublicUrl(request, `/${routing.defaultLocale}${pathname === "/" ? "/" : pathname}`);
    localeUrl.search = search;
    const response = NextResponse.redirect(localeUrl);
    response.cookies.set("NEXT_LOCALE", routing.defaultLocale, { path: "/", sameSite: "lax" });
    return response;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|webhooks|_next|.*\\..*).*)"],
};
