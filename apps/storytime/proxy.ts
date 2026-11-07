import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE_NAME } from "./lib/auth/cookie";
import { renewSessionCookie } from "./lib/auth/renewal";
import { DATABASE_URL_ENV } from "./lib/auth/store";

/**
 * The locale redirect and the session check of the Storytime service (spec FR-2, AC-2.1,
 * AC-4.1).
 *
 * A request for a path without a locale redirects to the Thai path on the same origin: `/st/2/1`
 * redirects to `/th/st/2/1`, and `/` redirects to `/th`. The proxy answers with the request origin,
 * and the Next adapter turns a same-host `Location` into a relative path, so a forged `Host` or
 * `X-Forwarded-Host` header cannot move the redirect to another origin. A path with a locale
 * prefix, a build asset, a metadata file, and an API route pass through without a redirect.
 *
 * The session check runs before the file-path rule and the passthrough list, so a dotted last
 * segment can not skip it. A request for a Storytime page with no session cookie redirects to the
 * sign-in page and keeps the scanned path in `next`. The proxy checks only that a cookie exists;
 * the pages check the session against the database.
 */

/** Paths that never redirect: the build assets, the API routes, and the service files. */
const PASSTHROUGH = [/^\/_next\//, /^\/api\//, /^\/(?:favicon\.ico|robots\.txt|sitemap\.xml)$/];

/** A path whose last segment names a file. */
const FILE_PATH = /\.[^/]+$/;

/**
 * Redirects a path to a locale prefix.
 *
 * Next requires an absolute URL here. The adapter compares the host of the target with the host of
 * the request and writes a relative `Location` when they match.
 * @param request The request.
 * @param path The target path with its query.
 * @returns The redirect response.
 */
function localeRedirect(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.nextUrl));
}

/**
 * Reads the path of a request in its plain form.
 *
 * The path is decoded once, so an encoded section or an encoded slash still names the page it
 * hides. A bad encoding reads as no path, and the request then goes to the sign-in page.
 * @param pathname The raw path of the request.
 * @returns The decoded path, or `null` when the path holds a bad encoding.
 */
function decodedPath(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

/**
 * Reports whether a path names a page that needs a session.
 * @param pathname The raw path of the request.
 * @returns The locale of the page, or `null` when the path needs no session.
 */
function protectedLocale(pathname: string): string | null {
  const decoded = decodedPath(pathname);
  if (decoded === null) {
    const first = (pathname.split("/")[1] ?? "").toLowerCase();
    return (routing.locales as readonly string[]).includes(first) ? first : null;
  }
  const segments = decoded.split("/").filter((segment) => segment.length > 0);
  const locale = (segments[0] ?? "").toLowerCase();
  const section = (segments[1] ?? "").toLowerCase();
  if (!(routing.locales as readonly string[]).includes(locale)) return null;
  if (section !== "st" && section !== "teacher") return null;
  return locale;
}

/**
 * Passes a protected request on and re-sets the session cookie when the session is renewed.
 *
 * The page code cannot write a cookie, so the renewal runs here (AC-4.4). A renewal that fails
 * does not block the page: the request passes on and the cookie stays as it was. Without a
 * database URL the proxy only checks that a cookie exists, and it takes this path no more.
 * @param token The raw token of the session cookie.
 * @returns The pass-through response, with the renewed cookie when the session was renewed.
 */
async function renewedPass(token: string): Promise<NextResponse> {
  const response = NextResponse.next();
  try {
    const renewed = await renewSessionCookie(token, new Date());
    if (renewed !== null) response.headers.append("Set-Cookie", renewed);
  } catch {
    console.warn("storytime session renewal failed: reason=store_error");
  }
  return response;
}

/**
 * Adds the default locale to a path without one, and sends a request without a session to the
 * sign-in page.
 *
 * The visible type is `NextResponse`, as at the base: the unit tests read the answer with no
 * `await`. The one answer that is a promise is the renewal pass of a request that holds a session
 * cookie while the environment names a database; Next.js awaits the answer of a proxy.
 * @param request The request.
 * @returns A pass-through response, the redirect to the Thai path, or the redirect to sign-in.
 */
export default function proxy(request: NextRequest): NextResponse;
export default function proxy(request: NextRequest): NextResponse | Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  const locale = protectedLocale(pathname);
  if (locale !== null && !request.cookies.get(SESSION_COOKIE_NAME)) {
    const target = new URL(
      `/${locale}/sign-in?next=${encodeURIComponent(`${pathname}${search}`)}`,
      request.nextUrl,
    );
    const response = NextResponse.redirect(target);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (locale !== null && token && process.env[DATABASE_URL_ENV]) return renewedPass(token);

  if (PASSTHROUGH.some((pattern) => pattern.test(pathname))) return NextResponse.next();
  if (FILE_PATH.test(pathname)) return NextResponse.next();

  const first = (pathname.split("/")[1] ?? "").toLowerCase();
  if ((routing.locales as readonly string[]).includes(first)) return NextResponse.next();

  return localeRedirect(
    request,
    `/${routing.defaultLocale}${pathname === "/" ? "" : pathname}${search}`,
  );
}
