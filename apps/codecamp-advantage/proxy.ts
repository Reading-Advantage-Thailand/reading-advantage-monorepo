import { AuthError, SESSION_COOKIE_NAME, requireRole } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { routing } from "./i18n/routing";
import { isLegacyCodecampAuthEnabled } from "./lib/auth-mode";
import { resolveRequestLocale } from "./lib/locale-resolution";
import { getPublicOrigin, getPublicUrl } from "./lib/public-url";
import { buildSignInHref } from "./lib/sign-in-href";

const CODECAMP_SESSION_COOKIE = "__Host-ra_codecamp_session";
const intlMiddleware = createIntlMiddleware(routing);

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
    if (!sessionToken) {
      if (legacyMode) return NextResponse.redirect(getPublicUrl(request, "/"));
      return NextResponse.redirect(
        new URL(buildSignInHref(pathname, search), getPublicOrigin(request)),
      );
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
          const response = NextResponse.redirect(getPublicUrl(request, "/"));
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
    const { locale, fromCookie } = resolveRequestLocale(request);
    const localeUrl = getPublicUrl(
      request,
      `/${locale}${pathname === "/" ? "" : pathname}`,
    );
    localeUrl.search = search;
    const response = NextResponse.redirect(localeUrl);
    if (!fromCookie) {
      response.cookies.set("NEXT_LOCALE", locale, {
        path: "/",
        sameSite: "lax",
      });
    }
    return response;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|webhooks|_next|.*\\..*).*)"],
};
