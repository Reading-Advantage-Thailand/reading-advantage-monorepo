import { AuthError, SESSION_COOKIE_NAME, requireRole } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { routing } from "./i18n/routing";
import { isLegacyCodecampAuthEnabled } from "./lib/auth-mode";

const CODECAMP_SESSION_COOKIE = "__Host-ra_codecamp_session";
const intlMiddleware = createIntlMiddleware(routing);

/**
 * Builds a public redirect URL that honors the trusted Cloud Run forwarding hop.
 * @param request Incoming browser request.
 * @param pathname Public destination pathname.
 * @returns Public redirect URL.
 */
function getPublicUrl(request: NextRequest, pathname: string): URL {
  const url = request.nextUrl.clone();
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  url.protocol = forwardedProto ? `${forwardedProto}:` : url.protocol;
  url.host = forwardedHost ?? url.host;
  if (forwardedHost && !forwardedHost.includes(":")) url.port = "";
  url.pathname = pathname;
  url.search = "";
  return url;
}

/**
 * Identifies Codecamp administrator routes across supported locales.
 * @param lowerPath Lower-cased request pathname.
 * @returns Whether the path is administrator-only.
 */
function isAdminPath(lowerPath: string): boolean {
  return (
    lowerPath === "/admin" ||
    lowerPath.startsWith("/admin/") ||
    /^\/(th|en)\/admin(\/|$)/.test(lowerPath)
  );
}

/**
 * Applies locale routing and an auth-mode-specific administrator routing gate.
 * @param request Incoming Next.js request.
 * @returns Redirect, locale middleware response, or pass-through response.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const lowerPath = pathname.toLowerCase();

  if (lowerPath.startsWith("/webhooks/")) return NextResponse.next();
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  if (isAdminPath(lowerPath)) {
    const legacyMode = isLegacyCodecampAuthEnabled();
    const sessionCookie = legacyMode ? SESSION_COOKIE_NAME : CODECAMP_SESSION_COOKIE;
    const sessionToken = request.cookies.get(sessionCookie)?.value;
    const redirectTarget = pathname + search;

    if (!sessionToken) {
      const homeUrl = getPublicUrl(request, "/");
      homeUrl.searchParams.set("redirectTo", redirectTarget);
      return NextResponse.redirect(homeUrl);
    }

    if (legacyMode) {
      try {
        await requireRole(db, sessionToken, "ADMIN");
      } catch (error) {
        if (error instanceof AuthError && error.code === "FORBIDDEN") {
          const homeUrl = getPublicUrl(request, "/");
          homeUrl.searchParams.set("error", "forbidden");
          return NextResponse.redirect(homeUrl);
        }
        if (error instanceof AuthError && error.code === "UNAUTHORIZED") {
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
        console.error(
          JSON.stringify({
            level: "error",
            event: "proxy_session_check_failed",
            errorName: error instanceof Error ? error.name : "UnknownError",
          }),
        );
        const homeUrl = getPublicUrl(request, "/");
        homeUrl.searchParams.set("error", "session_check_failed");
        return NextResponse.redirect(homeUrl);
      }
    }
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
  matcher: ["/((?!api|webhooks|_next|.*\\..*).*)"],
};
