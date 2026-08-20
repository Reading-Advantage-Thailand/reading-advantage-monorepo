/**
 * Sign-in entry contract for the Codecamp landing page.
 */

/**
 * Builds the sign-in href for the current path and query string.
 *
 * The output is always `/api/auth/company/start?returnTo=<encoded path>`
 * with the encoded current path and query string. The returnTo value is
 * relative, starts with a single `/`, never carries a host or protocol,
 * and is at most 2048 characters. An input that violates the shape falls
 * back to `/`.
 *
 * @param pathname Current request pathname.
 * @param search Current request query string, including the leading `?` or empty.
 * @returns Sign-in href with `returnTo` set.
 */
export function buildSignInHref(pathname: string, search: string): string {
  throw new Error(`Not implemented: buildSignInHref(${pathname}, ${search}) implemented in Phase 3`);
}