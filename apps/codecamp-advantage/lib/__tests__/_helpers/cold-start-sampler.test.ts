import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sampleColdStart } from "../_helpers/cold-start-sampler";

/**
 * Phase 1 — Cold-start sampler (unit tests, no network).
 *
 * These tests are the **Red** gate for the `sampleColdStart` helper described
 * in `measure/tracks/codecamp_infra_cold_start_20260608/test-strategy.md` §2.
 *
 * Contract under test:
 *   sampleColdStart({ url, n, gapMs }) → { samples, p50, p95, max }
 *     - issues exactly `n` HTTP GETs against `url` via `globalThis.fetch`,
 *     - sleeps `gapMs` between calls (no leading sleep before the first),
 *     - records each call's HTTP status and elapsed wall-clock time,
 *     - summarises the elapsed distribution as p50 / p95 / max (ms).
 *
 * The helper must use only stdlib `fetch` and `setTimeout` (no extra deps).
 * Tests inject responses through `vi.stubGlobal("fetch", ...)` and assert on
 * the return shape — they never touch prod. The live prod sampling that emits
 * the `cold-start-baseline.json` artifact is a separate run owned by the
 * Green / closeout phase, gated behind a forced scale-to-zero (test-strategy
 * §3).
 *
 * The persistent live Red gate for this track is the existing
 * `lib/__tests__/prod-smoke/phase-1-infrastructure.test.ts` "cold start time
 * is within budget" sub-check (line 130). It stays Red until Phase 3 closeout
 * and is intentionally NOT touched here.
 */

describe("sampleColdStart (Phase 1 cold-start baseline helper)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns exactly n samples", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const result = await sampleColdStart({ url: "https://codecamp.example/", n: 5, gapMs: 0 });
    expect(result.samples).toHaveLength(5);
  });

  it("calls the provided URL once per sample (no extra traffic)", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await sampleColdStart({ url: "https://codecamp.example/en/", n: 3, gapMs: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const call of fetchMock.mock.calls) {
      expect(call[0]).toBe("https://codecamp.example/en/");
    }
  });

  it("records the HTTP status returned for each sample in order", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const result = await sampleColdStart({ url: "https://codecamp.example/", n: 5, gapMs: 0 });
    expect(result.samples.map((s) => s.status)).toEqual([200, 502, 200, 503, 200]);
  });

  it("records a finite, non-negative elapsedMs for every sample", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const result = await sampleColdStart({ url: "https://codecamp.example/", n: 4, gapMs: 0 });
    for (const sample of result.samples) {
      expect(typeof sample.elapsedMs).toBe("number");
      expect(Number.isFinite(sample.elapsedMs)).toBe(true);
      expect(sample.elapsedMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("exposes p50, p95, and max as finite numbers in the summary", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const result = await sampleColdStart({ url: "https://codecamp.example/", n: 5, gapMs: 0 });
    expect(typeof result.p50).toBe("number");
    expect(typeof result.p95).toBe("number");
    expect(typeof result.max).toBe("number");
    expect(Number.isFinite(result.p50)).toBe(true);
    expect(Number.isFinite(result.p95)).toBe(true);
    expect(Number.isFinite(result.max)).toBe(true);
  });

  it("computes p50, p95, and max against the sorted elapsedMs distribution", async () => {
    const elapsedSequence = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    let i = 0;
    fetchMock.mockImplementation(async () => {
      const target = elapsedSequence[i++] ?? 0;
      await new Promise((r) => setTimeout(r, target));
      return new Response(null, { status: 200 });
    });
    const result = await sampleColdStart({ url: "https://codecamp.example/", n: 10, gapMs: 0 });
    const sorted = [...result.samples.map((s) => s.elapsedMs)].sort((a, b) => a - b);
    expect(result.max).toBe(sorted[sorted.length - 1] ?? 0);
    // p50/p95 index selection follows the test-strategy contract (floor of
    // n * percentile). Tolerate ±1 jitter from the small setTimeout rounding
    // we exercise in the mock; the helper just has to pick from the sorted
    // distribution.
    expect(sorted).toContain(result.p50);
    expect(sorted).toContain(result.p95);
    expect(result.p50).toBeLessThanOrEqual(result.p95);
    expect(result.p95).toBeLessThanOrEqual(result.max);
  });

  it("respects gapMs between successive calls (no leading sleep before the first)", async () => {
    const gap = 30;
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const callTimestamps: number[] = [];
    fetchMock.mockImplementation(async () => {
      callTimestamps.push(Date.now());
      return new Response(null, { status: 200 });
    });
    await sampleColdStart({ url: "https://codecamp.example/", n: 3, gapMs: gap });
    expect(callTimestamps).toHaveLength(3);
    const gap0to1 = callTimestamps[1]! - callTimestamps[0]!;
    const gap1to2 = callTimestamps[2]! - callTimestamps[1]!;
    // Allow 5ms of scheduler slack below the requested gap; we only assert
    // the helper does not collapse the sleeps.
    expect(gap0to1).toBeGreaterThanOrEqual(gap - 5);
    expect(gap1to2).toBeGreaterThanOrEqual(gap - 5);
  });

  it("makes exactly one HTTP call when n=1 and does not sleep", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const start = Date.now();
    await sampleColdStart({ url: "https://codecamp.example/", n: 1, gapMs: 1_000 });
    const elapsed = Date.now() - start;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // A 1000ms gap before a single sample would be a clear bug.
    expect(elapsed).toBeLessThan(1_000);
  });
});
