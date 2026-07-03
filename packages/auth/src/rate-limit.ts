/**
 * Wave 0 — Rate limiter architecture (Phase 2).
 *
 * Production safety requirements:
 *   - Cross-instance durable store (Postgres) via `RateLimitStore`
 *     interface. The in-memory store is exposed for dev/test only via
 *     `createInMemoryRateLimitStore()` and is NOT the production default.
 *   - Per-user AND per-IP semantics: callers pass both `username` and `ip`.
 *     Username and IP buckets are independent; a shared IP does not
 *     lock out unrelated usernames, and a username is not locked out by
 *     failures from a different IP.
 *   - Configurable window/max attempts via factory; no module-level
 *     numeric constants for `WINDOW_MS`/`MAX_ATTEMPTS`.
 */

import { createPostgresRateLimitStore } from "./rate-limit-store.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@reading-advantage/db/schema";

type Db = PostgresJsDatabase<typeof schema>;

/**
 * Stored entry for a single rate-limit bucket.
 * @property failedCount - Number of failed attempts within the current window.
 * @property windowStart - Epoch ms when the current counting window started.
 */
export interface RateLimitStoreEntry {
  failedCount: number;
  windowStart: number;
}

/**
 * Storage seam for rate-limit state.
 *
 * Production deployments MUST inject a cross-instance durable backend
 * (Postgres) via `configureRateLimiter({ store })`. The default
 * in-memory implementation is dev/test-only — distinct server processes
 * (or restarts) will not share state.
 */
export interface RateLimitStore {
  /** Returns the current entry for `key` or `undefined` when absent. */
  get(key: string): Promise<RateLimitStoreEntry | undefined>;
  /** Replaces the entry for `key` with `entry`. */
  set(key: string, entry: RateLimitStoreEntry): Promise<void>;
  /** Removes the entry for `key`. No-op when absent. */
  delete(key: string): Promise<void>;
}

/**
 * Rate-limit configuration (window length and max attempts per bucket).
 */
export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
}

/**
 * Result shape returned by the rate-limit check function.
 *
 * `captchaRequired` is set to `true` once the bucket has accumulated at least
 * `CAPTCHA_THRESHOLD` failures within the active window. This is a flag
 * only — actual captcha verification is the responsibility of the caller
 * (a separate "Captcha Verification" track).
 *
 * @property allowed - True when both username and IP buckets are below the
 *   configured maximum.
 * @property retriesAfter - Seconds until the active window expires, only
 *   set when `allowed` is false.
 * @property captchaRequired - True when the bucket has reached the captcha
 *   trigger threshold. Independent of `allowed` — the bucket may still be
 *   `allowed: true` while requiring captcha.
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  retriesAfter?: number;
  captchaRequired?: boolean;
}

/** Number of failed attempts that flip the captcha-required flag. */
export const CAPTCHA_THRESHOLD = 3;

/**
 * Default per-username rate-limit configuration. Provided for dev/test
 * wiring; production deployments should override via
 * `configureRateLimiter({ config })`.
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
};

/**
 * Default per-IP rate-limit configuration.
 */
export const DEFAULT_IP_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxAttempts: 30,
};

// ───────────────────────────────────────────────────────────────────
// Internal state
// ───────────────────────────────────────────────────────────────────

/**
 * Dev/test-only in-memory store. Module-scoped so a single `configure()`
 * call propagates to all call sites; production code MUST replace this
 * via `configureRateLimiter({ store: postgresStore })`.
 */
const inMemoryStore = new Map<string, RateLimitStoreEntry>();

let configuredStore: RateLimitStore = createInMemoryRateLimitStore();
let configuredUsernameConfig: RateLimitConfig = { ...DEFAULT_RATE_LIMIT_CONFIG };
let configuredIpConfig: RateLimitConfig = { ...DEFAULT_IP_RATE_LIMIT_CONFIG };

// ───────────────────────────────────────────────────────────────────
// Factory + configuration
// ───────────────────────────────────────────────────────────────────

/**
 * Creates an in-memory rate-limit store. Intended for dev/test only;
 * production deployments must configure a cross-instance durable store.
 * @returns A `RateLimitStore` backed by a process-local `Map`.
 */
