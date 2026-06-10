/**
 * Process-local, TTL-bounded cache for the CodeCamp dashboard query.
 *
 * The CodeCamp dashboard is client-rendered via the `codecamp.dashboard`
 * tRPC procedure — there is no SSR shell to cache, so the latency that
 * matters is the per-request `getUserDashboard` domain call. On a warm
 * instance (deploys run with `min-instances=1`) this memoises that call
 * per tenant+user with a short TTL, bounding both:
 *   - **staleness**: a freshly completed lesson is reflected within
 *     `ttlMs` (default 30s), and
 *   - **memory**: entries are evicted FIFO once `maxEntries` is exceeded.
 *
 * **P0 multi-tenancy guardrail.** The cache key is derived solely from
 * `tenant.schoolId` *and* `user.id` via `buildDashboardCacheKey`. A key
 * that collided across tenants or users would serve one subject's
 * dashboard to another — a P0 cross-tenant leak — so the key is the
 * single source of truth and is never reconstructed ad hoc.
 *
 * Relocated from `apps/codecamp-advantage/lib/cache/` (the original
 * `…DashboardSSR` helper targeted an SSR path this client-rendered app
 * does not have); see the warm-dashboard track's tech-debt entry.
 */

/** Input shape for the tenant+user-scoped cache key. */
export interface DashboardCacheKeyInput {
  tenant: { schoolId: string | null };
  user: { id: string };
  [key: string]: unknown;
}

/**
 * Build a deterministic cache key scoped to a tenant and user.
 *
 * Only `tenant.schoolId` and `user.id` influence the key — extra fields
 * in the input are intentionally ignored so that request-scoped metadata
 * or redeploys do not invalidate the cache.
 *
 * @param input An object containing `tenant.schoolId` and `user.id`.
 * @returns A non-empty, tenant+user-scoped string key.
 */
export function buildDashboardCacheKey(input: DashboardCacheKeyInput): string {
  return `dashboard:${JSON.stringify([input.tenant.schoolId, input.user.id])}`;
}

/** Tuning knobs for {@link getCachedDashboard}. */
export interface DashboardCacheOptions {
  /** Time-to-live for a cached entry, in milliseconds. Default 30_000. */
  ttlMs?: number;
  /** Maximum number of live entries before the oldest are evicted. Default 1000. */
  maxEntries?: number;
}

const DEFAULT_TTL_MS = 30_000;
const DEFAULT_MAX_ENTRIES = 1000;

interface CacheEntry {
  /** The in-flight or settled loader promise (never `undefined`). */
  value: Promise<unknown>;
  /** Epoch-ms after which the entry is treated as a miss. */
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function evictOverflow(maxEntries: number): void {
  while (cache.size > maxEntries) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/**
 * Return the cached dashboard payload for `input`, calling `loader` only
 * on a cache miss (no live entry, or an expired one).
 *
 * Concurrent misses for the same key share a single loader call (the
 * in-flight promise is cached). Rejected loads are never cached, so a
 * transient failure does not poison the key for `ttlMs`. The loader's
 * resolved value — including `undefined` — is cached on success.
 *
 * @param input  Tenant+user-scoped cache-key input.
 * @param loader Produces the dashboard payload on a miss.
 * @param options TTL and size bounds.
 * @returns The cached or freshly loaded payload.
 */
export async function getCachedDashboard<T>(
  input: DashboardCacheKeyInput,
  loader: () => Promise<T>,
  options: DashboardCacheOptions = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const key = buildDashboardCacheKey(input);
  const now = Date.now();

  const existing = cache.get(key);
  if (existing !== undefined) {
    if (existing.expiresAt > now) {
      return existing.value as Promise<T>;
    }
    cache.delete(key); // expired — fall through to refill
  }

  const entry: CacheEntry = {
    expiresAt: now + ttlMs,
    value: loader().catch((error: unknown) => {
      // Only retract our own entry — a newer refill may already own the key.
      if (cache.get(key) === entry) cache.delete(key);
      throw error;
    }),
  };
  cache.set(key, entry);
  evictOverflow(maxEntries);
  return entry.value as Promise<T>;
}

/** Clear all cached entries. Intended for tests and process teardown. */
export function clearDashboardCache(): void {
  cache.clear();
}
