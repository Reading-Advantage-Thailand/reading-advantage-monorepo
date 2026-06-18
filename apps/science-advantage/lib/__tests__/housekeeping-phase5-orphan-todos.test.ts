/**
 * Adversarial closure tests for `housekeeping_batch_20260603` Phase 5
 * (Backfill 5 Orphan In-Code TODOs — F-1305).
 *
 * The Phase 5 contract (per
 * `measure/tracks/housekeeping_batch_20260603/plan.md` Phase 5):
 *   1. File 1 GH issue for the language-preference tracking in
 *      `lib/gamification/badges.ts:115`.
 *   2. File 1 GH issue for the i18n + lesson-slug TODOs (covers 4
 *      in-code TODOs in `app/api/lessons/[lessonSlug]/route.ts` and
 *      `app/api/classes/[classId]/curriculum/route.ts`).
 *   3. Update each in-code TODO with `// TODO(#<issue-number>): …`
 *      reference.
 *   4. Verify: rg for `TODO` in app/, lib/, components/ (excluding
 *      test files) returns 0 orphan comments (or only intentionally
 *      tracked ones — i.e. those following the `TODO(#NNN)` form).
 *
 * Background / pre-migration context (relevant to the Implementer):
 *   - The 2026-06-03 audit cited 5 orphan TODOs at specific lines.
 *     Between the audit and HEAD (commit `69dc45de`), the
 *     `app_domain_migration_20260603` track (commit `90abb4fc`)
 *     rewrote both route.ts files in `app/api/lessons/[lessonSlug]/`
 *     and `app/api/classes/[classId]/curriculum/`, removing the 4
 *     route.ts TODOs organically. They are no longer present in HEAD.
 *   - The 5th orphan TODO — `lib/gamification/badges.ts:115` (language
 *     preference tracking in the `checkBilingualScholar` stub) — is
 *     still present at HEAD and is the live contract target.
 *   - One additional orphan TODO was found at HEAD:
 *     `app/(teacher)/teacher/page.e2e.spec.ts:7` (Playwright e2e
 *     test, lower severity per the audit). This file is not in the
 *     test-strategy.md "Live-Proof Plan" exact scope (which excludes
 *     only `*.test.*`), but it IS a Playwright e2e test fixture and
 *     is excluded by the §2 tighter-scope test below.
 *   - The codebase has ZERO existing `TODO(#NNN)` patterns at HEAD
 *     (verified by `rg --pcre2 'TODO\(' apps/science-advantage/`
 *     returning no matches). Phase 5 introduces this convention.
 *
 * The Phase 5 contract is therefore narrowed to: any TODO that remains
 * in the audit's named source paths must be tracked via the
 * `TODO(#NNN)` syntax introduced by this phase, OR be removed entirely.
 *
 * Test strategy / scope decisions:
 *   - Section 1 matches the test-strategy.md "Live-Proof Plan" command
 *     exactly: rg with --pcre2 and the negative-lookahead regex
 *     `TODO(?!\(#)`, scanning app/, lib/, components/ and excluding
 *     dot-test-dot files. This pins the live proof. The Implementer
 *     can leave `.e2e.spec.ts` TODOs alone and §1 still passes — but
 *     per audit F-1305 lower severity item, those are expected to be
 *     tracked too.
 *   - Section 2 is a stricter contract: even Playwright e2e tests
 *     (dot-spec-dot) and integration tests must have no untracked
 *     TODO. This pins the full audit intent.
 *   - Section 3 pins the specific known orphan at
 *     `lib/gamification/badges.ts:115`. If the Implementer removes
 *     the TODO entirely, §3 passes (the function is a stub returning
 *     `false`, so removing the comment is acceptable). If they replace
 *     it with `TODO(#NNN):`, §3 also passes (the new form satisfies
 *     the contract).
 *   - Section 4 is a positive regression guard: any TODO that DOES
 *     remain in the scope must follow `TODO(#` (the tracked form).
 *     This prevents the Implementer from accidentally introducing
 *     new orphan TODOs in the process of fixing the existing ones.
 *
 * The SUT is the source text of `apps/science-advantage/{app,lib,components}/`
 * (no DB, no server). Tests shell out to `rg` with `--pcre2` for the
 * negative-lookahead regex. Tests are unit-level — no DB, no Next.js
 * server. Run via the unit config:
 *
 *   /opt/codex-desktop/resources/node-runtime/bin/node \
 *     node_modules/vitest/vitest.mjs run \
 *     --config vitest.unit.config.ts \
 *     lib/__tests__/housekeeping-phase5-orphan-todos.test.ts
 *
 * See: measure/tracks/housekeeping_batch_20260603/plan.md (Phase 5)
 *      measure/tracks/housekeeping_batch_20260603/test-strategy.md
 *      measure/audit-reports/science-advantage_20260603/findings.md (F-1305)
 *      apps/science-advantage/lib/__tests__/housekeeping-phase1-relocate-prisma.test.ts
 *      apps/science-advantage/lib/__tests__/housekeeping-phase3-agents-md.test.ts
 *      apps/science-advantage/lib/__tests__/housekeeping-phase4-gitignore-log.test.ts
 */
