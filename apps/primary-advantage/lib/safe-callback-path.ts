import { routing } from "@/i18n/routing";

const LOCALE_PREFIX = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);

/** True when the path is local: it starts with one slash and has no backslash or control character. */
const isLocalPath = (path: string) => path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && !/[\u0000-\u001f\u007f]/.test(path);

/**
 * Keeps a callback only when it is a path on this site, without its locale.
 * The checks run on the raw value, on the percent-decoded value, and on both after the locale strip,
 * so `/th//evil.com` and `/th/%2F%2Fevil.com` do not become a protocol-relative URL.
 * The i18n router adds the current locale again on push.
 * @param value The raw callbackUrl query value.
 * @returns The local path without a locale prefix, or null for any other value.
 */
export function safeCallbackPath(value: string | null): string | null {
  if (!value) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  const stripped = value.replace(LOCALE_PREFIX, "") || "/";
  const strippedDecoded = decoded.replace(LOCALE_PREFIX, "") || "/";
  if (LOCALE_PREFIX.test(stripped) || LOCALE_PREFIX.test(strippedDecoded)) return null;
  return [value, decoded, stripped, strippedDecoded].every(isLocalPath) ? stripped : null;
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
