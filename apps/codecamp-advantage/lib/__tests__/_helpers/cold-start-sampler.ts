/**
 * Cold-start sampler — pure async helper for Phase 1 profiling.
 *
 * Issues exactly `n` HTTP GET requests against a target URL via `globalThis.fetch`,
 * sleeping `gapMs` between successive calls (no leading sleep before the first).
 * Returns per-sample status/elapsedMs and p50/p95/max summary statistics.
 *
 * Uses only stdlib `fetch` and `setTimeout` — no external dependencies.
 *
 * @see measure/tracks/codecamp_infra_cold_start_20260608/test-strategy.md §2
 */

/** A single cold-start probe result. */
export interface ColdStartSample {
  /** HTTP status code returned by the server. */
  status: number;
  /** Wall-clock elapsed time in milliseconds for this request. */
  elapsedMs: number;
}

/** Input parameters for the cold-start sampler. */
export interface ColdStartInput {
  /** The URL to probe (e.g. `https://codecamp.reading-advantage.com/en/`). */
  url: string;
  /** Number of samples to collect. */
  n: number;
  /** Milliseconds to sleep between successive calls. No sleep before the first call. */
  gapMs: number;
}

/** Result summary from a cold-start sampling run. */
export interface ColdStartResult {
  /** Per-sample results (length === `n`). */
  samples: ColdStartSample[];
  /** Median (50th-percentile) elapsed time in ms, picked from the sorted distribution. */
  p50: number;
  /** 95th-percentile elapsed time in ms, picked from the sorted distribution. */
  p95: number;
  /** Maximum elapsed time in ms. */
  max: number;
}

/**
 * Sleep for the given number of milliseconds.
 * @param ms Duration to sleep.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Compute a percentile value from a sorted array using the nearest-rank method
 * (floor-based index selection: `sorted[floor(n * percentile)]`).
 *
 * @param sorted A sorted array of numbers.
 * @param percentile A value between 0 and 1 (e.g. 0.5 for p50, 0.95 for p95).
 * @returns The element at the computed rank.
 */
function percentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    Math.max(Math.floor(sorted.length * percentile), 0),
    sorted.length - 1,
  );
  return sorted[idx]!;
}

/**
 * Collect `n` cold-start samples against `url` and return summary statistics.
 *
 * @param input.url The URL to probe.
 * @param input.n Number of samples to collect.
 * @param input.gapMs Milliseconds to sleep between successive calls (no leading sleep).
 * @returns Per-sample results plus p50/p95/max summary.
 */
export async function sampleColdStart({
  url,
  n,
  gapMs,
}: ColdStartInput): Promise<ColdStartResult> {
  const samples: ColdStartSample[] = [];

  for (let i = 0; i < n; i++) {
    if (i > 0) {
      await sleep(gapMs);
    }

    const start = performance.now();
    const response = await fetch(url, { method: "GET" });
    const elapsedMs = performance.now() - start;

    samples.push({ status: response.status, elapsedMs });
  }

  const sorted = samples
    .map((s) => s.elapsedMs)
    .sort((a, b) => a - b);

  return {
    samples,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted[sorted.length - 1] ?? 0,
  };
}
