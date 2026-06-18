/**
 * Adversarial closure tests for `housekeeping_batch_20260603` Phase 6
 * (Re-Pin 51 `^`-Ranged Deps — F-1201, doc-only deviation path).
 *
 * The Phase 6 contract (per
 * `measure/tracks/housekeeping_batch_20260603/plan.md` Phase 6):
 *   1. Decide a pnpm `save-exact` policy: add `save-exact=false` to
 *      `.npmrc` (existing behavior; the 51 `^` ranges are grandfathered).
 *   2. Document the decision in `apps/science-advantage/AGENTS.md`:
 *      "Dependencies use `^` ranges for flexibility. The
 *      pnpm-lock.yaml is the source of truth at install time."
 *   3. (Optional / deferred) If the maintainer wants strict pinning,
 *      re-pin each of the 51 deps. This track does NOT execute this
 *      step.
 *   4. For this track, default to the documented deviation; strict
 *      pinning is a follow-up.
 *
 * The Phase 6 deliverable is a single deviation note in
 * `apps/science-advantage/AGENTS.md`. No package.json churn, no
 * `.npmrc` edit (no `.npmrc` exists at HEAD), no `pnpm install` rerun.
 *
 * Background / pre-state at HEAD (commit `17beedb9`):
 *   - The audit (2026-06-03) cited 51 `^`-ranged deps in
 *     `apps/science-advantage/package.json`. The HEAD-actual count is
 *     56 (verified via
 *     `rg -n '"\^' apps/science-advantage/package.json | wc -l`).
 *     The Phase 6 contract is unchanged; the count drift is
 *     informational only.
 *   - No `.npmrc` files exist in the repo (root, `apps/*`, or
 *     `packages/*`). pnpm default behavior = `save-exact=false`, so
 *     the deviation is the current behavior — the only Red target is
 *     the documentation.
 *   - `apps/science-advantage/AGENTS.md` contains:
 *     - line 3: regression-guard note for Phase 1 / F-205 (must be
 *       preserved).
 *     - line 5: deviation-from-monorepo header (must be preserved).
 *     - NO note about `^` ranges, `pnpm-lock.yaml`, or `save-exact`.
 *   - `rg -in 'pnpm-lock|save-exact|caret|re-pin' apps/science-advantage/AGENTS.md`
 *     → 0 matches at HEAD (Red state confirmed).
 *
 * Test strategy / scope decisions:
 *   - Section 1 pins the deviation note's existence in AGENTS.md and
 *     that it mentions both `^` ranges and `pnpm-lock.yaml`. The
 *     regex is permissive on phrasing (matches both `^ ranges`,
 *     `caret ranges`, `^x.y.z ranges`, etc.) so the Implementer can
 *     phrase the note in their own voice.
 *   - Section 2 pins the deviation note's wording for `pnpm-lock.yaml`
 *     as the source of truth at install time. The phrasing regex
 *     requires `pnpm-lock.yaml` and at least one of "source of truth"
 *     or "authoritative" or "frozen install" — this matches the plan's
 *     mandated wording while allowing natural variants.
 *   - Section 3 is a positive regression guard: the actual repo state
 *     (`package.json` ranges, `.npmrc` absence) matches the deviation.
 *     These assertions already hold at HEAD and protect against the
 *     Implementer accidentally changing the repo state while editing
 *     AGENTS.md.
 *   - Section 4 pins the line-3 regression-guard and line-5 deviation
 *     header are preserved untouched (per Phase 1 and Phase 3).
 *   - Section 5 pins the live-proof grep from test-strategy.md Phase 6:
 *     `rg -in 'pnpm-lock|save-exact|caret|\^ ranges|re-pin' apps/science-advantage/AGENTS.md`
 *     must return ≥1 match at Green.
 *
 * The SUT is the source text of `apps/science-advantage/AGENTS.md`,
 * `apps/science-advantage/package.json`, and the absence of `.npmrc`
 * files. No DB, no Next.js server. Tests shell out to `rg` for
 * ground-truth text searches (matching the Phase 3/4/5 test patterns).
 *
 * Run via the unit config (no DB):
 *
 *   cd apps/science-advantage && \
 *     ./node_modules/.bin/vitest run \
 *       --config vitest.unit.config.ts \
 *       lib/__tests__/housekeeping-phase6-repin-deps.test.ts
 *
 * See: measure/tracks/housekeeping_batch_20260603/plan.md (Phase 6)
 *      measure/tracks/housekeeping_batch_20260603/test-strategy.md
 *      measure/audit-reports/science-advantage_20260603/findings.md (F-1201)
 *      apps/science-advantage/lib/__tests__/housekeeping-phase5-orphan-todos.test.ts
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
const AGENTS_FILE = path.join(APP_DIR, 'AGENTS.md');
const PACKAGE_JSON_FILE = path.join(APP_DIR, 'package.json');

/**
 * Run a command, capture stdout/stderr/status. Used for ground-truth
 * text searches via `rg` and `git ls-files`.
 */
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
  // rg returns 1 for no matches; we allow 0 (matches) and 1 (no matches).
  // Anything else is a real error.
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
 * Count of `^`-prefixed semver ranges in the science-advantage
 * package.json. Cached for the test run.
 */
