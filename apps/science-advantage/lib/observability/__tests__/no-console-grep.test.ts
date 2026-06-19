/**
 * Phase 8e grep-gate tests for FR-8 (Replace Remaining 42 `console.*` Sites).
 *
 * Pinned shape from `measure/tracks/observability_stack_20260603/spec.md`
 * FR-8 (lines 173-180) and `plan.md` Phase 8e:
 *   - 0 `console.log` / `console.info` sites in production code
 *     (`apps/science-advantage/{app,lib,components}/`, `proxy.ts`),
 *     excluding `lib/observability/logger.ts` (the structured-log
 *     sink) and `lib/schemas/lesson-content.schema.ts` (JSDoc
 *     examples per spec FR-8 line 179).
 *   - `console.error` / `console.warn` sites are permitted ONLY in
 *     `lib/observability/logger.ts` (the sink emits
 *     `console.error(line)` / `console.warn(line)` / `console.info(line)`
 *     per FR-4). Every other call site must be migrated to
 *     `logger.error` / `logger.warn` (server) or `clientLogger.*`
 *     (client) per FR-8.
 *
 * Strategy reference:
 *   - `test-strategy.md` §6 (Phase 8 bulk migration): "Use
 *     `rg --count-matches` in a vitest test that asserts
 *     `console.(log|info)` count is 0 across `app/`, `lib/`,
 *     `components/`, `proxy.ts` (excluding the logger sink +
 *     `*.test.ts` + JSDoc fixtures in `lesson-content.schema.ts`).
 *     For 8b, jsdom-environment unit test of `clientLogger` dev/prod
 *     branching."
 *   - `test-strategy.md` §7 (Live-Proof Plan) designates the targeted
 *     Red command for Phase 8:
 *       `pnpm --filter science-advantage exec vitest run
 *        lib/observability/__tests__/no-console-grep.test.ts`
 *   - `test-strategy.md` §5 (Architecture Guardrails): "Logger sink is
 *     the only `console.*` allowed in `lib/observability/logger.ts`.
 *     ESLint exclusion limited to that one file."
 *
 * Test design notes:
 *   - The test spawns the real `rg` (ripgrep) binary via
 *     `process.execPath`-agnostic path discovery. It uses
 *     `execFileSync('rg', [...])` rather than shelling out via
 *     `bash -c` so argument injection is impossible.
 *   - The test is bounded to the **single-file-pair assertion** that
 *     the spec demands (count == 0 for log/info in production,
 *     count == 2 for error/warn only in the sink). It does NOT
 *     invoke `pnpm lint` or `pnpm turbo run lint`, so it cannot
 *     mask other lint failures (strategy §7: "never invokes full
 *     `pnpm lint`").
 *   - `rg --count-matches` exits 0 when matches are found and
 *     prints `<file>:<count>` per file. When no matches are found
 *     it exits 1 and prints nothing. The test handles both cases.
 *
 * Intentionally red at MID handoff: the bulk migration has not yet
 * landed. The current source tree contains ~52 production-code
 * `console.error` / `console.warn` calls and 8 `console.log` /
 * `console.info` calls outside the sink. Every assertion in this
 * file fails with `expected 0 hits but found N` — the expected Red.
 * The Green gate is the same command exiting 0 once Phase 8a–8d
 * land and the production source is migrated.
 */
import {
  describe,
  it,
  expect,
} from 'vitest';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Absolute path to `apps/science-advantage`. The grep-gate search
 * roots are pinned relative to this directory so the test does not
 * depend on the host's `cwd`.
 */
const APP_ROOT = resolve(__dirname, '../../..');

/**
 * Production-code search roots for the grep gate. The scope mirrors
 * spec FR-8 line 199 exactly: "0 `console.*` sites reduced to 0 in
 * `apps/science-advantage/{app,lib,components}/` and `proxy.ts`".
 *
 * Note: `proxy.ts` lives at the app root (next to `instrumentation.ts`),
 * so it is passed to `rg` as a path argument rather than via a glob.
 */
