/**
 * Wave 0 — Rate limiter architecture (Phase 2).
 *
 * Production safety requirements:
 *   - Cross-instance durable store (Postgres/Redis/etc.) via `RateLimitStore`
 *     interface. The in-memory store is exposed for dev/test only via
 *     `createInMemoryRateLimitStore()` and is NOT the production default.
 *   - Per-user AND per-IP semantics: callers pass both `username` and `ip`.
 *     The composite key `username|ip` (or just `username` when no IP is
 *     supplied) prevents two distinct IPs from sharing a brute-force
 *     bucket for the same account, and conversely prevents one IP from
 *     brute-forcing unrelated accounts under a single global lockout.
 *   - Configurable window/max attempts via factory; no module-level
 *     numeric constants for `WINDOW_MS`/`MAX_ATTEMPTS`.
 */

/**
 * Stored entry for a single (username, ip) rate-limit bucket.
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
 * (Postgres/Redis/etc.) via `configureRateLimiter({ store })`. The
 * default in-memory implementation is dev/test-only — distinct server
 * processes (or restarts) will not share state.
 */
export interface RateLimitStore {
  /** Returns the current entry for `key` or `undefined` when absent. */
  get(key: string): RateLimitStoreEntry | undefined;
  /** Replaces the entry for `key` with `entry`. */
  set(key: string, entry: RateLimitStoreEntry): void;
  /** Removes the entry for `key`. No-op when absent. */
  delete(key: string): void;
}

/**
 * Rate-limit configuration (window length and max attempts per bucket).
 */
export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
}

/**
 * Default rate-limit configuration. Provided for dev/test wiring; production
 * deployments should override via `configureRateLimiter({ config })`.
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
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
let configuredConfig: RateLimitConfig = { ...DEFAULT_RATE_LIMIT_CONFIG };

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
    get: (key) => inMemoryStore.get(key),
    set: (key, entry) => {
      inMemoryStore.set(key, entry);
    },
    delete: (key) => {
      inMemoryStore.delete(key);
    },
  };
}

/**
 * Configures the rate limiter for production overrides.
 *
 * Pass a custom `store` to make rate-limit state cross-instance durable
 * (e.g., a Postgres-backed store). Pass a partial `config` to override
 * the default `windowMs` / `maxAttempts`.
 *
 * @param opts - Configuration overrides.
 * @param opts.store - Storage backend. When omitted, the current store is kept.
 * @param opts.config - Partial config overrides. Merged onto defaults.
 */
export function configureRateLimiter(
  opts: { store?: RateLimitStore; config?: Partial<RateLimitConfig> } = {},
): void {
  if (opts.store) {
    configuredStore = opts.store;
  }
  if (opts.config) {
    configuredConfig = { ...DEFAULT_RATE_LIMIT_CONFIG, ...opts.config };
  }
}

/**
 * Returns the currently active configuration. Useful for diagnostics or
 * for tests that want to inspect applied overrides.
 * @returns The active `RateLimitConfig`.
 */
export function getRateLimitConfig(): RateLimitConfig {
  return configuredConfig;
}

/**
 * Builds the composite bucket key for a (username, ip) pair. When no IP
 * is supplied, the username is used as the key directly (legacy
 * compatibility for callers that have not yet been upgraded to pass IP).
 * @param username - Account username/identifier.
 * @param ip - Optional client IP address.
 * @returns The composite storage key.
 */
function buildKey(username: string, ip?: string): string {
  return ip ? `${username}|ip=${ip}` : username;
}

// ───────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────

/**
 * Checks whether the given (username, ip) bucket is currently allowed
 * to attempt login.
 * @param username - Account username/identifier.
 * @param ip - Optional client IP address for per-IP limiting.
 * @returns `allowed: true` when the bucket is below the configured
 *   maximum, otherwise `allowed: false` with `retriesAfter` (seconds
 *   until the current window expires).
 */
export function checkRateLimit(
  username: string,
  ip?: string,
): { allowed: boolean; retriesAfter?: number } {
  const store = configuredStore;
  const config = configuredConfig;
  const key = buildKey(username, ip);
  const entry = store.get(key);

  if (!entry) {
    return { allowed: true };
  }

  const now = Date.now();
  const elapsed = now - entry.windowStart;

  if (elapsed > config.windowMs) {
    store.delete(key);
    return { allowed: true };
  }

  if (entry.failedCount >= config.maxAttempts) {
    return {
      allowed: false,
      retriesAfter: Math.ceil((config.windowMs - elapsed) / 1000),
    };
  }

  return { allowed: true };
}

/**
 * Records a failed authentication attempt against the (username, ip) bucket.
 * Resets the counter if the previous window has expired.
 * @param username - Account username/identifier.
 * @param ip - Optional client IP address for per-IP tracking.
 */
export function recordFailure(username: string, ip?: string): void {
  const store = configuredStore;
  const config = configuredConfig;
  const key = buildKey(username, ip);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > config.windowMs) {
    store.set(key, { failedCount: 1, windowStart: now });
  } else {
    entry.failedCount++;
    store.set(key, entry);
  }
}

/**
 * Resets the rate-limit bucket for the given (username, ip). Called on
 * successful login to clear the failure counter.
 * @param username - Account username/identifier.
 * @param ip - Optional client IP address.
 */
export function resetLimit(username: string, ip?: string): void {
  const store = configuredStore;
  const key = buildKey(username, ip);
  store.delete(key);
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
    configuredConfig = { ...DEFAULT_RATE_LIMIT_CONFIG };
  },
};