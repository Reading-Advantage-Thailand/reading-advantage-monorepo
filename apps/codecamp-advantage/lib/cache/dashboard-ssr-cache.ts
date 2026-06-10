/**
 * Dashboard SSR cache wiring module.
 *
 * Re-exports `buildDashboardCacheKey` from the Phase 2 helper so the
 * multi-tenancy guardrail is the single source of truth for the cache
 * key (test-strategy.md §3, plan.md §4.3).
 *
 * Exports `getCachedDashboardSSR(input, loader)` which wraps a
 * dashboard SSR loader in a cache keyed by `buildDashboardCacheKey`.
 * The loader is called at most once per unique tenant+user combination;
 * subsequent calls return the cached value.
 *
 * @see measure/tracks/codecamp_perf_warm_dashboard_20260608/test-strategy.md §1, §3, §6
 * @see measure/tracks/codecamp_perf_warm_dashboard_20260608/plan.md §4.3, §6.1
 */

export { buildDashboardCacheKey } from "./dashboard-cache-key";

import { buildDashboardCacheKey } from "./dashboard-cache-key";

interface CacheKeyInput {
  tenant: { schoolId: string };
  user: { id: string };
  [key: string]: unknown;
}

const cache = new Map<string, unknown>();

/**
 * Return cached dashboard SSR data for the given tenant+user, calling
 * the loader on cache miss.
 *
 * @param input An object containing `tenant.schoolId` and `user.id`.
 * @param loader An async function that produces the dashboard SSR payload.
 * @returns The cached or freshly loaded dashboard SSR payload.
 */
export async function getCachedDashboardSSR<T>(
  input: CacheKeyInput,
  loader: () => Promise<T>,
): Promise<T> {
  const key = buildDashboardCacheKey(input);
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached as T;
  }
  const value = await loader();
  cache.set(key, value);
  return value;
}
