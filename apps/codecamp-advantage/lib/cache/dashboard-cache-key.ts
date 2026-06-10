/**
 * Dashboard SSR cache-key builder.
 *
 * Produces a deterministic, tenant+user-scoped cache key for the warm
 * dashboard SSR shell. The key is derived solely from `tenant.schoolId`
 * and `user.id` — extra fields in the input object are intentionally
 * ignored so that redeploys or request-scoped metadata do not
 * invalidate the cache (test-strategy §6 "stable across redeploys").
 *
 * **P0 multi-tenancy guardrail:** the key must never collide across
 * tenants or users. A cache that serves a payload computed for tenant A
 * to a request from tenant B is a P0 security regression
 * (test-strategy §3, plan.md §4.3).
 *
 * @see measure/tracks/codecamp_perf_warm_dashboard_20260608/test-strategy.md §1, §3, §6
 * @see measure/tracks/codecamp_perf_warm_dashboard_20260608/plan.md §4.3
 */

interface DashboardCacheKeyInput {
  tenant: { schoolId: string };
  user: { id: string };
  [key: string]: unknown;
}

/**
 * Build a deterministic cache key scoped to a tenant and user.
 *
 * @param input An object containing `tenant.schoolId` and `user.id`.
 * @returns A non-empty string cache key.
 */
export function buildDashboardCacheKey(input: DashboardCacheKeyInput): string {
  return `dashboard:${input.tenant.schoolId}:${input.user.id}`;
}