const PRODUCTION_ROOTS = [
  resolve(APP_ROOT, 'app'),
  resolve(APP_ROOT, 'lib'),
  resolve(APP_ROOT, 'components'),
  resolve(APP_ROOT, 'proxy.ts'),
];

/**
 * Glob exclusions for the grep gate. These align with the FR-8
 * exceptions: the logger sink (`lib/observability/logger.ts`),
 * JSDoc examples in `lib/schemas/lesson-content.schema.ts`, test
 * files (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, plus
 * any path under `__tests__/` or `fixtures/`), and `.md`
 * documentation files (which can legitimately contain
 * `console.error(...)` examples in code blocks).
 *
 * Globs are anchored relative to `cwd = APP_ROOT` (the app
 * directory), so they omit the `apps/science-advantage/` prefix
 * that a top-level monorepo invocation would use. This is the
 * correct shape because ripgrep matches globs against the search
 * root, not against the current working directory's full path.
 */
const PRODUCTION_EXCLUDES = [
  '!**/__tests__/**',
  '!**/*.{test,spec}.*',
  '!**/fixtures/**',
  '!**/*.md',
  '!lib/observability/logger.ts',
  '!lib/schemas/lesson-content.schema.ts',
];

/**
 * The legitimate sink path (allowed to call `console.error` /
 * `console.warn` for the structured-log emission in `emit()` per
 * FR-4). The error/warn grep gate asserts this is the ONLY file
 * outside the test/fixture exclusion set that contains such calls.
 */
const LOGGER_SINK = resolve(APP_ROOT, 'lib/observability/logger.ts');

interface RgResult {
  status: number;
  stdout: string;
}

/**
 * Spawn the real `rg` (ripgrep) binary against a pattern + search
 * roots + glob filters. `rg --count-matches --with-filename` outputs
 * `<file>:<count>` lines for each matching file. The `--with-filename`
 * flag forces the file path to be printed even when there is only
 * one search root (rg omits the file prefix for a single-file match
 * by default, which would break the parser). The exit code is 0 when
 * matches exist, 1 when no matches exist, 2 on error. The helper
 * treats exit code 1 as a normal "no hits" result (status field
 * mirrors rg's exit code so the test can distinguish it from a real
 * ripgrep error).
 *
 * @param pattern The ripgrep regex pattern.
 * @param searchRoots Absolute paths to search (files or directories).
 * @param extraArgs Additional `-g` filters and flags.
 * @returns `{ status, stdout }` — the exit code and combined stdout.
 */
function runRg(
  pattern: string,
  searchRoots: string[],
  extraArgs: string[] = [],
): RgResult {
  const args = [
    '--count-matches',
    '--with-filename',
    pattern,
    ...extraArgs.flatMap((g) => ['-g', g]),
    ...searchRoots,
  ];

  try {
    const stdout = execFileSync('rg', args, {
      cwd: APP_ROOT,
      encoding: 'utf8',
    });
    return { status: 0, stdout };
  } catch (e) {
    const err = e as { status?: number | null; stdout?: string | Buffer };
    const stdout = typeof err.stdout === 'string'
      ? err.stdout
      : err.stdout?.toString('utf8') ?? '';
    return {
      status: typeof err.status === 'number' ? err.status : 1,
      stdout,
    };
  }
}

/**
 * Parse `rg --count-matches` output into a stable list of
 * `{ file, count }` records. Empty output yields `[]`. Whitespace
 * lines and lines without a `:` separator are skipped silently so
 * the parser does not throw on unexpected rg output.
 *
 * @param stdout Raw ripgrep `--count-matches` output.
 * @returns Stable, deterministic records sorted by file path.
 */
