/**
 * The same-origin check of the sign-in and the sign-out (design section 2, AC-4.3).
 *
 * The check is the first statement of both handlers. A request from another site gets 403, sets
 * no cookie, and changes no session. The comparison uses the own origin of the request only (the
 * Host header and the forwarded scheme); `X-Forwarded-Host` never moves it.
 */

/**
 * The error of a request that comes from another site.
 */
export class CrossOriginError extends Error {
  /**
   * Builds the error of a cross-origin request.
   */
  constructor() {
    super("the request comes from another origin");
    this.name = "CrossOriginError";
  }
}

/**
 * Reads the origin of a URL.
 * @param value The URL of the header.
 * @returns The origin, or `null` when the value holds no URL.
 */
function originOf(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Reads the own origin of a request behind a proxy.
 *
 * In the standalone image `request.nextUrl.origin` follows the `HOSTNAME` of the server (the bind
 * address), not the host that the browser used. The own origin is `<scheme>://<Host header>`. The
 * scheme is the first value of `x-forwarded-proto` when it names `http` or `https`, else the scheme
 * of the request URL. A request with no usable Host header keeps the origin of the request URL.
 * @param headers The headers of the request.
 * @param urlOrigin The origin of the request URL, from `request.nextUrl.origin`.
 * @returns The origin that a same-site Origin header must equal.
 */
export function ownOriginOf(headers: Headers, urlOrigin: string): string {
  const host = headers.get("host")?.trim();
  if (!host) return urlOrigin;
  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const scheme =
    forwarded === "http" || forwarded === "https"
      ? forwarded
      : new URL(urlOrigin).protocol.slice(0, -1);
  return originOf(`${scheme}://${host}`) ?? urlOrigin;
}

/**
 * Checks that a request comes from the app itself.
 * @param headers The headers of the request.
 * @param ownOrigin The origin of the app, from `ownOriginOf`.
 * @throws {CrossOriginError} When the request comes from another site.
 */
export function assertSameOrigin(headers: Headers, ownOrigin: string): void {
  const origin = headers.get("origin");
  if (origin !== null) {
    // The protected pages send `Referrer-Policy: no-referrer`, so a browser writes `Origin: null`
    // on the sign-out POST of such a page. The browser sets `Sec-Fetch-Site` itself, and a page
    // cannot forge it, so `same-origin` there names a request from the own site. A cross-site
    // request, a sandboxed frame, and a request with no such header stay refused.
    if (origin === "null" && headers.get("sec-fetch-site") === "same-origin") return;
    if (origin !== ownOrigin) throw new CrossOriginError();
    return;
  }
  const referer = headers.get("referer");
  if (referer === null) throw new CrossOriginError();
  if (originOf(referer) !== ownOrigin) throw new CrossOriginError();
}
