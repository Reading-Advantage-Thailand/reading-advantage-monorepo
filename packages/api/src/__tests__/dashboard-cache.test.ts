import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildDashboardCacheKey,
  getCachedDashboard,
  clearDashboardCache,
} from "../cache/dashboard-cache.js";

/**
 * Contract for the relocated CodeCamp dashboard query cache
 * (`packages/api/src/cache/dashboard-cache.ts`).
 *
 * Ported from the warm-dashboard track's app-local Phase 2/3 tests when
 * the helper moved from `apps/codecamp-advantage/lib/cache/` to the api
 * layer (the only place the `codecamp.dashboard` tRPC procedure can reach
 * it). The §3 multi-tenancy guardrail (key scoped by `tenant.schoolId`
 * *and* `user.id`) is preserved here; the TTL/eviction tests are new and
 * cover the bounded-memory + bounded-staleness requirement raised in the
 * 36h review.
 */

const baseInput = {
  tenant: { schoolId: "school-A" },
  user: { id: "user-1" },
} as const;

beforeEach(() => {
  clearDashboardCache();
});

describe("buildDashboardCacheKey — multi-tenancy guardrail", () => {
  it("(a) returns a non-empty string key", () => {
    const key = buildDashboardCacheKey(baseInput);
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  it("(b) is deterministic: same input yields the same key", () => {
    expect(buildDashboardCacheKey(baseInput)).toBe(buildDashboardCacheKey(baseInput));
  });

  it("(c) depends only on {tenant.schoolId, user.id} — extra fields ignored", () => {
    expect(
      buildDashboardCacheKey({
        ...baseInput,
        requestId: "req-123",
        buildSha: "abc1234",
      }),
    ).toBe(buildDashboardCacheKey(baseInput));
  });

  it("(d) different tenant.schoolId → different keys (tenant scope)", () => {
    expect(buildDashboardCacheKey(baseInput)).not.toBe(
      buildDashboardCacheKey({ ...baseInput, tenant: { schoolId: "school-B" } }),
    );
  });

  it("(e) different user.id → different keys (user scope)", () => {
    expect(buildDashboardCacheKey(baseInput)).not.toBe(
      buildDashboardCacheKey({ ...baseInput, user: { id: "user-2" } }),
    );
  });

  it("distinguishes a null-school user by user id", () => {
    const nullSchool = { tenant: { schoolId: null }, user: { id: "user-1" } };
    expect(buildDashboardCacheKey(nullSchool)).not.toBe(
      buildDashboardCacheKey({ tenant: { schoolId: null }, user: { id: "user-2" } }),
    );
  });
});

describe("getCachedDashboard", () => {
  it("caches the loader result and serves it without re-loading", async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return { value: "payload" };
    };
    const first = await getCachedDashboard(baseInput, loader);
    const second = await getCachedDashboard(baseInput, loader);
    expect(first).toEqual({ value: "payload" });
    expect(second).toEqual({ value: "payload" });
    expect(calls).toBe(1);
  });

  it("never serves one tenant's payload to another tenant", async () => {
    const a = await getCachedDashboard(baseInput, async () => "A-data");
    const b = await getCachedDashboard(
      { ...baseInput, tenant: { schoolId: "school-B" } },
      async () => "B-data",
    );
    expect(a).toBe("A-data");
    expect(b).toBe("B-data");
  });

  it("deduplicates concurrent same-key misses to a single loader call", async () => {
    let resolveLoader: (value: { value: string }) => void = () => {};
    const loader = vi.fn(
      () => new Promise<{ value: string }>((resolve) => (resolveLoader = resolve)),
    );
    const first = getCachedDashboard(baseInput, loader);
    const second = getCachedDashboard(baseInput, loader);
    expect(loader).toHaveBeenCalledTimes(1);
    resolveLoader({ value: "shared" });
    await expect(Promise.all([first, second])).resolves.toEqual([
      { value: "shared" },
      { value: "shared" },
    ]);
  });

  it("caches undefined payloads without treating them as misses", async () => {
    const loader = vi.fn(async () => undefined);
    await expect(getCachedDashboard(baseInput, loader)).resolves.toBeUndefined();
    await expect(getCachedDashboard(baseInput, loader)).resolves.toBeUndefined();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not cache rejected loads so transient failures can recover", async () => {
    const loader = vi
      .fn<() => Promise<{ value: string }>>()
      .mockRejectedValueOnce(new Error("transient failure"))
      .mockResolvedValueOnce({ value: "recovered" });
    await expect(getCachedDashboard(baseInput, loader)).rejects.toThrow("transient failure");
    await expect(getCachedDashboard(baseInput, loader)).resolves.toEqual({ value: "recovered" });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("re-loads after the TTL expires (bounded staleness)", async () => {
    const loader = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1_000);
    await expect(getCachedDashboard(baseInput, loader, { ttlMs: 100 })).resolves.toBe("v1");
    // Within TTL → cached.
    nowSpy.mockReturnValue(1_050);
    await expect(getCachedDashboard(baseInput, loader, { ttlMs: 100 })).resolves.toBe("v1");
    // Past TTL → reload.
    nowSpy.mockReturnValue(1_200);
    await expect(getCachedDashboard(baseInput, loader, { ttlMs: 100 })).resolves.toBe("v2");
    expect(loader).toHaveBeenCalledTimes(2);
    nowSpy.mockRestore();
  });

  it("evicts oldest entries past maxEntries (bounded memory)", async () => {
    // Fill with maxEntries=2: keys u1, u2, then u3 evicts u1.
    await getCachedDashboard({ tenant: { schoolId: "s" }, user: { id: "u1" } }, async () => "u1", { maxEntries: 2 });
    await getCachedDashboard({ tenant: { schoolId: "s" }, user: { id: "u2" } }, async () => "u2", { maxEntries: 2 });
    await getCachedDashboard({ tenant: { schoolId: "s" }, user: { id: "u3" } }, async () => "u3", { maxEntries: 2 });

    // u1 was evicted → loader runs again (returns fresh value).
    const u1Loader = vi.fn(async () => "u1-reloaded");
    await expect(
      getCachedDashboard({ tenant: { schoolId: "s" }, user: { id: "u1" } }, u1Loader, { maxEntries: 2 }),
    ).resolves.toBe("u1-reloaded");
    expect(u1Loader).toHaveBeenCalledTimes(1);

    // u3 is still live → cached, loader not called.
    const u3Loader = vi.fn(async () => "u3-should-not-run");
    await expect(
      getCachedDashboard({ tenant: { schoolId: "s" }, user: { id: "u3" } }, u3Loader, { maxEntries: 2 }),
    ).resolves.toBe("u3");
    expect(u3Loader).not.toHaveBeenCalled();
  });
});