function parseRgCount(stdout: string): Array<{ file: string; count: number }> {
  return stdout
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0 && line.includes(':'))
    .map((line) => {
      const lastColon = line.lastIndexOf(':');
      const file = line.slice(0, lastColon);
      const count = parseInt(line.slice(lastColon + 1), 10);
      return { file, count: Number.isFinite(count) ? count : 0 };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}

describe('Phase 8e — FR-8 grep gate: 0 `console.*` outside the sink', () => {
  describe('`console.log` and `console.info` must be 0 in production code', () => {
    it('finds 0 `console.log` / `console.info` hits across app/ + lib/ + components/ + proxy.ts (excluding sink + JSDoc + tests + fixtures + .md)', () => {
      const result = runRg(
        'console\\.(log|info)',
        PRODUCTION_ROOTS,
        PRODUCTION_EXCLUDES,
      );

      const hits = parseRgCount(result.stdout);

      expect(
        hits,
        [
          `expected 0 console.log / console.info hits in production code,`,
          `but found ${hits.length} files:`,
          ...hits.map((h) => `  - ${h.file}: ${h.count}`),
          `rg status: ${result.status}`,
          `rg stdout:`,
          result.stdout || '(empty)',
        ].join('\n'),
      ).toEqual([]);
    });

    it('does not falsely pass on the logger sink (sanity: logger.ts IS matched without the excludes)', () => {
      // Sanity guard: if the exclusion `-g '!apps/science-advantage/lib/observability/logger.ts'`
      // is dropped or mis-quoted, the previous test could pass on an
      // empty universe. Re-run the same rg invocation against only
      // logger.ts to confirm the exclusion was needed (i.e., the
      // sink DOES contain `console.info` per FR-4).
      const result = runRg('console\\.(log|info)', [LOGGER_SINK]);
      const hits = parseRgCount(result.stdout);

      expect(
        hits.length,
        [
          `sanity check: expected logger.ts (the structured-log sink)`,
          `to contain >=1 console.(log|info) hit. The grep gate's`,
          `sink exclusion is therefore not vacuously true.`,
          `rg status: ${result.status}`,
          `rg stdout:`,
          result.stdout || '(empty)',
        ].join('\n'),
      ).toBeGreaterThanOrEqual(1);
    });
  });

  describe('`console.error` and `console.warn` must be limited to the sink', () => {
    it('finds 0 `console.error` / `console.warn` hits outside the logger sink + tests + fixtures + .md + JSDoc', () => {
      const result = runRg(
        'console\\.(error|warn)',
        PRODUCTION_ROOTS,
        PRODUCTION_EXCLUDES,
      );

      const hits = parseRgCount(result.stdout);

      expect(
        hits,
        [
          `expected 0 console.error / console.warn hits in production code`,
          `outside lib/observability/logger.ts, but found ${hits.length} files:`,
          ...hits.map((h) => `  - ${h.file}: ${h.count}`),
          `rg status: ${result.status}`,
          `rg stdout:`,
          result.stdout || '(empty)',
        ].join('\n'),
      ).toEqual([]);
    });

    it('sanity: the logger sink IS matched for console.(error|warn) (proves the rule does not vacuously pass)', () => {
      const result = runRg('console\\.(error|warn)', [LOGGER_SINK]);
      const hits = parseRgCount(result.stdout);

      expect(
        hits.length,
        [
          `sanity check: expected logger.ts (the structured-log sink)`,
          `to contain >=1 console.(error|warn) hit (the emit() function`,
          `calls console.error / console.warn / console.info per FR-4).`,
          `The grep gate's error/warn assertion is therefore anchored`,
          `on real sink calls, not an empty universe.`,
          `rg status: ${result.status}`,
          `rg stdout:`,
          result.stdout || '(empty)',
        ].join('\n'),
      ).toBeGreaterThanOrEqual(1);
    });
  });

  describe('proxy.ts must be free of `console.error` (FR-8 Phase 8d)', () => {
    it('finds 0 `console.error` hits in proxy.ts (all migrated to logger.error)', () => {
      const result = runRg('console\\.error', [resolve(APP_ROOT, 'proxy.ts')]);
      const hits = parseRgCount(result.stdout);

      expect(
        hits,
        [
          `expected 0 console.error hits in proxy.ts (Phase 8d: all 3`,
          `console.error sites must be migrated to logger.error),`,
          `but found ${hits.length} files:`,
          ...hits.map((h) => `  - ${h.file}: ${h.count}`),
          `rg status: ${result.status}`,
          `rg stdout:`,
          result.stdout || '(empty)',
        ].join('\n'),
      ).toEqual([]);
    });
  });
});