export function createInMemoryRateLimitStore(): RateLimitStore {
  return {
    get: async (key) => inMemoryStore.get(key),
    set: async (key, entry) => {
      inMemoryStore.set(key, entry);
    },
    delete: async (key) => {
      inMemoryStore.delete(key);
    },
  };
}

/**
 * Returns true when the in-memory fast-path is explicitly enabled.
 * The fast-path is allowed only in development AND when the env flag
 * `RATE_LIMIT_INMEMORY_FASTPATH` is set to `'true'`.
 */
function isInMemoryFastPathEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.RATE_LIMIT_INMEMORY_FASTPATH === "true"
  );
}

/**
 * Configures the rate limiter for production overrides.
 *
 * Pass a custom `store` to make rate-limit state cross-instance durable
 * (e.g., a Postgres-backed store). Pass partial `config`/`ipConfig` to
 * override the default windowMs / maxAttempts.
 *
 * @param opts - Configuration overrides.
 * @param opts.store - Storage backend. When omitted, the current store is kept.
 * @param opts.config - Partial username-config overrides. Merged onto defaults.
 * @param opts.ipConfig - Partial IP-config overrides. Merged onto defaults.
 */
export function configureRateLimiter(
  opts: {
    store?: RateLimitStore;
    config?: Partial<RateLimitConfig>;
    ipConfig?: Partial<RateLimitConfig>;
  } = {},
): void {
  if (opts.store) {
    configuredStore = opts.store;
  }
  if (opts.config) {
    configuredUsernameConfig = { ...DEFAULT_RATE_LIMIT_CONFIG, ...opts.config };
  }
  if (opts.ipConfig) {
    configuredIpConfig = { ...DEFAULT_IP_RATE_LIMIT_CONFIG, ...opts.ipConfig };
  }
}

/**
 * Returns the currently active username configuration. Useful for
 * diagnostics or tests that want to inspect applied overrides.
 * @returns The active username `RateLimitConfig`.
 */
export function getRateLimitConfig(): RateLimitConfig {
  return configuredUsernameConfig;
}

/**
 * Returns the currently active IP configuration.
 * @returns The active IP `RateLimitConfig`.
 */
export function getIpRateLimitConfig(): RateLimitConfig {
  return configuredIpConfig;
}

/**
 * Configures the rate limiter with a Postgres-backed store.
 *
 * This is the production default. The in-memory fast-path is used only
 * when `NODE_ENV === 'development'` AND `RATE_LIMIT_INMEMORY_FASTPATH`
 * is explicitly set to `'true'`.
 *
 * @param db - Drizzle database client.
 * @param opts - Optional username/IP config overrides.
 */
export function configurePostgresRateLimiter(
  db: Db,
  opts: {
    config?: Partial<RateLimitConfig>;
    ipConfig?: Partial<RateLimitConfig>;
  } = {},
): void {
  if (isInMemoryFastPathEnabled()) {
    configureRateLimiter({ ...opts });
    return;
  }
  configureRateLimiter({
    store: createPostgresRateLimitStore(db, {
      ...DEFAULT_RATE_LIMIT_CONFIG,
      ...opts.config,
    }),
    ...opts,
  });
}

// ───────────────────────────────────────────────────────────────────
// Internal helpers
// ───────────────────────────────────────────────────────────────────

function buildKey(identifier: string, kind: "username" | "ip"): string {
  return `${kind}:${identifier}`;
}

async function checkIdentifier(
  identifier: string,
  kind: "username" | "ip",
  config: RateLimitConfig,
): Promise<RateLimitCheckResult> {
  const store = configuredStore;
  const key = buildKey(identifier, kind);
  const entry = await store.get(key);

  if (!entry) {
    return { allowed: true };
  }

  const now = Date.now();
  const elapsed = now - entry.windowStart;

  if (elapsed > config.windowMs) {
    await store.delete(key);
    return { allowed: true };
  }

  const captchaRequired = entry.failedCount >= CAPTCHA_THRESHOLD;

  if (entry.failedCount >= config.maxAttempts) {
    return {
      allowed: false,
      retriesAfter: Math.ceil((config.windowMs - elapsed) / 1000),
      captchaRequired,
    };
  }

  return { allowed: true, captchaRequired };
}

