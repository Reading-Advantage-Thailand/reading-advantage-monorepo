import { isSafeReturnTo } from "../../../accounts/lib/server/safe-return-path";

/**
 * Builds the sign-in href for the current path and query.
 * @param pathname Current request pathname.
 * @param search Current request query string, including the leading `?` or empty.
 * @returns Sign-in href with `returnTo` set.
 */
export function buildSignInHref(pathname: string, search: string): string {
  const returnTo = isSafeReturnTo(pathname, search)
    ? `${pathname}${search}`
    : "/";
  return `/api/auth/company/start?${new URLSearchParams({ returnTo }).toString()}`;
}