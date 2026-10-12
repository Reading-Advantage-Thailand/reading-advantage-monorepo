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

const BOOK_PATH = /^\/b\/[a-z0-9-]+\/[1-9]\d*(\/writing)?$/;

/**
 * Keeps a callback only when it is the address of a printed QR book lesson: `/b/<book>/<n>`
 * or `/b/<book>/<n>/writing`, with or without a locale prefix.
 * @param value The raw callbackUrl query value.
 * @returns The book path without a locale prefix, or null for any other value.
 */
export function bookCallbackPath(value: string | null): string | null {
  const path = safeCallbackPath(value);
  return path && BOOK_PATH.test(path) ? path : null;
}

/**
 * Keeps a callback for a student: a local path under `/student`, or the address of a printed QR
 * book lesson that the student opened before the sign-in.
 * @param value The raw callbackUrl query value.
 * @returns The local student or book path without a locale prefix, or null for any other value.
 */
export function studentCallbackPath(value: string | null): string | null {
  const path = safeCallbackPath(value);
  if (path === "/student" || path?.startsWith("/student/")) return path;
  return bookCallbackPath(value);
}