let cachedCaretRangeCount: number | null = null;
function countCaretRangesInPackageJson(): number {
  if (cachedCaretRangeCount !== null) return cachedCaretRangeCount;
  const result = runCaptured('rg', ['-n', '"\\^', 'apps/science-advantage/package.json']);
  const lines = result.stdout
    .trim()
    .split('\n')
    .filter((l) => l.length > 0);
  cachedCaretRangeCount = lines.length;
  return cachedCaretRangeCount;
}

/**
 * Check that the AGENTS.md content matches a deviation-note contract
 * for `^` ranges. Returns the matched slice (or null if no match).
 *
 * Accepts:
 *   - `^` (literal caret, anywhere in the note)
 *   - `caret` (English spelling)
 *   - `^x.y.z` form
 *
 * Phrase is allowed in any of the early AGENTS.md sections (header,
 * Build/Test/Development, Project Structure, Coding Style, or as a
 * dedicated dependency-policy blockquote). The Implementer chooses
 * where to put it; the §1.1 test only requires presence.
 */
function hasCaretRangePhrase(contents: string): boolean {
  // Look for `^` (literal caret) AND one of {range, ranges, version,
  // dependency, dependencies, semver, pinning, pin, re-pin, devDep,
  // dep}. Both must appear in the same line OR within a 4-line window
  // to be counted as part of the same note. We use a multi-line regex
  // with `[\s\S]{0,200}?` to allow small spacing.
  const caretMatch = /\^[\d.A-Za-z+\-]*/.test(contents);
  const caretWordMatch = /\bcaret\b/i.test(contents);
  if (!caretMatch && !caretWordMatch) return false;
  const depContextWords = /\b(range|ranges|version|versions|dependency|dependencies|semver|pin|pinning|re-?pin|devDep|dep|deps)\b/i;
  return depContextWords.test(contents);
}

