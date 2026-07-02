/**
 * Wave 2 Phase 3 — Live-smoke opt-in guard helper.
 *
 * Centralises the opt-in pattern so every prod-smoke phase-* file gates
 * behind `RUN_LIVE_SMOKE=true` and resolves the live URL strictly from
 * the requested env var (NO production default). This is the single
 * source of truth shared by all 14 prod-smoke phase suites and the
 * non-suite data fixture.
 *
 * Contract:
 *   - `RUN_LIVE_SMOKE` is true only when `process.env.RUN_LIVE_SMOKE === "true"`.
 *   - `resolveLiveSmokeUrl(envVarName)` returns the env value only when
 *     `RUN_LIVE_SMOKE` is true AND the env var is a non-empty string.
 *     Otherwise it returns `undefined` so callers must skip before
 *     using it.
 *   - `liveSmokeSkip` is a vitest `it` substitute that skips when the
 *     live smoke gate is closed. Use it in place of bare `it` inside
 *     prod-smoke suites so a missing `RUN_LIVE_SMOKE=true` cannot
 *     accidentally hit production.
 *
 * The opt-in guard at `lib/__tests__/prod-smoke/wave2-live-smoke-opt-in.test.ts`
 * requires the literal `RUN_LIVE_SMOKE` token to appear in every
 * prod-smoke file, so the import below is not just a module-load — the
 * symbol is referenced from each consumer.
 */

export const RUN_LIVE_SMOKE: boolean = process.env.RUN_LIVE_SMOKE === "true";

/**
 * Returns the live URL from `process.env[envVarName]` only when
 * `RUN_LIVE_SMOKE=true`. Returns `undefined` otherwise so callers must
 * explicitly opt in. There is intentionally no production default —
 * if a runner sets `RUN_LIVE_SMOKE=true` but forgets to provide a URL,
 * the resolver returns `undefined` and tests must fail or skip.
 */
export function resolveLiveSmokeUrl(envVarName: string): string | undefined {
  if (!RUN_LIVE_SMOKE) return undefined;
  const value = process.env[envVarName];
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value;
}

/**
 * Vitest `it` substitute that automatically skips when the live smoke
 * gate is closed. Use in place of bare `it` inside prod-smoke suites:
 *
 *   import { liveSmokeSkip } from "./_helpers/live-smoke-guard";
 *   liveSmokeSkip("production URL is reachable", async () => { ... });
 *
 * `liveSmokeSkip` is a function so vitest's `it.skipIf` style API is
 * preserved for suites that already use that pattern.
 */
export const liveSmokeSkip: (
  name: string,
  fn: () => unknown | Promise<unknown>,
  timeout?: number,
) => void = RUN_LIVE_SMOKE ? it : it.skip;