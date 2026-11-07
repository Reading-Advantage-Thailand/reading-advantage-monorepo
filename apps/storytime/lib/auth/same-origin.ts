/**
 * The same-origin check of the sign-in and the sign-out (design section 2, AC-4.3).
 *
 * The check is the first statement of both handlers. A request from another site gets 403, sets
 * no cookie, and changes no session. The comparison uses the own origin of the request only; the
 * forwarded host never moves it.
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
 * Checks that a request comes from the app itself.
 * @param headers The headers of the request.
 * @param ownOrigin The origin of the app, from `request.nextUrl.origin`.
 * @throws {CrossOriginError} When the request comes from another site.
 */
export function assertSameOrigin(headers: Headers, ownOrigin: string): void {
  const origin = headers.get("origin");
  if (origin !== null) {
    if (origin !== ownOrigin) throw new CrossOriginError();
    return;
  }
  const referer = headers.get("referer");
  if (referer === null) throw new CrossOriginError();
  if (originOf(referer) !== ownOrigin) throw new CrossOriginError();
}
