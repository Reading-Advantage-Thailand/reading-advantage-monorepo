/**
 * Public URL helpers for the Codecamp proxy and every auth route.
 *
 * The proxy and every auth route must share this helper and never duplicate
 * it. Duplicating the forwarding logic in one caller and omitting it in
 * another is the bug this module exists to prevent.
 */

/**
 * Builds the public origin for a request, honoring the trusted Cloud Run
 * forwarding hop.
 *
 * Precedence: the `x-forwarded-proto` and `x-forwarded-host` headers take
 * precedence over the request URL. The port is stripped only when the
 * forwarded host carries none.
 *
 * @param request Incoming browser request.
 * @returns Public origin URL.
 */
export function getPublicOrigin(request: Request): URL {
  throw new Error(`Not implemented: getPublicOrigin(${request.method ?? "GET"}) implemented in Phase 3`);
}

/**
 * Builds a public redirect URL that honors the trusted Cloud Run forwarding
 * hop.
 *
 * Precedence: the `x-forwarded-proto` and `x-forwarded-host` headers take
 * precedence over the request URL. The port is stripped only when the
 * forwarded host carries none.
 *
 * @param request Incoming browser request.
 * @param pathname Public destination pathname.
 * @returns Public redirect URL.
 */
export function getPublicUrl(request: Request, pathname: string): URL {
  throw new Error(`Not implemented: getPublicUrl(${request.method ?? "GET"}, ${pathname}) implemented in Phase 3`);
}