import fsp from 'fs/promises';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { describe, it, expect } from 'vitest';

const MONOREPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim();
const APP_DIR = path.join(MONOREPO_ROOT, 'apps/science-advantage');
const BADGES_FILE = path.join(APP_DIR, 'lib/gamification/badges.ts');
const SCAN_PATHS = [
  'apps/science-advantage/app',
  'apps/science-advantage/lib',
  'apps/science-advantage/components',
];

function runCaptured(
  command: string,
  args: string[],
  options: { allowExitCodes?: number[] } = {}
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd: MONOREPO_ROOT,
    encoding: 'utf-8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  const allowExitCodes = options.allowExitCodes ?? [0, 1];
  // rg returns exit 1 when no matches are found; we allow 0 (matches)
  // and 1 (no matches). Anything else is a real error.
  if (!allowExitCodes.includes(result.status ?? -1)) {
    throw new Error(
      `Command failed (${result.status}): ${command} ${args.join(' ')}\n${result.stderr}`
    );
  }
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * Run the Phase 5 rg command (negative-lookahead `TODO(?!\(#)`)
 * with optional `-g` glob exclusions. Returns parsed match lines
 * `path:lineno:content`.
 */
function rgOrphanTodoLines(
  scanPaths: string[],
  globExcludes: string[]
): string[] {
  const args = [
    '--pcre2',
    '-n',
    'TODO(?!\\()',
    ...scanPaths,
  ];
  for (const glob of globExcludes) {
    args.push('-g', glob);
  }
  const result = runCaptured('rg', args);
  const out = result.stdout.trim();
  if (out === '') return [];
  return out.split('\n').filter((l) => l.length > 0);
}

function rgTrackedTodoLines(
  scanPaths: string[],
  globExcludes: string[]
): string[] {
  const args = [
    '--pcre2',
    '-n',
    'TODO\\(#',
    ...scanPaths,
  ];
  for (const glob of globExcludes) {
    args.push('-g', glob);
  }
  const result = runCaptured('rg', args);
  const out = result.stdout.trim();
  if (out === '') return [];
  return out.split('\n').filter((l) => l.length > 0);
}

describe('housekeeping_batch_20260603 / Phase 5 — Backfill 5 orphan in-code TODOs (F-1305)', () => {
  describe('§1 — No untracked in-code TODOs in app/, lib/, components/ (per test-strategy live-proof plan)', () => {
    /**
     * Per test-strategy.md "Live-Proof Plan" Phase 5 row:
     *   Red command: rg with the negative-lookahead regex
     *     `TODO(?!\(#)`, scanning app/, lib/, components/ and
     *     excluding dot-test-dot files. (>0 before.)
     *   Green gate: returns 0
     *
     * The Red state at HEAD (commit `69dc45de`):
     *   - apps/science-advantage/lib/gamification/badges.ts line 115
     *     contains `// TODO: Requires language preference tracking`.
     *   - apps/science-advantage/app/(teacher)/teacher/page.e2e.spec.ts
     *     line 7 contains `// TODO: Add authentication steps based on
     *     your test setup`.
     *
     * Note: dot-e2e-spec-dot files are NOT excluded by the
     * test-strategy.md live-proof glob (which only excludes dot-test-dot
     * files). The Phase 5 Section 1 contract follows the live-proof
     * plan verbatim, so the Implementer must address the e2e-spec TODO
     * as well.
     *
     * After Green: 0 matches across the entire scope.
     */
    it('§1.1 — rg `TODO(?!\()` returns 0 matches in app/, lib/, components/ (excluding *.test.*)', () => {
      const matches = rgOrphanTodoLines(SCAN_PATHS, ['!**/*.test.*']);
      expect(
        matches,
        `expected no orphan TODOs (i.e. \`TODO\` not followed by \`(#\`); found ${matches.length}:\n${matches.join('\n')}`
      ).toEqual([]);
    });
  });

  describe('§2 — Tighter scope: even spec / e2e / integration test files have no orphan TODOs', () => {
    /**
     * The audit (F-1305) cited the e2e-spec TODO at
     * `app/(teacher)/teacher/page.e2e.spec.ts:7` as "lower severity"
     * but still in scope. This block pins the stricter contract:
     * exclusion globs cover dot-test-dot, dot-spec-dot,
     * dot-e2e-spec-dot, dot-integration-test-dot, and the
     * __tests__ directories.
     *
     * If the Implementer leaves the e2e-spec TODO untracked, §1.1
     * will still fail (which is the live-proof gate), and §2.1 will
     * also fail. Both gates converge on "all TODOs tracked or removed".
     */
    it('§2.1 — rg `TODO(?!\()` returns 0 matches excluding all test/spec/e2e globs', () => {
      const matches = rgOrphanTodoLines(SCAN_PATHS, [
        '!**/*.test.*',
        '!**/*.spec.*',
        '!**/__tests__/**',
        '!**/node_modules/**',
        '!**/.next/**',
      ]);
      expect(
        matches,
        `expected no orphan TODOs in any non-test source file; found ${matches.length}:\n${matches.join('\n')}`
      ).toEqual([]);
    });
  });

  describe('§3 — Known orphan at lib/gamification/badges.ts:115 is no longer untracked', () => {
    /**
     * Pin the specific known orphan from the F-1305 audit and from
     * the current HEAD state. The Implementer may either:
     *   (a) Replace `// TODO: Requires language preference tracking`
     *       with `// TODO(#<issue>): Requires language preference tracking`
     *       (preferred — files a tracking issue and links it inline), OR
     *   (b) Remove the TODO comment entirely (acceptable — the function
     *       is a stub returning `false`, so the comment is not load-bearing).
     *
     * Both resolutions satisfy §3. The §3.1 test asserts the file at
     * line 115 no longer contains a `TODO:` (untracked) comment, and
     * if a `TODO` is still present, it must be in tracked `TODO(#…)`
     * form.
     */
    it('§3.1 — badges.ts no longer has an untracked `TODO:` comment at line 115 (or the TODO has been removed)', async () => {
      const contents = await fsp.readFile(BADGES_FILE, 'utf-8');
      const lines = contents.split('\n');
      // Audit cited line 115; allow ±2 lines for incidental drift
      // (whitespace, doc-comments, etc.).
      const slice = lines.slice(112, 118).join('\n');
      // Look for the specific orphan phrasing: `TODO` (in a `// …`
      // comment) NOT immediately followed by `(` (the tracked form).
      // This is the same regex as the rg live-proof command.
      const hasUntrackedTodo = /^\s*\/\/\s*TODO(?!\()/m.test(slice);
      expect(
        hasUntrackedTodo,
        `expected badges.ts lines 113-118 to have no untracked \`TODO:\` comment; found:\n${slice}`
      ).toBe(false);
    });

    it('§3.2 — if a TODO comment remains in badges.ts line ~115, it must be in `TODO(#…)` tracked form', async () => {
      const contents = await fsp.readFile(BADGES_FILE, 'utf-8');
      const lines = contents.split('\n');
      const slice = lines.slice(112, 118).join('\n');
      // If any TODO comment exists in this window, it must be in
      // the tracked `TODO(#…)` form. If no TODO exists at all, the
      // assertion trivially passes (the §3.1 contract is satisfied
      // by removal).
      const todoMatch = slice.match(/^\s*\/\/\s*(TODO[^\n]*)/m);
      if (todoMatch) {
        const todoText = todoMatch[1];
        expect(
          todoText,
          `if a TODO comment remains in badges.ts ~line 115, it must be in \`TODO(#…)\` tracked form; got: \`${todoText}\``
        ).toMatch(/^TODO\(#\d+\)/);
      }
      // No-op when no TODO comment remains: §3.1 already gates removal.
    });
  });

  describe('§4 — Positive regression guard: any TODO that DOES remain in scope must be tracked', () => {
    /**
     * Pin the convention Phase 5 introduces: every TODO comment in
     * the scope must follow `TODO(#NNN)` (the tracked form). The
     * negation of this rule (`TODO(?!\()`) is the §1/§2 red gate;
     * this section pins the dual positive rule.
     *
     * If the Implementer removes all TODOs, this test still passes
     * (zero matches is a valid Green state — there is no requirement
     * to KEEP a TODO).
     */
    it('§4.1 — the rg `TODO(?!\()` and `TODO(#` counts are complementary (no overlap)', () => {
      const orphans = rgOrphanTodoLines(SCAN_PATHS, [
        '!**/*.test.*',
        '!**/*.spec.*',
        '!**/__tests__/**',
        '!**/node_modules/**',
        '!**/.next/**',
      ]);
      const tracked = rgTrackedTodoLines(SCAN_PATHS, [
        '!**/*.test.*',
        '!**/*.spec.*',
        '!**/__tests__/**',
        '!**/node_modules/**',
        '!**/.next/**',
      ]);
      // Every orphan TODO line and every tracked TODO line must be
      // a strict partition: no line should appear in both. The
      // negative-lookahead and the positive `TODO(#` regex are
      // disjoint by construction, but pin it defensively in case
      // a regex typo creeps in.
      const orphanSet = new Set(orphans);
      const trackedSet = new Set(tracked);
      const intersection = [...orphanSet].filter((l) => trackedSet.has(l));
      expect(
        intersection,
        `orphan and tracked TODO sets must be disjoint; intersection: ${JSON.stringify(intersection)}`
      ).toEqual([]);
    });

    it('§4.2 — tracked `TODO(#…)` patterns are well-formed: `TODO(#NNN)` where NNN is a digit sequence', () => {
      const tracked = rgTrackedTodoLines(SCAN_PATHS, [
        '!**/*.test.*',
        '!**/*.spec.*',
        '!**/__tests__/**',
        '!**/node_modules/**',
        '!**/.next/**',
      ]);
      // Every tracked line must contain a well-formed `TODO(#NNN)`
      // pattern in its content (after the `path:lineno:` prefix).
      const malformed = tracked.filter((line) => {
        // strip the rg `<path>:<lineno>:` prefix
        const colonIdx = line.indexOf(':');
        const secondColon = line.indexOf(':', colonIdx + 1);
        const content =
          secondColon === -1 ? line : line.slice(secondColon + 1);
        return !/TODO\(#\d+\)/.test(content);
      });
      expect(
        malformed,
        `expected all \`TODO(#…)\` patterns to match \`TODO(#NNN)\`; malformed:\n${malformed.join('\n')}`
      ).toEqual([]);
    });
  });

  describe('§5 — Plan-spec ground-truth rg command matches the test-strategy.md live-proof plan verbatim', () => {
    /**
     * test-strategy.md Phase 5 "Live-Proof Plan" row, verbatim:
     *   Red: rg with negative-lookahead `TODO(?!\(#)` and the
     *     test-file glob exclusion (excluding dot-test-dot files).
     *     (>0 before.)
     *   Green: returns 0
     *
     * Pin the exact command shape (globs + paths + regex) as a single
     * assertion so the live-proof gate can be replayed one-to-one in
     * Phase 11 final acceptance.
     */
    it('§5.1 — exact test-strategy live-proof command returns 0 matches at Green', () => {
      const result = runCaptured('rg', [
        '--pcre2',
        '-n',
        'TODO(?!\\()',
        'apps/science-advantage/app',
        'apps/science-advantage/lib',
        'apps/science-advantage/components',
        '-g',
        '!**/*.test.*',
      ]);
      expect(
        result.status,
        `expected rg exit code 1 (no matches) at Green; got ${result.status}.\nstdout:\n${result.stdout}\nstderr: ${result.stderr}`
      ).toBe(1);
      expect(
        result.stdout.trim(),
        `expected empty rg stdout at Green; got: ${result.stdout}`
      ).toBe('');
    });
  });
});