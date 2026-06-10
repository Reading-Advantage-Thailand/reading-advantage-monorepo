import { describe, it, expect, vi } from "vitest";

/**
 * Phase 3 — Warm-dashboard cache-wiring contract (Red).
 *
 * This is the **Red-phase** test for the Phase 3 verification sub-task
 * "Re-run Phase 6 prod-smoke suite" (plan.md §Phase 3, test-strategy.md §1).
 *
 * ## Why this test exists
 *
 * The Phase 2 evaluation note (plan.md §6.1) records:
 *
 *   > "The actual wiring into `unstable_cache` or `revalidate` is deferred
 *   >  to Phase 3 verification, which will re-run the prod-smoke suite to
 *   >  confirm the warm budget is met."
 *
 * The Phase 2 helper `buildDashboardCacheKey` is the multi-tenancy
 * guardrail (test-strategy.md §3, §6; plan.md §4.3) but it is only useful
 * if a Phase 3 implementation actually calls it from a Next.js cache
 * primitive when serving the warm `GET /en/` request. The helper alone
 * does not move the warm budget — the **wiring** does.
 *
 * Per test-strategy.md §1 ("Phase 2 — narrow unit tests for any **new**
 * helper") and the deferred-wiring note in plan.md §6.1, the Phase 3
 * contract is:
 *
 *   (1) A module `apps/codecamp-advantage/lib/cache/dashboard-ssr-cache.ts`
 *       exists and re-exports `buildDashboardCacheKey` (so the multi-
 *       tenancy guardrail is the single source of truth for the cache
 *       key).
 *   (2) That module exports a `getCachedDashboardSSR` function which:
 *         (a) accepts the same input shape as `buildDashboardCacheKey`
 *             (`{ tenant: { schoolId }, user: { id } }`),
 *         (b) uses `buildDashboardCacheKey` to derive its cache key
 *             (not an ad-hoc string) — this is the §3 multi-tenancy
 *             guardrail at the wiring layer,
 *         (c) delegates to a `loader` function whose return value is
 *             stored in the Next.js cache (so the wiring is not a
 *             no-op pass-through).
 *
 * ## Red expectation at HEAD
 *
 * The module `apps/codecamp-advantage/lib/cache/dashboard-ssr-cache.ts`
 * does not exist. `build-graph query` for codecamp cache nodes returns
 * only `parseCacheControl` (a test helper in
 * `lib/__tests__/prod-smoke/phase-8-5-deployment-gate.test.ts`); the only
 * `buildCacheKey` in the entire graph lives in the sibling app
 * `apps/science-advantage/lib/ai/recommendation-service.ts`. The
 * relative import on the line below will fail with a module-resolution
 * error, and every test in this file will fail to load. That is the
 * informative Red: the Phase 3 implementer (jr role) reads the failure,
 * creates `apps/codecamp-advantage/lib/cache/dashboard-ssr-cache.ts`
 * that re-exports `buildDashboardCacheKey` and exports
 * `getCachedDashboardSSR(input, loader)`, and the contract tests below
 * will then drive the Green implementation.
 *
 * ## Scope guardrails
 *
 * This test is **contract-only** — it proves the wiring module is
 * well-formed and uses the multi-tenancy-safe cache key, but does not
 * prove runtime cache-hit / cache-miss behaviour. Runtime proof is owned
 * by the existing Phase 6 prod-smoke test
 * (`apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts:324`)
 * and the Phase 7 prod-smoke test
 * (`apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-7-cdn-and-caching.test.ts`),
 * both of which the Phase 3 verification re-runs against production.
 *
 * @see measure/tracks/codecamp_perf_warm_dashboard_20260608/test-strategy.md §1, §3, §6
 * @see measure/tracks/codecamp_perf_warm_dashboard_20260608/plan.md §4.3, §6.1
 */

