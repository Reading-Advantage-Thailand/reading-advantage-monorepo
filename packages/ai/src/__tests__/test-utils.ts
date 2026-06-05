/**
 * `withEnv(overrides, fn)` helper for AIClient tests that need to mutate
 * `process.env` (selector / singleton / provider-config tests).
 *
 * Behaviour:
 *   1. Snapshot the previous values of every key in `overrides`.
 *   2. Apply the overrides (`undefined` deletes the key).
 *   3. Reset the lazy AIClient singleton (`resetAIClient()`) so the next
 *      `getAIClient()` re-reads env.
 *   4. Run `fn`, then restore every previous env value and reset the
 *      singleton again — even if `fn` throws.
 *
 * Used by:
 *   - Phase 2 mock-provider snapshot test (deterministic seed env)
 *   - Phase 5 env-matrix selector tests (the original consumer per
 *     `test-strategy.md` §2)
 *   - Phase 6/7 service-class regression tests
 *
 * Failure mode this helper prevents: order-dependent flakes when one test
 * leaks `AI_PROVIDER`, `OPENAI_API_KEY`, etc. into the next test.
 */
import { resetAIClient } from "../client.js";

/**
 * Map of environment-variable names to override values. A value of
 * `undefined` *deletes* the variable for the duration of the callback.
 */
export type EnvOverrides = Record<string, string | undefined>;

/**
 * Run `fn` with `process.env` patched by `overrides`. Restores the
 * previous values (and resets the AIClient singleton) on exit.
 *
 * @param overrides - Env var name → new value (`undefined` deletes the var).
 * @param fn - Async callback executed with the patched env.
 * @returns Whatever `fn` returns.
 */
export async function withEnv<T>(
  overrides: EnvOverrides,
  fn: () => Promise<T> | T
): Promise<T> {
  const previous: EnvOverrides = {};

  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  resetAIClient();

  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    resetAIClient();
  }
}
