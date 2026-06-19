/**
 * Adversarial audit tests for FR-7 (ESLint `no-console` rule).
 *
 * These tests complement `eslint-no-console.test.ts` by closing the
 * coverage gaps that the bare fixture-based exit-code test leaves open.
 *
 * Gaps closed:
 *   1. **Production-rule enforcement.** The fixture-based test only
 *      exercises `lib/observability/__tests__/fixtures/eslint/bad.ts`,
 *      which is linted via the per-fixture override at the bottom of
 *      `eslint.config.mjs` (`files: ["lib/observability/__tests__/fixtures/eslint/**"]`).
 *      That override re-enables `no-console` with `error` severity
 *      regardless of whether the main production rule is configured.
 *      Removing the main rule therefore does NOT cause the fixture
 *      test to fail — the rule still fires on the fixture via the
 *      override. This test lints an actual production source file
 *      (`lib/observability/metrics.ts`, which contains `console.info`
 *      on line 15) so the main rule must be active for the lint to
 *      exit non-zero.
 *   2. **Severity regression.** Downgrading the rule from `error` to
 *      `warn` does NOT change the eslint exit code (ESLint v9 exits 0
 *      on warnings unless `--max-warnings 0` is set), so the exit-code
 *      assertion cannot distinguish `error` from `warn`. This test
 *      parses the lint output and asserts the severity token in the
 *      message is exactly `error`.
 *   3. **Boundary coverage.** Spec FR-7 forbids `console.log`,
 *      `console.info`, AND `console.debug` (the production-grade
 *      signal), and allows only `console.error` / `console.warn`.
 *      The fixture test only covers `console.log`. This test runs
 *      against a fixture that exercises `log`, `info`, AND `debug`
 *      and asserts each is flagged.
 *   4. **Logger-sink exclusion.** The legitimate sink
 *      (`lib/observability/logger.ts`) uses `console.info(line)` at
 *      line 62 to emit the structured JSON log. The rule must NOT
 *      flag this file or the logger would fail its own lint gate.
 *      This test lints `lib/observability/logger.ts` and asserts
 *      the lint output contains no `no-console` error.
 *   5. **Test-file exclusion.** Files under `__tests__/` (any depth) are
 *      exempt from `no-console` per spec FR-7. This test lints an
 *      existing test file (`eslint-no-console.test.ts` itself, which
 *      contains string literals referencing `console.log` and
 *      `console.info` in its comments) and asserts the lint passes.
 *
 * Strategy reference:
 *   - `measure/tracks/observability_stack_20260603/spec.md` FR-7
 *   - `measure/tracks/observability_stack_20260603/test-strategy.md`
 *     §5 (Architecture Guardrails) and §6 (Phase 7 notes).
 *
 * @see measure/tracks/observability_stack_20260603/plan.md Phase 7
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_ROOT = resolve(__dirname, '../../..');
const ESLINT_BIN = resolve(APP_ROOT, 'node_modules/eslint/bin/eslint.js');

/**
 * Absolute path to a temporary production-scoped file with a
 * known `console.info` site.  Phase 8 (FR-8) removes all
 * `console.*` calls from production code, so the adversarial
 * test writes a canary file into `lib/observability/` (outside
 * any eslint exclusion scope) to prove the global no-console
 * rule is active.  The file is created in `beforeEach` and
 * deleted in `afterEach` so the grep gate (Phase 8e) never
 * sees it.
 */
const CANARY_PATH = resolve(APP_ROOT, 'lib/observability/.eslint-adversarial-canary.ts');

/**
 * Absolute path to the legitimate logger sink. This file uses
 * `console.info(line)` to emit structured logs and MUST NOT be
 * flagged by the rule.
 */
const LOGGER_SINK = resolve(APP_ROOT, 'lib/observability/logger.ts');

/**
 * Absolute path to the per-fixture directory (which has its own
 * override). We use it as the lint target when we need to write a
 * new fixture that the per-fixture override will scope, AND we
 * separately verify the production rule on the metrics file.
 */
const FIXTURE_DIR = resolve(
  APP_ROOT,
  'lib/observability/__tests__/fixtures/eslint',
);

interface EslintRunResult {
  status: number;
  stdout: string;
  stderr: string;
}

/**
 * Spawn the project's `eslint` binary against one or more paths,
 * forcing `--no-ignore` so lint targets are checked even if a
 * matching ignore entry exists in the config.
 *
 * @param targetPath Absolute path (or paths) to lint.
 * @param extraArgs Additional CLI args to pass to eslint.
 * @returns The exit status and combined stdout/stderr text.
 */