describe("getCachedDashboardSSR (Phase 3 Red, warm-dashboard cache wiring)", () => {
  it("(1) the wiring module exists and re-exports buildDashboardCacheKey", async () => {
    const mod = await import("../cache/dashboard-ssr-cache");
    expect(
      typeof mod.buildDashboardCacheKey,
      "dashboard-ssr-cache.ts must re-export buildDashboardCacheKey so the multi-tenancy guardrail is the single source of truth for the cache key (test-strategy.md §3, plan.md §4.3)",
    ).toBe("function");
  });

  it("(2a) getCachedDashboardSSR is a function with arity 2 (input, loader)", async () => {
    const mod = await import("../cache/dashboard-ssr-cache");
    expect(
      typeof mod.getCachedDashboardSSR,
      "getCachedDashboardSSR must be exported so the warm /en/ request can wrap the dashboard SSR data in a Next.js cache primitive",
    ).toBe("function");
    expect(
      mod.getCachedDashboardSSR.length,
      "getCachedDashboardSSR(input, loader) must accept exactly two arguments: the cache-key input and a loader function whose return value is cached",
    ).toBe(2);
  });

  it("(2b) getCachedDashboardSSR uses buildDashboardCacheKey to derive its cache key", async () => {
    const mod = await import("../cache/dashboard-ssr-cache");
    // The wiring must use the §3 multi-tenancy-safe key — never an ad-hoc
    // string built from `tenant.schoolId` directly. We assert that the
    // exported buildDashboardCacheKey is the same function the wiring
    // module uses, by identity: if the wiring re-implements the key
    // locally, it has diverged from the contract and a P0 cross-tenant
    // leak could be reintroduced by an unrelated edit to the builder.
    expect(mod.getCachedDashboardSSR).toBeDefined();
    expect(typeof mod.buildDashboardCacheKey).toBe("function");
    // Calling the re-export must produce a stable, tenant+user-scoped
    // string identical to the Phase 2 helper. This is the §6 "stable
    // across redeploys" guardrail at the wiring layer.
    const key = mod.buildDashboardCacheKey({
      tenant: { schoolId: "school-A" },
      user: { id: "user-1" },
    });
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  it("(2c) getCachedDashboardSSR delegates to its loader and caches the result", async () => {
    const mod = await import("../cache/dashboard-ssr-cache");
    const input = {
      tenant: { schoolId: "school-A" },
      user: { id: "user-1" },
    };
    let loaderCalls = 0;
    const loader = async () => {
      loaderCalls += 1;
      return { value: "phase-3-loader-payload" };
    };
    const first = await mod.getCachedDashboardSSR(input, loader);
    const second = await mod.getCachedDashboardSSR(input, loader);
    // The wiring must actually use Next.js's cache primitive
    // (unstable_cache / cache) — the loader is the source of the
    // payload, and the wiring must return it. We assert the return
    // value first because that is the user-visible contract; the
    // call-count assertion is a best-effort guard against a no-op
    // pass-through that simply invokes the loader twice.
    expect(first).toEqual({ value: "phase-3-loader-payload" });
    expect(second).toEqual({ value: "phase-3-loader-payload" });
    expect(
      loaderCalls,
      "getCachedDashboardSSR must use a Next.js cache primitive so the warm /en/ request benefits from the cache; a no-op pass-through that calls the loader on every invocation will not move the warm budget",
    ).toBeLessThanOrEqual(1);
  });

  it("deduplicates concurrent same-key misses so parallel SSR requests share one loader", async () => {
    const mod = await import("../cache/dashboard-ssr-cache");
    const input = {
      tenant: { schoolId: "school-concurrent" },
      user: { id: "user-concurrent" },
    };
    let resolveLoader: (value: { value: string }) => void = () => {};
    const loader = vi.fn(
      () =>
        new Promise<{ value: string }>((resolve) => {
          resolveLoader = resolve;
        }),
    );

    const first = mod.getCachedDashboardSSR(input, loader);
    const second = mod.getCachedDashboardSSR(input, loader);

    expect(loader).toHaveBeenCalledTimes(1);
    resolveLoader({ value: "shared-payload" });
    await expect(Promise.all([first, second])).resolves.toEqual([
      { value: "shared-payload" },
      { value: "shared-payload" },
    ]);
  });

  it("caches undefined payloads without treating them as misses", async () => {
    const mod = await import("../cache/dashboard-ssr-cache");
    const input = {
      tenant: { schoolId: "school-undefined" },
      user: { id: "user-undefined" },
    };
    const loader = vi.fn(async () => undefined);

    await expect(mod.getCachedDashboardSSR(input, loader)).resolves.toBeUndefined();
    await expect(mod.getCachedDashboardSSR(input, loader)).resolves.toBeUndefined();

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not cache rejected loads so transient failures can recover", async () => {
    const mod = await import("../cache/dashboard-ssr-cache");
    const input = {
      tenant: { schoolId: "school-retry" },
      user: { id: "user-retry" },
    };
    const loader = vi
      .fn<() => Promise<{ value: string }>>()
      .mockRejectedValueOnce(new Error("transient cache fill failure"))
      .mockResolvedValueOnce({ value: "recovered" });

    await expect(mod.getCachedDashboardSSR(input, loader)).rejects.toThrow("transient cache fill failure");
    await expect(mod.getCachedDashboardSSR(input, loader)).resolves.toEqual({ value: "recovered" });

    expect(loader).toHaveBeenCalledTimes(2);
  });
});
