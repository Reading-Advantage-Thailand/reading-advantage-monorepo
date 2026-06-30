/**
 * Phase 7 contract test for FR-7 (ESLint `no-console` rule).
 *
 * Pinned shape from `measure/tracks/observability_stack_20260603/spec.md`
 * FR-7 (Phase 7):
 *   - `apps/science-advantage/eslint.config.mjs` adds
 *     `no-console: ['error', { allow: ['error', 'warn'] }]`.
 *   - `lib/observability/logger.ts` is the only `console.*` sink
 *     permitted (excluded via the logger-sink exclusion; FR-4 calls
 *     `console.error` / `console.warn` / `console.info` from the
 *     single `emit()` function).
 *   - Test files and `__tests__/` are excluded from the rule
 *     (legacy migration in Phase 8 sweeps the remaining 42 sites).
 *
 * Strategy reference: `measure/tracks/observability_stack_20260603/test-strategy.md`
 *   - §2 (Testing Pyramid) classifies Phase 7 as
 *     "lint exit 0 + targeted lint exit ≠ 0 demo".
 *   - §6 (Phase 7 notes): "Pin two micro-fixtures under
 *     `apps/science-advantage/lib/observability/__tests__/fixtures/eslint/`:
 *     `bad.ts` containing `console.log('x')` and `good.ts` using
 *     `logger.info`. Test runs `pnpm exec eslint <fixture>` and
 *     asserts exit codes (≠0 for bad, 0 for good). This is the
 *     command-construction proof for the lint gate."
 *   - §7 (Live-Proof Plan) designates the targeted Red command for Phase 7:
 *       `pnpm --filter science-advantage exec vitest run
 *        lib/observability/__tests__/eslint-no-console.test.ts`
 *   - §8 (Intentionally-Red Test Files): "The Phase 7 eslint fixture
 *     files ... are **excluded from app linting** via
 *     `eslint.config.mjs`
 *     `ignores: ['lib/observability/__tests__/fixtures/eslint/**']` —
 *     they are test inputs, not production code, and including them
 *     in the global lint would create a permanent red."
 *
 * Test design notes:
 *   - The test spawns the real `eslint` binary (`node_modules/eslint/bin/eslint.js`)
 *     via `process.execPath` (which is `bun` on the MID host and
 *     `node` in CI) with `--no-ignore` so the fixture files are
 *     linted despite the `lib/observability/__tests__/fixtures/eslint/**`
 *     ignore entry that the Green role will add to keep the global
 *     `pnpm lint` clean. Without `--no-ignore`, the test would pass
 *     trivially (eslint skips ignored files and exits 0) at Green,
 *     which would mask a broken rule.
 *   - `cwd` is pinned to the `apps/science-advantage` directory so
 *     the flat config auto-discovery finds
 *     `apps/science-advantage/eslint.config.mjs`.
 *   - The test invokes eslint on the two fixture files only, never
 *     on the full app source tree — per strategy §7 the test must
 *     "never invoke full `pnpm lint` so it cannot mask other lint
 *     failures".
 *   - The rule lives in the project config (not in a `--rule` flag
 *     on the test command line), so the test is a true
 *     command-construction proof: it exercises the same binary +
 *     config the developer would run by hand.
 *
 * Intentionally red at MID handoff: the project config at HEAD has
 * no `no-console` rule, so `eslint --no-ignore <bad.ts>` exits 0
 * and the test fails with `expected 0 to be non-zero` (or
 * `expected exit code to not be 0, got 0` with the helper-wrapped
 * variant below). Green is the same command exiting 0 once the
 * `no-console: ['error', { allow: ['error', 'warn'] }]` rule and
 * the `lib/observability/__tests__/fixtures/eslint/**` ignore
 * entry land in `apps/science-advantage/eslint.config.mjs`.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const APP_ROOT = resolve(__dirname, '../../..');
// Resolve eslint wherever the package manager placed it (pnpm's hoisted
// linker keeps a single eslint at the workspace root, not in the app's
// node_modules), rather than assuming an app-local install path.
const ESLINT_BIN = resolve(dirname(require.resolve('eslint/package.json')), 'bin/eslint.js');
const BAD_FIXTURE = resolve(APP_ROOT, 'lib/observability/__tests__/fixtures/eslint/bad.ts');
const GOOD_FIXTURE = resolve(APP_ROOT, 'lib/observability/__tests__/fixtures/eslint/good.ts');

interface EslintRunResult {
  status: number;
  stdout: string;
  stderr: string;
}

/**
 * Spawn the project's `eslint` binary against a single fixture file,
 * forcing `--no-ignore` so the fixture is linted even though the
 * Green-role implementation will add
 * `lib/observability/__tests__/fixtures/eslint/**` to the config
 * `ignores` array. The test is a command-construction proof: it
 * exercises the real binary + the real project config (auto-discovered
 * by walking up from `cwd = APP_ROOT`).
 *
 * @param fixturePath Absolute path to the `.ts` fixture to lint.
 * @returns The exit status and combined stdout/stderr text so the
 *   assertion can include the lint output in the failure message.
 */
function runEslintOnFixture(fixturePath: string): EslintRunResult {
  try {
    const stdout = execFileSync(
      process.execPath,
      [ESLINT_BIN, '--no-ignore', fixturePath],
      { cwd: APP_ROOT, encoding: 'utf8' },
    );
    return { status: 0, stdout, stderr: '' };
  } catch (e) {
    const err = e as {
      status?: number | null;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
    };
    const stdout = typeof err.stdout === 'string'
      ? err.stdout
      : err.stdout?.toString('utf8') ?? '';
    const stderr = typeof err.stderr === 'string'
      ? err.stderr
      : err.stderr?.toString('utf8') ?? '';
    return {
      status: typeof err.status === 'number' ? err.status : 1,
      stdout,
      stderr,
    };
  }
}

describe('FR-7 ESLint `no-console` rule on micro-fixtures', () => {
  it('exits non-zero on bad.ts (raw `console.log` must be flagged by the rule)', () => {
    const result = runEslintOnFixture(BAD_FIXTURE);

    expect(
      result.status,
      [
        `expected eslint to exit non-zero on bad.ts (which contains console.log).`,
        `exit code: ${result.status}`,
        `stdout: ${result.stdout}`,
        `stderr: ${result.stderr}`,
      ].join('\n'),
    ).not.toBe(0);
  });

  it('exits zero on good.ts (`logger.info` must NOT be flagged by the rule)', () => {
    const result = runEslintOnFixture(GOOD_FIXTURE);

    expect(
      result.status,
      [
        `expected eslint to exit zero on good.ts (which uses logger.info, no console.*).`,
        `exit code: ${result.status}`,
        `stdout: ${result.stdout}`,
        `stderr: ${result.stderr}`,
      ].join('\n'),
    ).toBe(0);
  });
});
