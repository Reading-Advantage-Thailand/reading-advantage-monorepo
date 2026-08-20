/**
 * Resolves the request locale for an unprefixed path coming through the
 * proxy.
 *
 * The NEXT_LOCALE cookie value counts only when it is a member of
 * `routing.locales` from `../i18n/routing`. Otherwise the default locale
 * resolves with `fromCookie: false`. The proxy writes NEXT_LOCALE only when
 * `fromCookie` is false.
 */

export interface ResolvedRequestLocale {
  /** Resolved locale identifier, either from the cookie or the default. */
  locale: string;
  /** True when the locale came from a valid NEXT_LOCALE cookie. */
  fromCookie: boolean;
}

/**
 * Resolves the locale for a request that arrives without a locale prefix.
 *
 * @param request Incoming browser request.
 * @returns Resolved locale and whether it came from the NEXT_LOCALE cookie.
 */
export function resolveRequestLocale(request: Request): ResolvedRequestLocale {
  throw new Error(`Not implemented: resolveRequestLocale(${request.method ?? "GET"}) implemented in Phase 3`);
}