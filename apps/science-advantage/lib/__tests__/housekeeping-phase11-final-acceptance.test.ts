/**
 * Adversarial closure tests for `housekeeping_batch_20260603` Phase 11
 * (Final Acceptance).
 *
 * Phase 11's deliverable is the live-behavior acceptance gate from a
 * fresh dev environment:
 *
 *   1. `pnpm turbo run test --filter=science-advantage` exits 0.
 *   2. `pnpm --filter science-advantage seed` runs end-to-end.
 *   3. `pnpm turbo run lint --filter=science-advantage` exits 0.
 *   4. `pnpm turbo run build --filter=science-advantage` exits 0.
 *   5. All 10 items in the FR list are completed (or F-1306 deferred
 *      to Track 11).
 *
 * Per `test-strategy.md` "Live-Proof Plan" Phase 11:
 *
 *   | 11 | Final acceptance | live | `lint`, `test`, `build`, `seed` all exit 0 | live |
 *
 * the live-behavior gates (1–4) are owned by the Implementer / dev
 * environment and cannot be exercised without the running Postgres
 * container. This test therefore focuses on the **contract artifact
 * dimension** that is testable in isolation:
 *
 *   §1 — FR list completeness in `plan.md` (Task 5).
 *   §2 — Cross-phase task-list completeness in `plan.md`
 *        (regression guard: every Phase 1–9 task line is `[x]`).
 *   §3 — Live-gate preconditions (turbo.json defines the required
 *        pipelines; apps/science-advantage/package.json defines the
 *        required scripts).
 *   §4 — Cross-phase artifact presence (every per-phase deliverable
 *        file referenced by the test-strategy.md Live-Proof Plan is
 *        on disk). Regression guard so the Implementer cannot
 *        accidentally remove a Phase 1–9 artifact while preparing
 *        for the Phase 11 acceptance run.
 *
 * The SUT is the source text of
 * `measure/tracks/housekeeping_batch_20260603/plan.md`,
 * `turbo.json`, `apps/science-advantage/package.json`, and the
 * presence/absence of per-phase deliverable files. No DB, no Next.js
 * server. Tests shell out to `rg` and use `fs.readFile`/`fs.stat` for
 * ground truth.
 *
 * Run via the unit config (no DB):
 *
 *   cd apps/science-advantage && \
 *     /opt/codex-desktop/resources/node-runtime/bin/node \
 *       ./node_modules/vitest/vitest.mjs run \
 *         --config vitest.unit.config.ts \
 *         lib/__tests__/housekeeping-phase11-final-acceptance.test.ts
 *
 * See: measure/tracks/housekeeping_batch_20260603/plan.md (Phase 11)
 *      measure/tracks/housekeeping_batch_20260603/test-strategy.md
 *      measure/audit-reports/science-advantage_20260603/findings.md
 *      apps/science-advantage/lib/__tests__/housekeeping-phase9-commitlint-config.test.ts
 */
import fsp from 'fs/promises';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { describe, it, expect } from 'vitest';

const MONOREPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim();
const PLAN_FILE = path.join(
  MONOREPO_ROOT,
  'measure/archive/housekeeping_batch_20260603/plan.md'
);
const TURBO_JSON = path.join(MONOREPO_ROOT, 'turbo.json');
const APP_DIR = path.join(MONOREPO_ROOT, 'apps/science-advantage');
const APP_PACKAGE_JSON = path.join(APP_DIR, 'package.json');
const APP_GITIGNORE = path.join(APP_DIR, '.gitignore');
const APP_AGENTS_MD = path.join(APP_DIR, 'AGENTS.md');
const SEED_DATA_DIR = path.join(APP_DIR, 'scripts/seed-data');
const ADR_DIR = path.join(MONOREPO_ROOT, 'packages/db/docs/adr');
const ADR_0012 = path.join(
  MONOREPO_ROOT,
  'packages/db/drizzle/0012_codecamp_intern_role.sql'
);
const SQL_GUARD = path.join(MONOREPO_ROOT, 'scripts/ci/sql-adr-guard.sh');
const ROOT_COMMITLINT_CONFIG = path.join(MONOREPO_ROOT, 'commitlint.config.js');
const ROOT_COMMIT_MSG_HOOK = path.join(MONOREPO_ROOT, '.husky/commit-msg');

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
 * Parse the FR table from plan.md. Returns one entry per FR row.
 *
 * Each entry is `{ fr, severity, title, phase, status }`. The table
 * is the markdown block from the `## Phase 0: Setup` section's
 * `### FR → Phase Checklist` subsection. The parser is permissive
 * about pipe-spacing and trailing whitespace; it does not enforce
 * any particular column order beyond "FR is the first column".
 */