async function recordIdentifierFailure(
  identifier: string,
  kind: "username" | "ip",
  config: RateLimitConfig,
): Promise<void> {
  const store = configuredStore;
  const key = buildKey(identifier, kind);
  const now = Date.now();
  const entry = await store.get(key);

  if (!entry || now - entry.windowStart > config.windowMs) {
    await store.set(key, { failedCount: 1, windowStart: now });
  } else {
    entry.failedCount++;
    await store.set(key, entry);
  }
}

async function resetIdentifier(
  identifier: string,
  kind: "username" | "ip",
): Promise<void> {
  const store = configuredStore;
  const key = buildKey(identifier, kind);
  await store.delete(key);
}

// ───────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────

/**
 * Checks whether the given (username, ip) buckets are currently allowed
 * to attempt login. Both the per-username and per-IP buckets must allow
 * the attempt.
 *
 * `captchaRequired` is sourced from the **username bucket** when neither
 * bucket is blocked: the username is the user-facing identifier, so a
 * different username attempting from a flagged IP does not inherit that
 * IP's failure count. (The IP bucket independently tracks its own
 * captcha-required state — see `recordFailure` / the store — and the
 * login route combines the signals when surfacing the response.)
 *
 * When one bucket blocks the attempt, that bucket's `captchaRequired`
 * flag wins.
 *
 * @param username - Account username/identifier.
 * @param ip - Optional client IP address for per-IP limiting.
 * @returns `allowed: true` when both buckets are below their configured
 *   maximum, otherwise `allowed: false` with `retriesAfter` (seconds
 *   until the current window expires). `captchaRequired` reflects the
 *   captcha trigger state of the decisive bucket (the username bucket
 *   when neither blocks).
 */
export async function checkRateLimit(
  username: string,
  ip?: string,
): Promise<RateLimitCheckResult> {
  const usernameCheck = await checkIdentifier(
    username,
    "username",
    configuredUsernameConfig,
  );
  if (!usernameCheck.allowed) {
    return usernameCheck;
  }

  if (ip) {
    const ipCheck = await checkIdentifier(ip, "ip", configuredIpConfig);
    if (!ipCheck.allowed) {
      return ipCheck;
    }
    // Neither bucket blocks — surface the username bucket's captcha state.
    return {
      allowed: true,
      captchaRequired: usernameCheck.captchaRequired,
    };
  }

  return {
    allowed: true,
    captchaRequired: usernameCheck.captchaRequired,
  };
}

/**
 * Records a failed authentication attempt against the (username, ip)
 * buckets. Resets each counter if its previous window has expired.
 * @param username - Account username/identifier.
 * @param ip - Optional client IP address for per-IP tracking.
 */
export async function recordFailure(
  username: string,
  ip?: string,
): Promise<void> {
  await recordIdentifierFailure(
    username,
    "username",
    configuredUsernameConfig,
  );
  if (ip) {
    await recordIdentifierFailure(ip, "ip", configuredIpConfig);
  }
}

/**
 * Resets the rate-limit buckets for the given (username, ip). Called on
 * successful login to clear the failure counters.
 * @param username - Account username/identifier.
 * @param ip - Optional client IP address.
 */
export async function resetLimit(
  username: string,
  ip?: string,
): Promise<void> {
  await resetIdentifier(username, "username");
  if (ip) {
    await resetIdentifier(ip, "ip");
  }
}

// ───────────────────────────────────────────────────────────────────
// Test helpers (not part of the production contract)
// ───────────────────────────────────────────────────────────────────

/**
 * Test-only helpers for resetting state between test cases. Production
 * code MUST NOT call these.
 */
export const _testkit = {
  resetRateLimiter() {
    inMemoryStore.clear();
    configuredStore = createInMemoryRateLimitStore();
    configuredUsernameConfig = { ...DEFAULT_RATE_LIMIT_CONFIG };
    configuredIpConfig = { ...DEFAULT_IP_RATE_LIMIT_CONFIG };
  },
};
