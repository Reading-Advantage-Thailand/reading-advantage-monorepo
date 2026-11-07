import * as cookie from "./cookie";
import { isSessionActive, planRenewal } from "./session-policy";
import { getStore } from "./store";

/**
 * The session renewal that runs on a protected request (design section 2, AC-4.4, Review B F47).
 *
 * A Next.js server component cannot write a cookie, so the page code renews only the database
 * expiry. The proxy runs before the page and can write a response header. It calls this function,
 * and when the session is due it gets the renewed cookie to set on the response.
 */

/**
 * Renews the session of one token when the renewal rule says so.
 *
 * A session with fewer days left than the rule names, and no write on the current day, gets a new
 * expiry in the database. The function then returns the cookie with the full lifetime and the
 * same flags. A session that is unknown, expired, or of a disabled account gets no renewal. A
 * second call on the same day finds the write of the first call and returns `null`.
 * @param token The raw token of the session cookie.
 * @param now The current time.
 * @returns The `Set-Cookie` value of the renewed session, or `null` when nothing was renewed.
 */
export async function renewSessionCookie(token: string, now: Date): Promise<string | null> {
  const store = getStore();
  const session = await store.findSessionByDigest(cookie.sessionTokenDigest(token));
  if (!session) return null;
  const plan = planRenewal({ expiresAt: session.expiresAt, lastRenewedAt: session.lastUseAt }, now);
  if (!plan.renew) return null;
  const account = await store.findAccountById(session.accountId);
  if (!account) return null;
  if (!isSessionActive({ expiresAt: session.expiresAt, disabled: account.disabled }, now)) {
    return null;
  }
  await store.renewSession(session.tokenDigest, plan.expiresAt, now);
  return cookie.createSessionCookie(token);
}
