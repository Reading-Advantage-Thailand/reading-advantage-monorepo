import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { isLegacySalesAuthEnabled } from "./lib/auth-mode";
import { SALES_SESSION_COOKIE } from "./lib/company-oidc";
import { resolveRequestLocale } from "./lib/locale-resolution";
import { getPublicOrigin, getPublicUrl } from "./lib/public-url";
import { buildSignInHref } from "./lib/sign-in-href";

const LEGACY_SESSION_COOKIE = "session_token";
const intlMiddleware = createIntlMiddleware(routing);

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
    if (!sessionToken) {
      if (isLegacySalesAuthEnabled()) {
        return NextResponse.redirect(getPublicUrl(request, "/"));
      }
      return NextResponse.redirect(
        new URL(buildSignInHref(pathname, search), getPublicOrigin(request)),
      );
    }

    // The proxy performs only a routing hint from cookie presence. Exact
    // SALES_ADMIN authorization is enforced by the revocation-aware backend.
  }

  const hasLocalePrefix = routing.locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (!hasLocalePrefix) {
    const { locale, fromCookie } = resolveRequestLocale(request);
    const localeUrl = getPublicUrl(
      request,
      `/${locale}${pathname === "/" ? "/" : pathname}`,
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
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
