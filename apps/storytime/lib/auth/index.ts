import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyPassword } from "@reading-advantage/auth/password";
import { consumeRateLimit } from "@reading-advantage/auth/rate-limit";
import {
  SESSION_COOKIE_NAME,
  createSessionCookie,
  newSessionToken,
  sessionTokenDigest,
} from "./cookie";
import {
  RATE_LIMIT_ACCOUNT_MAX,
  RATE_LIMIT_IP_MAX,
  RATE_LIMIT_WINDOW_MS,
  SESSION_MAX_AGE_S,
  isSessionActive,
  planRenewal,
  sessionCapForRole,
} from "./session-policy";
import { getStore } from "./store";

/**
 * The auth adapter of the Storytime app (AGENTS.md auth-adapter shape, design section 5a).
 *
 * The adapter is the only way into the login from the app. It wraps the store of
 * `@reading-advantage/backend/storytime-access`, holds no SQL, and imports no database driver.
 * The role of an account comes from the store at request time, so a change of the role in the
 * database holds on the next request.
 */

/** The locales the app serves. */
export const LOCALES = ["th", "en"] as const;

/** The role of one Storytime account. */
export type StorytimeRole = "family" | "class" | "teacher";

/** The signed-in Storytime user. */
export interface StorytimeUser {
  /** The id of the account. */
  id: string;
  /** The username of the account. */
  username: string;
  /** The role of the account. */
  role: StorytimeRole;
}

/** The reason of a failed sign-in. */
export type SignInFailure = "bad_password" | "unknown_user" | "disabled" | "rate_limited";

/** The outcome of one sign-in. */
export type SignInOutcome =
  | { status: "signed_in"; cookie: string }
  | { status: "invalid"; reason: SignInFailure }
  | { status: "locked"; reason: SignInFailure };

/** The fields of the sign-in form. */
export const signInFieldsSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(64),
  password: z.string().min(1).max(1024),
});

/** The locale of a request, with the default locale of the app. */
export const localeSchema = z.enum(LOCALES).catch("th");

/**
 * The hash of a password that no account holds.
 *
 * An unknown username is verified against this hash, so the answer of the server takes the same
 * time for a known and an unknown username.
 */
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$spnrhMFmDYEXEl0r7A/DMA$s7hqbNXUDg+TxUX2jI50YHkrMWoWA6NvG2oLdGa06zQ";

/**
 * Builds the sign-in path of a return path.
 * @param returnPath The path the visitor came from.
 * @returns The locale sign-in path with the return path in `next`.
 */
function signInPath(returnPath: string): string {
  const first = returnPath.split("/")[1] ?? "";
  const locale = (LOCALES as readonly string[]).includes(first) ? first : LOCALES[0];
  return `/${locale}/sign-in?next=${encodeURIComponent(returnPath)}`;
}

/**
 * Reports whether a user may open a path.
 * @param user The signed-in user.
 * @param path The path of the page.
 * @returns `true` when the role of the user may open the path.
 */
export function mayOpenPath(user: StorytimeUser, path: string): boolean {
  if (/^\/(th|en)\/teacher\//.test(path)) return user.role === "teacher";
  return true;
}

/**
 * Reads the signed-in user of the request.
 *
 * The session cookie holds a token; the store holds its digest. A session of a disabled account
 * and a session that reached its expiry are no session. A session with fewer days left than the
 * renewal rule names is renewed on use, at most once each day.
 * @returns The user, or `null` when the request holds no open session.
 */
export async function getCurrentUser(): Promise<StorytimeUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const store = getStore();
  const session = await store.findSessionByDigest(sessionTokenDigest(token));
  if (!session) return null;
  const account = await store.findAccountById(session.accountId);
  if (!account) return null;
  const now = new Date();
  if (!isSessionActive({ expiresAt: session.expiresAt, disabled: account.disabled }, now)) {
    return null;
  }
  const plan = planRenewal(
    { expiresAt: session.expiresAt, lastRenewedAt: session.lastUseAt },
    now,
  );
  if (plan.renew) await store.renewSession(session.tokenDigest, plan.expiresAt, now);
  return { id: account.id, username: account.username, role: account.role };
}

