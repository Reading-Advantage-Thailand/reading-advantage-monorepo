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

/**
 * Builds the cookie header that ends a session on the device.
 * @returns The `Set-Cookie` value.
 */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}
