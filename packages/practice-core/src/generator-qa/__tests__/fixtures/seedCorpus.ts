// Phase-2 fixture: deterministic seed corpus + a property-style runner.
//
// The contract for a deterministic generator is `(seed) => output`. Phase-2
// property tests iterate over a fixed corpus of seeds (boundary cases
// included) and assert the property holds for *every* seed. Once fast-check
// is approved (per test-strategy.md §1, §2), this module is the one place
// that needs to switch to `fc.assert(fc.property(fc.integer(), …))`; the
// public helpers `SEED_CORPUS` and `forEachSeed` will stay the same.

/**
 * Deterministic seed corpus for property tests.
 *
 * Includes boundary cases called out in test-strategy.md §3:
 *  - `0` — currently bit-shifted to `0` by `seededRandom` (`s | 0`).
 *  - `-1` — bit-pattern `0xFFFFFFFF`, exercises signed-int coercion.
 *  - `2 ** 31 - 1` (max signed 32-bit int) — exercises PRNG upper bound.
 *  - `2 ** 31` — overflows to a negative value via `s | 0`.
 * Plus a few "ordinary" seeds from the test-strategy example.
 */
export const SEED_CORPUS: readonly number[] = Object.freeze([
  0,
  -1,
  1,
  7,
  42,
  99,
  1337,
  2 ** 31 - 1,
  2 ** 31,
]);

/**
 * Convenience: number of seeds to use for property runs in CI.
 *
 * test-strategy.md §2 caps property runs at ~50 seeds for CI speed; the
 * full SEED_CORPUS is small but tests that want a bounded cap can pass
 * this directly to `verifyGenerator({ numSeeds: DEFAULT_NUM_SEEDS })`.
 */
export const DEFAULT_NUM_SEEDS: number = SEED_CORPUS.length;

export interface SeedIterationContext {
  readonly seed: number;
  readonly index: number;
}

/**
 * Run `fn` for every seed in `SEED_CORPUS`, in order. Throws the first
 * assertion failure so property tests get a single readable stack.
 *
 * Mirrors the shape of a fast-check `fc.property(fc.integer(), …)` call
 * without requiring the fast-check dependency yet.
 */
export function forEachSeed(fn: (ctx: SeedIterationContext) => void): void {
  for (let i = 0; i < SEED_CORPUS.length; i++) {
    const seed = SEED_CORPUS[i] as number;
    fn({ seed, index: i });
  }
}
