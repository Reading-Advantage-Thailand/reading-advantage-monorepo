import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

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

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const lowerPath = pathname.toLowerCase();

  if (lowerPath.startsWith("/webhooks/")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  if (lowerPath.match(/^\/(th|en)\/admin/) || lowerPath === "/admin" || lowerPath.startsWith("/admin/")) {
    const sessionToken = request.cookies.get("session_token")?.value;
    if (!sessionToken) {
      const homeUrl = getPublicUrl(request, "/");
      const redirectTarget = pathname + search;
      homeUrl.searchParams.set("redirectTo", redirectTarget);
      return NextResponse.redirect(homeUrl);
    }
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
