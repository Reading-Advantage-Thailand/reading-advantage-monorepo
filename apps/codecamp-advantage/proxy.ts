import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AuthError, SESSION_COOKIE_NAME, requireRole } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
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
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const redirectTarget = pathname + search;

    if (!sessionToken) {
      const homeUrl = getPublicUrl(request, "/");
      homeUrl.searchParams.set("redirectTo", redirectTarget);
      return NextResponse.redirect(homeUrl);
    }

    try {
      await requireRole(db, sessionToken, "ADMIN");
    } catch (err) {
      if (err instanceof AuthError && err.code === "FORBIDDEN") {
        const homeUrl = getPublicUrl(request, "/");
        homeUrl.searchParams.set("error", "forbidden");
        return NextResponse.redirect(homeUrl);
      }

      if (err instanceof AuthError && err.code === "UNAUTHORIZED") {
        const homeUrl = getPublicUrl(request, "/");
        homeUrl.searchParams.set("redirectTo", redirectTarget);
        const response = NextResponse.redirect(homeUrl);
        response.cookies.set(SESSION_COOKIE_NAME, "", {
          path: "/",
          maxAge: 0,
          sameSite: "lax",
        });
        return response;
      }

      console.error("[proxy] session check failed", err);
      const homeUrl = getPublicUrl(request, "/");
      homeUrl.searchParams.set("error", "session_check_failed");
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
