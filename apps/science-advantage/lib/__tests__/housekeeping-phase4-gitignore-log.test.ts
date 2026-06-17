/**
 * Adversarial closure tests for `housekeeping_batch_20260603` Phase 4
 * (Add `*.log` to `.gitignore` — F-1202).
 *
 * The Phase 4 contract (per `measure/tracks/housekeeping_batch_20260603/plan.md`):
 *   1. Add `*.log` to `apps/science-advantage/.gitignore` (or a more specific
 *      log pattern if other `*.log` files are intentional).
 *   2. `git clean -f apps/science-advantage/{gemini_design_update,visual_refresh_track}.log`.
 *   3. Verify: `ls apps/science-advantage/*.log` returns no files (or only
 *      intentional ones).
 *
 * Background:
 *   - The root monorepo `.gitignore` (line 32) already contains `*.log`,
 *     so a probe `.log` file under `apps/science-advantage/` would be
 *     ignored by git via the root rule. The contract for THIS phase is
 *     tighter: the rule must be declared in the app-local
 *     `apps/science-advantage/.gitignore` so the app's ignore file is
 *     self-contained (each app is expected to declare its own ignore
 *     rules, not rely on a root fallback).
 *   - Two untracked `.log` files are currently present at the app root:
 *     `apps/science-advantage/gemini_design_update.log` and
 *     `apps/science-advantage/visual_refresh_track.log`. After the
 *     `.gitignore` rule is added, they MUST be ignored and may be
 *     `git clean -f`'d.
 *
 * The SUT is the `apps/science-advantage/.gitignore` file (text artifact)
 * and git's ignore resolution for paths under `apps/science-advantage/`.
 * Tests shell out to `git check-ignore` and use `fs.readFile` for
 * content assertions. Tests are unit-level — no DB, no Next.js server.
 *
 * See: measure/tracks/housekeeping_batch_20260603/plan.md (Phase 4)
 *      measure/tracks/housekeeping_batch_20260603/test-strategy.md
 *      apps/science-advantage/lib/__tests__/housekeeping-phase3-agents-md.test.ts
 */
import fsp from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { describe, it, expect } from 'vitest';

const MONOREPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim();
const APP_DIR = path.join(MONOREPO_ROOT, 'apps/science-advantage');
const APP_GITIGNORE = path.join(APP_DIR, '.gitignore');
const PROBE_LOG = path.join(APP_DIR, '.housekeeping-phase4-probe.log');

function runCaptured(command: string, args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd: MONOREPO_ROOT,
    encoding: 'utf-8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

async function readNonCommentRules(gitignorePath: string): Promise<string[]> {
  const contents = await fsp.readFile(gitignorePath, 'utf-8');
  return contents
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

describe('housekeeping_batch_20260603 / Phase 4 — Add `*.log` to apps/science-advantage/.gitignore (F-1202)', () => {
  describe('§1 — App-local .gitignore declares a `*.log` rule (or more specific log pattern)', () => {
    /**
     * Spec FR / F-1202: "Add `*.log` to `.gitignore` (or a more specific
     * pattern if other `*.log` files are intentional)." The rule must
     * live in `apps/science-advantage/.gitignore` (the per-app ignore
     * file), not just the monorepo-root `.gitignore`. This pins the
     * app-local rule.
     */
    it('§1.1 — apps/science-advantage/.gitignore contains a `*.log` (or more specific) rule', async () => {
      const rules = await readNonCommentRules(APP_GITIGNORE);
      const logRules = rules.filter((l) => /\*\.log(?:$|\*)/.test(l));
      expect(
        logRules.length,
        `expected at least one \`*.log\` (or more specific) rule in apps/science-advantage/.gitignore; found ${logRules.length}: [${logRules.join(', ')}]`,
      ).toBeGreaterThan(0);
    });

    it('§1.2 — the rule, applied via `git check-ignore`, sources from apps/science-advantage/.gitignore (not the monorepo root)', async () => {
      // `git check-ignore -v` prints `<source>:<linenum>:<pattern>\t<path>`.
      // We probe a unique non-existent path so the test is hermetic and
      // does not depend on the existence of an actual .log file.
      // Use --no-index so we can probe an untracked path safely.
      const result = runCaptured('git', [
        'check-ignore',
        '-v',
        '--no-index',
        PROBE_LOG,
      ]);
      // git check-ignore exits 0 when the path is ignored, 1 when not.
      expect(
        result.status,
        `expected git check-ignore to ignore ${PROBE_LOG} (status 0); got ${result.status}. stderr: ${result.stderr}`,
      ).toBe(0);
      // The source line must reference the app-local .gitignore, not
      // the monorepo root. Format: <source>:<linenum>:<pattern>\t<path>
      const out = result.stdout.trim();
      expect(
        out,
        'git check-ignore should print the rule source line',
      ).toMatch(/\.gitignore:/);
      // The source must end with `apps/science-advantage/.gitignore`,
      // not the monorepo root `.gitignore`.
      const sourceMatch = out.match(/^([^:]+):(\d+):/);
      expect(sourceMatch, `could not parse git check-ignore output: ${out}`).toBeTruthy();
      const sourcePath = sourceMatch![1];
      expect(
        sourcePath,
        `the rule should be sourced from apps/science-advantage/.gitignore, but was sourced from ${sourcePath}`,
      ).toMatch(/apps\/science-advantage\/\.gitignore$/);
    });
  });

  describe('§2 — No tracked `*.log` files under apps/science-advantage/', () => {
    /**
     * Per test-strategy.md: "git status --porcelain shows no tracked
     * *.log". The two untracked files (`gemini_design_update.log` and
     * `visual_refresh_track.log`) are not committed — but once the
     * `.gitignore` rule is added they must also NOT appear as
     * untracked (because they would be ignored). Pin the contract that
     * no `.log` is tracked (i.e. in the index) at the app root.
     */
    it('§2.1 — `git ls-files apps/science-advantage/*.log` returns 0 files', () => {
      const result = runCaptured('git', [
        'ls-files',
        'apps/science-advantage/*.log',
      ]);
      // git ls-files exits 0 with empty stdout when no files match.
      // A non-zero exit (e.g. 128) would indicate a git error, not
      // "no matches" — `git ls-files` is permissive on globs.
      const out = result.stdout.trim();
      expect(
        out,
        `expected no tracked *.log files under apps/science-advantage/; got: ${out}`,
      ).toBe('');
    });
  });

  describe('§3 — Hermeticity: probe file is cleaned up', () => {
    /**
     * The §1.2 test probes a non-existent path (so the file never has
     * to be created). Pin the hermeticity: the probe path must not
     * exist on disk, so subsequent test runs and CI runs are not
     * polluted by a leftover file.
     */
    it('§3.1 — probe path does not exist on disk', () => {
      const exists = fs.existsSync(PROBE_LOG);
      expect(
        exists,
        `probe path ${PROBE_LOG} must not exist (tests are hermetic)`,
      ).toBe(false);
    });
  });
});
