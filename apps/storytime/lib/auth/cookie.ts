import { createHash, randomBytes } from "node:crypto";

/**
 * The session cookie of the Storytime app (design section 2, AC-4.3).
 *
 * The cookie holds a random token. The database holds the lower-case SHA-256 digest of the
 * token only, so a stolen database row does not open a session. The `__Host-` prefix asks the
 * browser for a secure cookie without a `Domain` value, and the flags ask for `HttpOnly`,
 * `Secure`, and `SameSite=Lax`, so a QR scan (a top-level GET) sends the cookie back.
 */

/** The name of the Storytime session cookie. */
export const SESSION_COOKIE_NAME = "__Host-st_session";

/** The lifetime of the session cookie in seconds. */
const MAX_AGE_S = 31_536_000;

/**
 * Draws a new session token.
 * @returns A random 43-character base64url token.
 */
export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Computes the stored digest of a session token.
 * @param token The raw token of the cookie.
 * @returns The lower-case 64-hex SHA-256 digest that the database holds.
 */
export function sessionTokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Builds the cookie header of a signed-in device.
 * @param token The raw token of the cookie.
 * @returns The `Set-Cookie` value.
 */
export function createSessionCookie(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}; Max-Age=${MAX_AGE_S}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

/** The name of the one-trip cookie that keeps the username after a wrong sign-in (UX F1). */
export const SIGN_IN_USERNAME_COOKIE = "st_signin_username";

/** The username rule of the flash cookie: a-z, 0-9, "-", "_", ".", and 1 to 64 characters. */
const FLASH_USERNAME_RULE = /^[a-z0-9._-]{1,64}$/;

/**
 * Builds the flash cookie that carries the username back to the sign-in form.
 *
 * The cookie is host-only, lives 60 seconds, and goes only to the sign-in page of the locale.
 * It holds the username and never the password.
 * @param locale The locale of the sign-in page.
 * @param username The username of the form; the helper trims and lower-cases it.
 * @returns The `Set-Cookie` value, or `null` when the username fails the username rule.
 */
export function createSignInUsernameCookie(locale: string, username: string): string | null {
  const value = username.trim().toLowerCase();
  if (!FLASH_USERNAME_RULE.test(value)) return null;
  return `${SIGN_IN_USERNAME_COOKIE}=${value}; Max-Age=60; Path=/${locale}/sign-in; HttpOnly; Secure; SameSite=Strict`;
}

/**
 * Builds the cookie header that clears the username flash cookie.
 * @param locale The locale of the sign-in page.
 * @returns The `Set-Cookie` value.
 */
export function clearSignInUsernameCookie(locale: string): string {
  return `${SIGN_IN_USERNAME_COOKIE}=; Max-Age=0; Path=/${locale}/sign-in; HttpOnly; Secure; SameSite=Strict`;
}

/**
 * Builds the cookie header that ends a session on the device.
 * @returns The `Set-Cookie` value.
 */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}
