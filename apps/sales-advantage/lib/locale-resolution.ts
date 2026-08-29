import { routing } from "@/i18n/routing";

/** Describes the selected request locale. */
export interface ResolvedRequestLocale {
  /** Resolved locale identifier, either from the cookie or the default. */
  readonly locale: string;
  /** True when the locale came from a valid NEXT_LOCALE cookie. */
  readonly fromCookie: boolean;
}

/**
 * Resolves the locale for an unprefixed request.
 * @param request Incoming browser request.
 * @returns Resolved locale and whether it came from the NEXT_LOCALE cookie.
 */
export function resolveRequestLocale(request: Request): ResolvedRequestLocale {
  const localeCookie = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((cookie) => {
      const [name, ...value] = cookie.trim().split("=");
      return name === "NEXT_LOCALE" ? value.join("=") : undefined;
    })
    .find((value) => value !== undefined);
  const locale = routing.locales.find((candidate) => candidate === localeCookie);

  return locale
    ? { locale, fromCookie: true }
    : { locale: routing.defaultLocale, fromCookie: false };
}
