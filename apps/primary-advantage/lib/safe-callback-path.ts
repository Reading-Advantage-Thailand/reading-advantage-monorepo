import { routing } from "@/i18n/routing";

const LOCALE_PREFIX = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);

/**
 * Keeps a callback only when it is a path on this site, without its locale.
 * The i18n router adds the current locale again on push.
 * @param value The raw callbackUrl query value.
 * @returns The local path without a locale prefix, or null for any other value.
 */
export function safeCallbackPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }
  return value.replace(LOCALE_PREFIX, "") || "/";
}

/**
 * Keeps a callback for a student: a local path under `/student`, for example the article of a
 * printed QR code that the student opened before the sign-in.
 * @param value The raw callbackUrl query value.
 * @returns The local student path without a locale prefix, or null for any other value.
 */
export function studentCallbackPath(value: string | null): string | null {
  const path = safeCallbackPath(value);
  return path === "/student" || path?.startsWith("/student/") ? path : null;
}