/**
 * Reads the signed-in user and sends a visitor without a session to the sign-in page.
 * @param returnPath The path the visitor came from.
 * @returns The signed-in user.
 */
export async function requireUser(returnPath: string): Promise<StorytimeUser> {
  const user = await getCurrentUser();
  if (!user) redirect(signInPath(returnPath));
  return user;
}

/**
 * Reads the signed-in user and checks the role of the account.
 * @param role The role the route needs.
 * @param returnPath The path the visitor came from.
 * @returns The user when the role matches, or `null` when the role does not match.
 */
export async function requireRole(
  role: StorytimeRole,
  returnPath: string,
): Promise<StorytimeUser | null> {
  const user = await getCurrentUser();
  if (!user) redirect(signInPath(returnPath));
  return user.role === role ? user : null;
}

/**
 * Signs one account in.
 *
 * The handler calls this after the same-origin check. The rate limit holds the account and the
 * client address, the Argon2id hash decides the answer, and a good answer creates the session
 * and writes the audit event. The audit rows and the log line hold no password and no token.
 * @param input The username, the password, the client address, and the current time.
 * @returns The outcome of the sign-in.
 */
export async function login(input: {
  username: string;
  password: string;
  ip: string;
  now: Date;
}): Promise<SignInOutcome> {
  const store = getStore();
  const accountLimit = await consumeRateLimit(store.rateLimitStore, `account:${input.username}`, {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxAttempts: RATE_LIMIT_ACCOUNT_MAX,
  });
  const ipLimit = await consumeRateLimit(store.rateLimitStore, `ip:${input.ip}`, {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxAttempts: RATE_LIMIT_IP_MAX,
  });
  if (!accountLimit.allowed || !ipLimit.allowed) {
    await store.insertAuditEvent({
      action: "sign_in_failure",
      username: input.username,
      reason: "rate_limited",
      ip: input.ip,
      now: input.now,
    });
    console.warn(
      `storytime sign-in locked: username=${input.username} ip=${input.ip} limit=${
        accountLimit.allowed ? "ip" : "account"
      }`,
    );
    return { status: "locked", reason: "rate_limited" };
  }

  const account = await store.findAccountByUsername(input.username);
  const hash = account?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordMatches = await verifyPassword(input.password, hash);
  if (!account) {
    await store.insertAuditEvent({
      action: "sign_in_failure",
      username: input.username,
      reason: "unknown_user",
      ip: input.ip,
      now: input.now,
    });
    console.warn(`storytime sign-in failed: username=${input.username} reason=unknown_user`);
    return { status: "invalid", reason: "unknown_user" };
  }
  if (!passwordMatches) {
    await store.insertAuditEvent({
      action: "sign_in_failure",
      accountId: account.id,
      username: account.username,
      reason: "bad_password",
      ip: input.ip,
      now: input.now,
    });
    console.warn(`storytime sign-in failed: username=${account.username} reason=bad_password`);
    return { status: "invalid", reason: "bad_password" };
  }
  if (account.disabled) {
    await store.insertAuditEvent({
      action: "sign_in_failure",
      accountId: account.id,
      username: account.username,
      reason: "disabled",
      ip: input.ip,
      now: input.now,
    });
    console.warn(`storytime sign-in failed: username=${account.username} reason=disabled`);
    return { status: "invalid", reason: "disabled" };
  }

  const token = newSessionToken();
  const expiresAt = new Date(input.now.getTime() + SESSION_MAX_AGE_S * 1000);
  await store.createSessionWithCap({
    accountId: account.id,
    tokenDigest: sessionTokenDigest(token),
    now: input.now,
    expiresAt,
    cap: sessionCapForRole(account.role),
  });
  await store.insertAuditEvent({
    action: "sign_in_success",
    accountId: account.id,
    username: account.username,
    ip: input.ip,
    now: input.now,
  });
  console.warn(`storytime sign-in succeeded: username=${account.username} role=${account.role}`);
  return { status: "signed_in", cookie: createSessionCookie(token) };
}

/**
 * Ends the session of one device.
 * @param token The raw token of the session cookie.
 */
export async function logout(token: string): Promise<void> {
  if (!token) return;
  await getStore().deleteSessionByDigest(sessionTokenDigest(token));
}