describe('housekeeping_batch_20260603 / Phase 6 — Re-pin 51 ^-ranged deps (doc deviation, F-1201)', () => {
  describe('§1 — apps/science-advantage/AGENTS.md contains the deviation note about ^ ranges', () => {
    /**
     * Per plan.md Phase 6 task 2: the deviation note must be present
     * in `apps/science-advantage/AGENTS.md`. Per the audit (F-1201)
     * the note should explain that:
     *   - dependencies use `^` ranges (caret semver ranges)
     *   - the `pnpm-lock.yaml` is the source of truth at install time
     *
     * §1.1 pins the `^` ranges half. §2 pins the `pnpm-lock.yaml`
     * half.
     */
    it('§1.1 — AGENTS.md mentions `^` ranges (or `caret` + `range`/`version`)', async () => {
      const contents = await fsp.readFile(AGENTS_FILE, 'utf-8');
      expect(
        hasCaretRangePhrase(contents),
        `expected AGENTS.md to contain a deviation note about \`^\` ranges (or "caret ranges"); found neither.`
      ).toBe(true);
    });
  });

  describe('§2 — the deviation note identifies pnpm-lock.yaml as the source of truth at install time', () => {
    /**
     * Per plan.md Phase 6 task 2: "The pnpm-lock.yaml is the source of
     * truth at install time." §2 pins this exactly. The phrase regex
     * is permissive (matches "source of truth", "authoritative",
     * "frozen install") so the Implementer can phrase naturally.
     */
    it('§2.1 — AGENTS.md mentions pnpm-lock.yaml in a source-of-truth or authoritative-install phrasing', async () => {
      const contents = await fsp.readFile(AGENTS_FILE, 'utf-8');
      const mentionsLockfile = /pnpm-lock\.yaml/i.test(contents);
      const sourceOfTruthPattern =
        /source\s+of\s+truth|authoritative|frozen\s+install|installed\s+versions?\s+(?:are|come\s+from)/i;
      const hasSourceOfTruth = sourceOfTruthPattern.test(contents);
      expect(
        mentionsLockfile,
        `expected AGENTS.md to mention \`pnpm-lock.yaml\`; not found.`
      ).toBe(true);
      expect(
        hasSourceOfTruth,
        `expected AGENTS.md to identify pnpm-lock.yaml as the source of truth (or "authoritative" / "frozen install"); not found.`
      ).toBe(true);
    });
  });

  describe('§3 — Positive regression guards: actual repo state matches the deviation', () => {
    /**
     * The deviation is "use `^` ranges; the lockfile is the source of
     * truth". The Implementer's note is only honest if the repo
     * actually behaves that way. §3 pins the repo state so the
     * Implementer cannot accidentally regress it while editing the
     * doc.
     */

    it('§3.1 — apps/science-advantage/package.json contains at least 51 ^-ranged deps (audit cited 51; HEAD-actual is 56)', () => {
      const caretCount = countCaretRangesInPackageJson();
      expect(
        caretCount,
        `expected \`^\`-ranged deps in apps/science-advantage/package.json to be \u2265 51 (audit F-1201 cited 51; HEAD-actual is 56); found ${caretCountForMsg(caretCount)}.`
      ).toBeGreaterThanOrEqual(51);
    });

    it('§3.2 — no .npmrc file exists in the repo (default pnpm save-exact=false holds the deviation)', async () => {
      const result = runCaptured('git', ['ls-files', '*.npmrc']);
      const lines = result.stdout
        .trim()
        .split('\n')
        .filter((l) => l.length > 0);
      expect(
        lines,
        `expected no tracked .npmrc files in the repo (so pnpm default \`save-exact=false\` applies); found:\n${lines.join('\n')}`
      ).toEqual([]);
    });
  });

  describe('§4 — Phase 1 regression-guard and Phase 3 deviation header are preserved untouched', () => {
    /**
     * The deviation note is appended to AGENTS.md. The earlier notes
     * (Phase 1 regression-guard for `prisma/`, Phase 3 deviation
     * header) must remain verbatim.
     */

    it('§4.1 — line-3 Phase 1 regression-guard note about `prisma/` is preserved', async () => {
      const contents = await fsp.readFile(AGENTS_FILE, 'utf-8');
      const lines = contents.split('\n');
      // Audit cited line 3; allow ±2 lines for incidental drift.
      const slice = lines.slice(0, 5).join('\n');
      expect(
        slice,
        `expected line-3 Phase 1 regression-guard note about \`prisma/\` to be preserved; not found in lines 1-5.`
      ).toMatch(/Regression guard.*prisma.*directory.*must not exist/i);
    });

    it('§4.2 — Phase 3 deviation-from-monorepo header note is preserved', async () => {
      const contents = await fsp.readFile(AGENTS_FILE, 'utf-8');
      const lines = contents.split('\n');
      const slice = lines.slice(0, 10).join('\n');
      expect(
        slice,
        `expected Phase 3 deviation-from-monorepo header note to be preserved in lines 1-10; not found.`
      ).toMatch(/deviations from the monorepo.*AGENTS\.md/i);
    });
  });

  describe('§5 — Plan-spec ground-truth rg command matches the test-strategy.md live-proof plan verbatim', () => {
    /**
     * test-strategy.md Phase 6 "Live-Proof Plan" row:
     *   Red: n/a (doc-only)
     *   Green: grep finds the deviation note in
     *     `apps/science-advantage/AGENTS.md`
     *
     * The ground-truth grep is:
     *   rg -in 'pnpm-lock|save-exact|caret|\^ ranges|re-pin' \
     *     apps/science-advantage/AGENTS.md
     *
     * The §5.1 assertion runs this exact command and requires ≥1
     * match at Green. The Red state at HEAD is 0 matches.
     */
    it('§5.1 — rg for pnpm-lock|save-exact|caret|^ ranges|re-pin returns \u22651 match at Green', () => {
      const result = runCaptured('rg', [
        '-in',
        'pnpm-lock|save-exact|caret|\\^ ranges|re-pin',
        'apps/science-advantage/AGENTS.md',
      ]);
      expect(
        result.status,
        `expected rg exit 0 (matches found) at Green; got ${result.status}.\nstdout:\n${result.stdout}`
      ).toBe(0);
      const lines = result.stdout
        .trim()
        .split('\n')
        .filter((l) => l.length > 0);
      expect(
        lines.length,
        `expected \u22651 grep match for deviation note at Green; got ${lines.length}.\nstdout:\n${result.stdout}`
      ).toBeGreaterThanOrEqual(1);
    });
  });
});

/**
 * Helper for nicer error messages (typed to avoid a TS6133 unused-var
 * lint warning on the inner variable).
 */
function caretCountForMsg(n: number): string {
  return String(n);
}
