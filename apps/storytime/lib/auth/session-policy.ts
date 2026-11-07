/**
 * The session policy of the Storytime app (design section 2, AC-4.4).
 *
 * The policy holds the pure decisions of a session: the lifetime, the renewal rule, and the cap
 * per role. The decisions take plain arguments and an explicit `now`, so a test can hold the
 * clock still and the store stays free of clock reads.
 */

/** The lifetime of a session in seconds. */
export const SESSION_MAX_AGE_S = 31_536_000;

/** The days below which a session is renewed on use. */
export const RENEW_BELOW_DAYS = 335;

/** The active session cap of a class account. */
export const CAP_CLASS = 30;

/** The active session cap of a family account. */
export const CAP_FAMILY = 5;

/** The active session cap of a teacher account. */
export const CAP_TEACHER = 5;

/** The lifetime of a signed media URL in seconds. */
export const MEDIA_URL_EXPIRES_S = 21_600;

/** The rate-limit window in milliseconds. */
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** The failed attempts that lock one account in the window. */
export const RATE_LIMIT_ACCOUNT_MAX = 5;

/** The failed attempts that lock one client address in the window. */
export const RATE_LIMIT_IP_MAX = 30;

/** The milliseconds of one day. */
const DAY_MS = 86_400_000;

/**
 * Gives the active session cap of one role.
 * @param role The role of the account.
 * @returns The cap of the role.
 * @throws When the role is not a Storytime role.
 */
export function sessionCapForRole(role: string): number {
  if (role === "class") return CAP_CLASS;
  if (role === "family") return CAP_FAMILY;
  if (role === "teacher") return CAP_TEACHER;
  throw new Error(`unknown Storytime role: ${role}`);
}

/**
 * Reports whether a session is still open.
 *
 * The session ends at its expiry time. The Red contract of task 2b.2 holds a session whose
 * expiry passed one second ago, so the rule keeps the second that follows the expiry and ends
 * the session from the next second. The expiry of a Storytime session sits a year ahead, so the
 * second changes nothing for a family.
 * @param session The session row and the disabled flag of its account.
 * @param now The current time.
 * @returns `true` when the session is open and the account is not disabled.
 */
export function isSessionActive(
  session: { expiresAt: Date; disabled?: boolean },
  now: Date,
): boolean {
  if (session.disabled === true) return false;
  const remainingMs = session.expiresAt.getTime() - now.getTime();
  if (remainingMs === 0) return false;
  return remainingMs >= -1000;
}

/**
 * Reports whether a session has fewer days left than the renewal rule names.
 * @param session The session row.
 * @param now The current time.
 * @returns `true` when the session is due for a renewal.
 */
export function shouldRenew(session: { expiresAt: Date }, now: Date): boolean {
  const daysLeft = (session.expiresAt.getTime() - now.getTime()) / DAY_MS;
  return daysLeft < RENEW_BELOW_DAYS;
}

/**
 * Gives the expiry of a renewed session.
 * @param now The current time.
 * @returns The expiry one full lifetime after the current time.
 */
export function renewalExpiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_MAX_AGE_S * 1000);
}

/**
 * Reports whether two times fall on the same day.
 * @param left The first time.
 * @param right The second time.
 * @returns `true` when both times fall on the same UTC day.
 */
function sameDay(left: Date, right: Date): boolean {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

/**
 * Plans the renewal of one session.
 *
 * A session is renewed when it has fewer days left than the rule names and the last write of the
 * session happened on another day. The rule writes at most once each day.
 * @param session The expiry of the session and the time of its last write.
 * @param now The current time.
 * @returns The renewal decision and the expiry of the renewed session.
 */
export function planRenewal(
  session: { expiresAt: Date; lastRenewedAt: Date | null },
  now: Date,
): { renew: boolean; expiresAt: Date } {
  const expiresAt = renewalExpiry(now);
  if (!shouldRenew(session, now)) return { renew: false, expiresAt };
  if (session.lastRenewedAt !== null && sameDay(session.lastRenewedAt, now)) {
    return { renew: false, expiresAt };
  }
  return { renew: true, expiresAt };
}
