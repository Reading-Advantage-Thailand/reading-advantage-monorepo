import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

/**
 * The locale redirect of the Storytime service (spec FR-2, AC-2.1; plan task 3.1).
 *
 * A request for a path without a locale redirects to the Thai path on the same origin: `/st/2/1`
 * redirects to `/th/st/2/1`, and `/` redirects to `/th`. The proxy answers with the request origin,
 * and the Next adapter turns a same-host `Location` into a relative path, so a forged `Host` or
 * `X-Forwarded-Host` header cannot move the redirect to another origin. A path with a locale
 * prefix, a build asset, a metadata file, and an API route pass through without a redirect.
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
 * Adds the default locale to a path without one.
 * @param request The request.
 * @returns A pass-through response, or the redirect to the Thai path.
 */
export default function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (PASSTHROUGH.some((pattern) => pattern.test(pathname))) return NextResponse.next();
  if (FILE_PATH.test(pathname)) return NextResponse.next();

  const first = (pathname.split("/")[1] ?? "").toLowerCase();
  if ((routing.locales as readonly string[]).includes(first)) return NextResponse.next();

  return localeRedirect(
    request,
    `/${routing.defaultLocale}${pathname === "/" ? "" : pathname}${search}`,
  );
}