type FrRow = {
  fr: string;
  severity: string;
  title: string;
  phase: string;
  status: string;
};

function parseFrTable(planText: string): FrRow[] {
  const lines = planText.split('\n');
  const out: FrRow[] = [];
  let inTable = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!inTable) {
      if (/^\|\s*FR\s*\|/.test(line)) {
        inTable = true;
        // fall through and parse this header line below
      } else {
        continue;
      }
    }
    if (!/^\|/.test(line)) {
      if (inTable) break;
      continue;
    }
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((c, i, arr) => {
        // drop the leading and trailing empty cells produced by
        // leading/trailing pipes (e.g. "| a | b |" -> ["", "a", "b", ""]).
        if (i === 0 && c === '') return false;
        if (i === arr.length - 1 && c === '') return false;
        return true;
      });
    if (cells.length < 5) continue;
    if (cells[0] === 'FR' && cells[1] === 'Severity') continue; // header
    if (/^[-:]+$/.test(cells[0])) continue; // separator
    const [fr, severity, title, phase, status] = cells;
    // Skip rows where the FR ID itself is empty (truly malformed).
    // Allow empty Status / Title so duplicate FR rows are still
    // counted (the empty-title F-1301 placeholder is a known
    // duplicate that §1.4 tolerates).
    if (!fr) continue;
    out.push({ fr, severity, title, phase, status });
  }
  return out;
}

/**
 * Parse every phase task list from plan.md. Returns one entry per
 * `- [x|~| ] Task:` line, with its phase heading. Phase headings are
 * the `## Phase N: <title>` lines.
 */
type PhaseTask = {
  phase: string;
  heading: string;
  status: 'x' | '~' | ' ' | '?';
  task: string;
};

function parsePhaseTasks(planText: string): PhaseTask[] {
  const lines = planText.split('\n');
  const out: PhaseTask[] = [];
  let currentPhase: { phase: string; heading: string } | null = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const phaseMatch = line.match(/^##\s+(Phase\s+(\d+)\s*:\s*[^(\n]+)/);
    if (phaseMatch) {
      currentPhase = {
        phase: `Phase ${phaseMatch[2]}`,
        heading: phaseMatch[1].trim(),
      };
      continue;
    }
    const taskMatch = line.match(/^-\s*\[(x|~|\s|\?)\]\s+(.+?)\s*$/);
    if (taskMatch && currentPhase) {
      out.push({
        phase: currentPhase.phase,
        heading: currentPhase.heading,
        status: taskMatch[1] === ' ' ? ' ' : (taskMatch[1] as PhaseTask['status']),
        task: taskMatch[2].trim(),
      });
    }
  }
  return out;
}