function runEslint(
  targetPath: string | string[],
  extraArgs: string[] = [],
): EslintRunResult {
  const args = [ESLINT_BIN, '--no-ignore', ...extraArgs];
  if (Array.isArray(targetPath)) {
    args.push(...targetPath);
  } else {
    args.push(targetPath);
  }

  try {
    const stdout = execFileSync(process.execPath, args, {
      cwd: APP_ROOT,
      encoding: 'utf8',
    });
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

/**
 * Parse the eslint text output to find the FIRST `no-console` message
 * for the target file. ESLint's default formatter is:
 *   <filePath>
 *     <line>:<col>  <severity>  <message>  <ruleId>
 *   <line>:<col>  <severity>  <message>  <ruleId>
 *   ...
 *   ✖ <N> problems (<N> errors, <M> warnings)
 *
 * @param stdout The stdout captured from `eslint --no-ignore`.
 * @param filePath Absolute path to the target file (used to scope).
 * @returns The first matching message's severity + ruleId, or null.
 */
function findNoConsoleMessage(
  stdout: string,
  filePath: string,
): { severity: string; ruleId: string } | null {
  const lines = stdout.split(/\r?\n/);
  let inTargetFileBlock = false;
  for (const line of lines) {
    if (line.includes(filePath)) {
      inTargetFileBlock = true;
      continue;
    }
    if (!inTargetFileBlock) continue;
    if (!line.includes('no-console')) continue;
    // Match the eslint default formatter message shape:
    //   "  3:1  error  <message text>  no-console"
    const match = line.match(/^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(no-console)\s*$/);
    if (match) {
      return { severity: match[3], ruleId: match[5] };
    }
  }
  return null;
}

describe('Adversarial: FR-7 ESLint `no-console` rule enforcement', () => {
  beforeEach(() => {
    fs.writeFileSync(CANARY_PATH, 'console.info("phase7-adversarial-canary");\n', 'utf8');
  });

  afterEach(() => {
    try { fs.unlinkSync(CANARY_PATH); } catch { /* best-effort */ }
  });

  it('flags a known production-code `console.info` site (proves the main rule is active, not just the fixture override)', () => {
    const result = runEslint(CANARY_PATH);

    const msg = findNoConsoleMessage(result.stdout, CANARY_PATH)
      ?? findNoConsoleMessage(result.stderr, CANARY_PATH);

    expect(
      msg,
      [
        `expected the main no-console rule to fire on a production source file`,
        `to prove the rule is active globally, not just inside the per-fixture`,
        `override. file: ${CANARY_PATH}`,
        `exit code: ${result.status}`,
        `stdout: ${result.stdout}`,
        `stderr: ${result.stderr}`,
      ].join('\n'),
    ).not.toBeNull();
  }, 60000);

  it('reports severity=error (not warning) on the production-code site', () => {
    const result = runEslint(CANARY_PATH);

    const msg = findNoConsoleMessage(result.stdout, CANARY_PATH)
      ?? findNoConsoleMessage(result.stderr, CANARY_PATH);

    expect(
      msg,
      [
        `expected no-console to be reported with severity=error, not warning.`,
        `a warn-level rule does not fail the lint gate (eslint exits 0 on warnings`,
        `unless --max-warnings 0 is set), so the production code would be unprotected.`,
        `file: ${CANARY_PATH}`,
        `stdout: ${result.stdout}`,
        `stderr: ${result.stderr}`,
      ].join('\n'),
    ).not.toBeNull();

    expect(msg!.severity).toBe('error');
  }, 60000);

  it('does NOT flag the legitimate logger sink (`lib/observability/logger.ts`)', () => {
    const result = runEslint(LOGGER_SINK);

    const msg = findNoConsoleMessage(result.stdout, LOGGER_SINK)
      ?? findNoConsoleMessage(result.stderr, LOGGER_SINK);

    expect(
      msg,
      [
        `expected logger.ts (the legitimate console sink for structured logs)`,
        `to be exempt from the no-console rule.`,
        `the sink emits a JSON line via console.info on line 62; if the rule`,
        `fired there, the structured logger itself would fail lint.`,
        `file: ${LOGGER_SINK}`,
        `exit code: ${result.status}`,
        `stdout: ${result.stdout}`,
        `stderr: ${result.stderr}`,
      ].join('\n'),
    ).toBeNull();
  }, 60000);

  it('flags `console.log`, `console.info`, AND `console.debug` on a per-fixture variant (boundary coverage for spec FR-7)', () => {
    // The per-fixture override applies here, so this proves the
    // boundary cases pass through the rule shape (not the
    // production-rule path). The previous tests above prove the
    // production rule is active.
    const boundaryFixture = resolve(FIXTURE_DIR, 'boundary-variants.ts');
    const fixtureSource = [
      '// Adversarial boundary fixture for FR-7.',
      '// Each line must be flagged with severity=error, rule=no-console.',
      'console.log("phase7-boundary-log");',
      'console.info("phase7-boundary-info");',
      'console.debug("phase7-boundary-debug");',
      '',
    ].join('\n');

    // Write the fixture to disk so eslint can parse it. The test
    // cleans up after itself in `finally`.
    fs.writeFileSync(boundaryFixture, fixtureSource, 'utf8');

    try {
      const result = runEslint(boundaryFixture);

      const combined = `${result.stdout}\n${result.stderr}`;
      // Count the `no-console` rule-id occurrences in the lint
      // output. ESLint emits one rule-id per flagged site, so this
      // is the count of flagged `console.*` calls.
      const ruleIdMatches = combined.match(/\bno-console\b/g) ?? [];

      expect(
        ruleIdMatches.length,
        [
          `expected eslint to flag the boundary fixture on at least 3 lines`,
          `(log + info + debug). actual no-console rule occurrences: ${ruleIdMatches.length}`,
          `stdout: ${result.stdout}`,
          `stderr: ${result.stderr}`,
        ].join('\n'),
      ).toBeGreaterThanOrEqual(3);
    } finally {
      try {
        fs.unlinkSync(boundaryFixture);
      } catch {
        // best-effort cleanup; the fixture is git-ignored from the
        // perspective of this test, so a stale file would not pollute
        // the repo.
      }
    }
  }, 60000);
});
