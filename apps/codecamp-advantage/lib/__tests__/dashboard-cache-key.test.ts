import { describe, it, expect } from "vitest";
import { buildDashboardCacheKey } from "@/lib/cache/dashboard-cache-key";

/**
 * Phase 2 — Warm-dashboard cache-key builder contract.
 *
 * These are the **multi-tenancy guardrail** unit tests required by
 * `measure/tracks/codecamp_perf_warm_dashboard_20260608/test-strategy.md` §1
 * (Phase 2 bullet) and §3 ("Multi-tenancy correctness under caching: any
 * SSR cache must scope by `tenant.schoolId` *and* `user.id` (or be
 * limited to unauth-only shells). A cache that leaks across tenants is a
 * P0 security regression — assert this in Phase 2 unit tests.").
 *
 * Contract under test (per test-strategy.md §1, §3, §6 and plan.md §4.3):
 *   (a) The key is a non-empty string.
 *   (b) The helper is pure: same `{tenant.schoolId, user.id}` → same key.
 *   (c) The key depends only on `{tenant.schoolId, user.id}` — extra
 *       fields in the input object must not influence the key. This
 *       encodes the "stable across redeploys" guardrail from §6 (the key
 *       is derived from the `dashboardResponseSchema` contract, not from
 *       the function body of `getUserDashboard` or the data it returns).
 *   (d) Different `tenant.schoolId` → different keys (tenant scope).
 *   (e) Different `user.id` → different keys (user scope).
 *
 * Combined, (b)+(c)+(d)+(e) prove the P0 security property: the cache
 * cannot serve a payload computed for tenant A to a request from
 * tenant B, and cannot serve a payload computed for user-1 to user-2.
 *
 * These tests are **contract-only** — they prove the key builder is
 * well-formed but do not prove that the key is actually used by an SSR
 * cache. Live cache-hit / cache-miss proof is owned by Phase 3 prod-smoke
 * (`phase-6-performance-and-latency.test.ts`) and `phase-7-cdn-and-caching.test.ts`.
 *
 * **Red expectation at HEAD:**
 *   The module `@/lib/cache/dashboard-cache-key` does not exist yet
 *   (`build-graph search` returned 0 codecamp-advantage cache helpers on
 *   2026-06-10; the only `buildCacheKey` in the graph lives in
 *   `apps/science-advantage/lib/ai/recommendation-service.ts`, a sibling
 *   app). The import on line 2 will fail with a module-resolution error,
 *   and every test in this file will fail to load. That is the
 *   informative Red: the implementer reads the failure, creates
 *   `apps/codecamp-advantage/lib/cache/dashboard-cache-key.ts` exporting
 *   `buildDashboardCacheKey`, and the contract tests below will then
 *   drive the Green implementation.
 */
const baseInput = {
  tenant: { schoolId: "school-A" },
  user: { id: "user-1" },
} as const;

describe("buildDashboardCacheKey (Phase 2, warm-dashboard perf)", () => {
  it("(a) returns a non-empty string key", () => {
    const key = buildDashboardCacheKey(baseInput);
    expect(typeof key).toBe("string");
    expect(key.length, "cache key must be non-empty so an empty-key collision cannot serve another tenant's payload").toBeGreaterThan(0);
  });

  it("(b) is deterministic: same input yields the same key across calls", () => {
    const keyA = buildDashboardCacheKey(baseInput);
    const keyB = buildDashboardCacheKey(baseInput);
    expect(
      keyA,
      "buildDashboardCacheKey must be pure — same {tenant.schoolId, user.id} must always produce the same key, otherwise the SSR cache misses on every request and the warm budget cannot be met",
    ).toBe(keyB);
  });

  it("(c) depends only on {tenant.schoolId, user.id} — extra fields are ignored", () => {
    const keyMinimal = buildDashboardCacheKey(baseInput);
    const keyWithExtras = buildDashboardCacheKey({
      ...baseInput,
      // Any future field (request id, build SHA, timestamp, etc.) must
      // not influence the key, otherwise redeploys or request-scoped
      // metadata invalidate the cache. This is the §6 "stable across
      // redeploys" guardrail: the key is derived from the schema
      // contract, not from ambient state or the data payload.
      requestId: "req-123",
      buildSha: "abc1234",
      schemaVersion: "should-be-ignored",
    });
    expect(keyWithExtras).toBe(keyMinimal);
  });

  it("(d) scopes by tenant.schoolId (P0 multi-tenancy guardrail)", () => {
    const keyTenantA = buildDashboardCacheKey({
      tenant: { schoolId: "school-A" },
      user: { id: "user-1" },
    });
    const keyTenantB = buildDashboardCacheKey({
      tenant: { schoolId: "school-B" },
      user: { id: "user-1" },
    });
    expect(
      keyTenantA,
      "different tenant.schoolId with the same user.id must produce a different cache key — a key collision here is a P0 cross-tenant data leak (test-strategy.md §3, plan.md §4.3)",
    ).not.toBe(keyTenantB);
  });

  it("(e) scopes by user.id (P0 multi-tenancy guardrail)", () => {
    const keyUser1 = buildDashboardCacheKey({
      tenant: { schoolId: "school-A" },
      user: { id: "user-1" },
    });
    const keyUser2 = buildDashboardCacheKey({
      tenant: { schoolId: "school-A" },
      user: { id: "user-2" },
    });
    expect(
      keyUser1,
      "different user.id within the same tenant must produce a different cache key — a key collision here is a P0 cross-user data leak (test-strategy.md §3, plan.md §4.3)",
    ).not.toBe(keyUser2);
  });
});
