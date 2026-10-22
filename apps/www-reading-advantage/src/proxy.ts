import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * Returns the public origin of a request that arrives through a reverse proxy.
 * On Cloud Run, `request.url` carries the container bind address (0.0.0.0:8080),
 * while the public host and protocol arrive in the request headers.
 * @param request The incoming request.
 * @returns The public origin, or null when the request has no host header.
 */
function getPublicOrigin(request: NextRequest): string | null {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return null;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const proto = forwardedProto || new URL(request.url).protocol.replace(":", "");
  return `${proto}://${host}`;
}

/**
 * Runs the next-intl locale middleware and repairs redirect targets that leak
 * the container origin instead of the public site origin.
 * @param request The incoming request.
 * @returns The locale middleware response with a public redirect location.
 */
export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  if (response.status !== 307 && response.status !== 308) return response;

  const location = response.headers.get("location");
  const publicOrigin = getPublicOrigin(request);
  if (!location || !publicOrigin) return response;

  const target = new URL(location, request.url);
  // Only repair redirects that point at the container's own origin.
  if (target.host !== new URL(request.url).host) return response;

  const repaired = new URL(target.pathname + target.search + target.hash, publicOrigin);
  if (repaired.href !== target.href) response.headers.set("location", repaired.href);
  return response;
}

export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)"],
};