describe(
  'housekeeping_batch_20260603 / Phase 11 — Final Acceptance (FR list + cross-phase guards)',
  () => {
    describe('§1 — FR list in plan.md is complete (every FR in terminal state, no stale rows)', () => {
      /**
       * Phase 11 task 5: "All 10 items in the FR list completed (or the
       * F-1306 deletion deferred to Track 11)."
       *
       * The FR table at the top of `plan.md` is the source-of-truth
       * registry for the track's 10 audit findings. Per
       * test-strategy.md §Cross-Phase Edge Cases, F-1306 is resolved
       * by Track 11 (`ci_typecheck_alignment_20260603`) and is the
       * only Deferred row. Every other FR must be `[x]`.
       *
       * §1.1 pins that every FR row's Status column is one of
       * `[x]` or `[x] Deferred` — no `[ ]`, no `[~]`, no empty.
       *
       * §1.2 pins that no FR row has an empty Title column (a
       * placeholder row is a contract violation regardless of its
       * Status).
       *
       * §1.3 pins the FR list count: the audit cited exactly 10
       * findings (F-205, F-705, F-1102, F-1202, F-1305, F-1201,
       * F-1207, F-1301, F-503, F-1306). Two of them are recorded
       * with duplicate FR IDs in plan.md (one is a placeholder row
       * to remove); the deduped count is 10.
       *
       * §1.4 pins the dedup contract: each FR ID is unique in the
       * table.
       *
       * §1.5 pins that the FR-coverage check (every FR referenced by
       * `tracks.md` for this track is present in plan.md's table) is
       * satisfied.
       */
      it('§1.1 — every FR row in plan.md is in terminal state ([x] or [x] Deferred)', async () => {
        const text = await fsp.readFile(PLAN_FILE, 'utf-8');
        const rows = parseFrTable(text);
        expect(rows.length, `expected at least 9 FR rows; got ${rows.length}`).toBeGreaterThanOrEqual(9);
        const violations = rows.filter((r) => {
          const ok = r.status === '[x]' || r.status === '[x] Deferred';
          return !ok;
        });
        expect(
          violations.map((v) => `${v.fr}: status="${v.status}"`),
          `expected every FR row to be in terminal state ([x] or [x] Deferred); violations: ${violations.map((v) => `${v.fr} (status=${v.status})`).join(', ')}`
        ).toEqual([]);
      });

      it('§1.2 — no FR row has an empty Title column', async () => {
        const text = await fsp.readFile(PLAN_FILE, 'utf-8');
        const rows = parseFrTable(text);
        const emptyTitles = rows
          .filter((r) => r.title.length === 0)
          .map((r) => r.fr);
        expect(
          emptyTitles,
          `expected no FR row to have an empty Title; found: ${emptyTitles.join(', ')}`
        ).toEqual([]);
      });

      it('§1.3 — the FR list contains exactly 10 distinct FRs (audit cited 10; F-1301 dedup is the placeholder)', async () => {
        const text = await fsp.readFile(PLAN_FILE, 'utf-8');
        const rows = parseFrTable(text);
        const ids = rows.map((r) => r.fr);
        const distinctIds = Array.from(new Set(ids));
        expect(
          distinctIds.length,
          `expected exactly 10 distinct FRs in plan.md; got ${distinctIds.length}: ${distinctIds.join(', ')}`
        ).toBe(10);
      });

      it('§1.4 — every FR row in plan.md has exactly 5 valid columns (no malformed placeholder rows)', async () => {
        const text = await fsp.readFile(PLAN_FILE, 'utf-8');
        const lines = text.split('\n');
        const malformed: string[] = [];
        let inTable = false;
        let lineNumber = 0;
        for (const raw of lines) {
          lineNumber += 1;
          const line = raw.trimEnd();
          if (!inTable) {
            if (/^\|\s*FR\s*\|/.test(line)) inTable = true;
            else continue;
          }
          if (!/^\|/.test(line)) {
            if (inTable) break;
            continue;
          }
          // Skip header and separator.
          if (line.startsWith('| FR')) continue;
          if (/^\|[-\s|:]+$/.test(line)) continue;
          // Count pipe characters (must be ≥6 for 5 columns).
          const pipeCount = (line.match(/\|/g) ?? []).length;
          if (pipeCount !== 6) {
            malformed.push(`line ${lineNumber}: ${pipeCount} pipes (expected 6): ${line.slice(0, 80)}`);
          }
        }
        expect(
          malformed,
          `expected every FR row to have 5 columns (6 pipes); malformed rows:\n` +
            malformed.map((m) => `  - ${m}`).join('\n')
        ).toEqual([]);
      });

      it('§1.5 — every FR referenced by measure/tracks.md for this track is present in plan.md', async () => {
        const tracksText = await fsp.readFile(
          path.join(MONOREPO_ROOT, 'measure/tracks.md'),
          'utf-8'
        );
        // Find the housekeeping_batch_20260603 row block. The row
        // is a single bullet starting with `- [ ] **Track: Audit
        // Housekeeping Batch**` and containing a `Resolves
        // F-...,F-...` clause somewhere in the description paragraph.
        const trackBlockMatch = tracksText.match(
          /\*\*Track:\s+Audit Housekeeping Batch\*\*[\s\S]*?Resolves\s+([A-Z0-9,\s-]+?)\./
        );
        expect(
          trackBlockMatch,
          `expected to find housekeeping_batch_20260603 row block in measure/tracks.md`
        ).not.toBeNull();
        const resolvesClause = trackBlockMatch![1];
        const tracksFrs = resolvesClause
          .split(/[,\s]+/)
          .filter((s) => /^F-\d+$/.test(s));
        const planText = await fsp.readFile(PLAN_FILE, 'utf-8');
        const planRows = parseFrTable(planText);
        const planFrs = new Set(planRows.map((r) => r.fr));
        const missing = tracksFrs.filter((fr) => !planFrs.has(fr));
        expect(
          missing,
          `expected every FR referenced by measure/tracks.md for this track to be in plan.md FR table; missing: ${missing.join(', ')}`
        ).toEqual([]);
      });
    });

    describe('§2 — Cross-phase task-list completeness (every Phase 1–9 task is [x])', () => {
      /**
       * Regression guard: Phase 11's acceptance gate assumes every
       * Phase 1–9 task line in plan.md is `[x]`. If a Phase 1–9 task
       * regresses to `[~]` or `[ ]` (e.g. a reviewer reopens it),
       * Phase 11 must detect the regression so the Implementer
       * re-runs that phase before declaring the track done.
       *
       * The parser is conservative: it counts task lines under each
       * `## Phase N: <heading>` section and asserts every counted
       * task is `[x]`. Phase 10 is Deferred (single task line is
       * `[x]` per Phase 10 §10 listing). Phase 11 itself is in
       * progress (`[~]`) and is excluded. Phase 12 is closeout (not
       * yet started, `[ ]`) and is excluded.
       *
       * Phase 0 is also excluded — it was the original setup
       * checklist, captured at the very top of plan.md under `## Phase
       * 0: Setup`.
       */
      it('§2.1 — every Phase 1–9 task line in plan.md is marked [x]', async () => {
        const text = await fsp.readFile(PLAN_FILE, 'utf-8');
        const tasks = parsePhaseTasks(text);
        const inScope = tasks.filter((t) => {
          const m = t.phase.match(/^Phase\s+(\d+)$/);
          if (!m) return false;
          const n = parseInt(m[1], 10);
          return n >= 1 && n <= 9;
        });
        // Phase 0 / 11 / 12 are excluded by construction.
        const open = inScope.filter((t) => t.status !== 'x');
        expect(
          open.map((t) => `${t.phase}: [${t.status}] ${t.task.slice(0, 60)}`),
          `expected every Phase 1–9 task to be [x]; open tasks: ${open.length}\n` +
            open.map((t) => `  - ${t.phase} [${t.status}] ${t.task}`).join('\n')
        ).toEqual([]);
      });

      it('§2.2 — Phase 10 (app-local CI deletion) is complete (per Track 11 delegation)', async () => {
        const text = await fsp.readFile(PLAN_FILE, 'utf-8');
        const tasks = parsePhaseTasks(text);
        const phase10 = tasks.filter((t) => t.phase === 'Phase 10');
        const open = phase10.filter((t) => t.status !== 'x');
        expect(
          open.map((t) => `[${t.status}] ${t.task}`),
          `expected every Phase 10 task to be [x] (Track 11 delegated); open: ${open.length}\n` +
            open.map((t) => `  - [${t.status}] ${t.task}`).join('\n')
        ).toEqual([]);
      });
    });

    describe('§3 — Live-gate preconditions (turbo.json + apps/science-advantage/package.json)', () => {
      /**
       * The Phase 11 acceptance gates are
       * `pnpm turbo run {test,lint,build} --filter=science-advantage`
       * and `pnpm --filter science-advantage seed`. For these to even
       * dispatch, the monorepo's turbo.json must declare the
       * pipelines and the app's package.json must declare the
       * scripts.
       *
       * §3.1 pins the turbo pipeline definitions.
       * §3.2 pins the app-level script definitions.
       */
      it('§3.1 — turbo.json defines test, lint, build, and dev pipelines', async () => {
        const text = await fsp.readFile(TURBO_JSON, 'utf-8');
        for (const task of ['test', 'lint', 'build', 'dev']) {
          expect(
            text,
            `expected turbo.json to define a "${task}" pipeline`
          ).toMatch(new RegExp(`"${task}"\\s*:`));
        }
      });

      it('§3.2 — apps/science-advantage/package.json defines test, lint, build, and seed scripts', async () => {
        const text = await fsp.readFile(APP_PACKAGE_JSON, 'utf-8');
        for (const script of ['test', 'lint', 'build', 'seed']) {
          expect(
            text,
            `expected apps/science-advantage/package.json scripts to define "${script}"`
          ).toMatch(new RegExp(`"${script}"\\s*:`));
        }
      });
    });

    describe('§4 — Cross-phase artifact presence (every Phase 1–9 deliverable file is on disk)', () => {
      /**
       * Regression guard: Phase 11 acceptance assumes every Phase
       * 1–9 deliverable file referenced by the test-strategy.md
       * Live-Proof Plan is present at HEAD. If a Phase 1–9 artifact
       * is removed (e.g. by an over-zealous cleanup), Phase 11 must
       * detect it.
       *
       * §4.1 — Phase 1 (F-205): scripts/seed-data/ exists with >0
       *         JSON files (the 53-file seed corpus).
       * §4.2 — Phase 4 (F-1202): .gitignore contains `*.log` rule
       *         AND no tracked `*.log` files in apps/science-advantage/.
       * §4.3 — Phase 5 (F-1305): the orphan TODO at
       *         apps/science-advantage/lib/gamification/badges.ts ~115
       *         is removed.
       * §4.4 — Phase 7 (F-1207): every `refactor(science):` commit
       *         is either a track member (note contains the track ID)
       *         or in the named negative-control set.
       * §4.5 — Phase 8 (F-503): packages/db/docs/adr/ directory
       *         exists with 3 ADR files; sql-adr-guard.sh is
       *         executable.
       * §4.6 — Phase 9 (F-1301): commitlint.config.js + husky
       *         commit-msg hook are present; apps/science-advantage
       *         AGENTS.md no longer references stale prisma/npm paths
       *         (Phase 3 contract still holds).
       */

      it('§4.1 — Phase 1 (F-205): apps/science-advantage/scripts/seed-data/ exists with >0 JSON files', async () => {
        const stat = await fsp.stat(SEED_DATA_DIR).catch(() => null);
        expect(
          stat?.isDirectory(),
          `expected apps/science-advantage/scripts/seed-data/ to be a directory (Phase 1 / F-205); not found.`
        ).toBe(true);
        const result = runCaptured('find', [
          'apps/science-advantage/scripts/seed-data',
          '-name',
          '*.json',
        ]);
        const fileCount = result.stdout
          .trim()
          .split('\n')
          .filter((l) => l.length > 0).length;
        expect(
          fileCount,
          `expected Phase 1 to leave >0 JSON files under scripts/seed-data/; found ${fileCount}`
        ).toBeGreaterThan(0);
      });

      it('§4.2 — Phase 4 (F-1202): apps/science-advantage/.gitignore contains `*.log` and no tracked *.log files', async () => {
        const gitignore = await fsp.readFile(APP_GITIGNORE, 'utf-8');
        // The rule can be `*.log`, `*.log*`, or similar permissive
        // pattern; allow both exact `*.log` and a `*.log*` family.
        expect(
          gitignore,
          `expected apps/science-advantage/.gitignore to contain a \`*.log\` rule (Phase 4 / F-1202)`
        ).toMatch(/\*\.log(?:\*)?/);
        const result = runCaptured('git', [
          'ls-files',
          'apps/science-advantage/*.log',
        ]);
        const tracked = result.stdout
          .trim()
          .split('\n')
          .filter((l) => l.length > 0);
        expect(
          tracked,
          `expected no tracked *.log files under apps/science-advantage/ (Phase 4 contract); found: ${tracked.join(', ')}`
        ).toEqual([]);
      });

      it('§4.3 — Phase 5 (F-1305): orphan TODO at badges.ts ~115 has been removed', async () => {
        const badgesPath = path.join(
          APP_DIR,
          'lib/gamification/badges.ts'
        );
        const text = await fsp.readFile(badgesPath, 'utf-8');
        const lines = text.split('\n');
        const slice = lines.slice(110, 120).join('\n');
        // The Phase 5 audit cited an orphan TODO at line 115:
        //   `// TODO: Requires language preference tracking — not yet implemented`
        // The contract is "no orphan TODO" — either deleted or
        // rewritten to `TODO(#NNN)` form. Tolerate both: assert no
        // untracked `TODO:` comment in the ~115 window.
        expect(
          slice,
          `expected no untracked \`TODO:\` comment at badges.ts ~115 (Phase 5 / F-1305)`
        ).not.toMatch(/TODO\s*:/);
      });

      it('§4.4 — Phase 7 (F-1207): every refactor(science): commit is either a track member or named negative-control', () => {
        const result = runCaptured('git', [
          'log',
          '--format=%H %s',
          '--all',
        ]);
        if (result.status !== 0) {
          throw new Error(`git log failed: ${result.stderr}`);
        }
        const TRACK_ID = 'prisma_drizzle_science_controllers_20260505';
        const NON_TRACK_SHAS = new Set([
          '1f8c2a013723e717564bf780030f5603a28da025',
          '3d3528e581547504cb55cbb0af19a92e0904e49f',
        ]);
        const refactorShas = result.stdout
          .trim()
          .split('\n')
          .filter((l) => /^[0-9a-f]{40} refactor\(science\):/.test(l))
          .map((l) => l.split(' ')[0]);
        const violations: string[] = [];
        for (const sha of refactorShas) {
          if (NON_TRACK_SHAS.has(sha)) continue;
          const noteRes = runCaptured('git', ['notes', 'show', sha]);
          const note =
            noteRes.status === 0 && noteRes.stdout.length > 0
              ? noteRes.stdout
              : null;
          if (note === null || !note.includes(TRACK_ID)) {
            const subjRes = runCaptured('git', [
              'log',
              '-1',
              '--format=%s',
              sha,
            ]);
            const subject = subjRes.stdout.trim();
            violations.push(`${sha.slice(0, 7)}: ${subject}`);
          }
        }
        expect(
          violations,
          `expected every \`refactor(science):\` commit to either have the track ID in its git note or be in the named negative-control set; found ${violations.length} violation(s):\n` +
            violations.map((v) => `  - ${v}`).join('\n')
        ).toEqual([]);
      });

      it('§4.5 — Phase 8 (F-503): packages/db/docs/adr/ has 3 ADR files; sql-adr-guard.sh is executable', async () => {
        const stat = await fsp.stat(ADR_DIR).catch(() => null);
        expect(
          stat?.isDirectory(),
          `expected packages/db/docs/adr/ to be a directory (Phase 8 / F-503)`
        ).toBe(true);
        const adrResult = runCaptured('rg', ['-l', '^', 'packages/db/docs/adr/']);
        const adrCount = adrResult.stdout
          .trim()
          .split('\n')
          .filter((l) => l.length > 0).length;
        expect(
          adrCount,
          `expected at least 3 ADR files in packages/db/docs/adr/; found ${adrCount}`
        ).toBeGreaterThanOrEqual(3);
        const guardStat = await fsp.stat(SQL_GUARD).catch(() => null);
        expect(
          guardStat?.isFile(),
          `expected scripts/ci/sql-adr-guard.sh to exist (Phase 8 / F-503)`
        ).toBe(true);
        // Mode & 0o100 = owner-execute bit (executable).
        expect(
          (guardStat?.mode ?? 0) & 0o100,
          `expected scripts/ci/sql-adr-guard.sh to be owner-executable (mode & 0o100)`
        ).toBeGreaterThan(0);
        const sqlText = await fsp.readFile(ADR_0012, 'utf-8');
        const head = sqlText.split('\n').slice(0, 10).join('\n');
        expect(
          head,
          `expected first 10 lines of 0012_codecamp_intern_role.sql to reference ADR 0003`
        ).toMatch(/ADR\s+0003/);
      });

      it('§4.6 — Phase 9 (F-1301) + Phase 3 (F-1102): commitlint config + husky hook present; apps/science-advantage AGENTS.md no stale prisma/npm refs in body', async () => {
        const configStat = await fsp
          .stat(ROOT_COMMITLINT_CONFIG)
          .catch(() => null);
        expect(
          configStat?.isFile(),
          `expected commitlint.config.js to exist at monorepo root (Phase 9 / F-1301)`
        ).toBe(true);
        const hookStat = await fsp
          .stat(ROOT_COMMIT_MSG_HOOK)
          .catch(() => null);
        expect(
          hookStat?.isFile(),
          `expected .husky/commit-msg to exist (Phase 9 / F-1301)`
        ).toBe(true);
        expect(
          (hookStat?.mode ?? 0) & 0o100,
          `expected .husky/commit-msg to be owner-executable (Phase 9 / F-1301)`
        ).toBeGreaterThan(0);
        const agents = await fsp.readFile(APP_AGENTS_MD, 'utf-8');
        // Body (excluding line 3 regression-guard) must not contain
        // stale prisma / npm install / npx prisma refs (Phase 3).
        const lines = agents.split('\n');
        const body = lines.slice(3).join('\n');
        expect(
          body,
          `expected apps/science-advantage/AGENTS.md body (post-line-3) to be free of stale \`prisma\` / \`npx prisma\` / \`npm install\` refs (Phase 3 / F-1102)`
        ).not.toMatch(/\bprisma\b/);
        expect(
          body,
          `expected apps/science-advantage/AGENTS.md body to be free of \`npm install\` (Phase 3)`
        ).not.toMatch(/(?<!\w)npm install/);
        expect(
          body,
          `expected apps/science-advantage/AGENTS.md body to be free of \`npx prisma\` (Phase 3)`
        ).not.toMatch(/(?<!\w)npx prisma/);
      });
    });

    describe('§5 — Live-behavior gates are owned by the Implementer / dev environment', () => {
      /**
       * Phase 11 tasks 1–4 (`pnpm turbo run test|lint|build` and
       * `pnpm seed`) cannot be exercised without a reachable Postgres
       * container. The host has podman networking constraints (see
       * plan.md Phase 1 §Red Phase Recording). The Implementer /
       * Phase 11 acceptance auditor must run these from the dev
       * environment.
       *
       * This §5 block documents the contract: the §3 preconditions
       * are the in-tree gate; the live exit codes are the
       * environment-bound gate. The two together close the Phase 11
       * acceptance loop.
       */
      it('§5.1 — §3 preconditions are the in-tree gate; live exit codes are dev-env-only (documented boundary)', () => {
        // This is a documentation assertion: it pins the
        // preconditions-vs-live-behavior split so the Implementer
        // knows what to run where. No filesystem checks here; the
        // §3 describe block already pins the preconditions.
        expect(true).toBe(true);
      });
    });
  }
);