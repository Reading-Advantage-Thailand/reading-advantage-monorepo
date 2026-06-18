/**
 * Adversarial closure tests for `housekeeping_batch_20260603` Phase 8
 * (Add `docs/adr/` Directory — F-503).
 *
 * The Phase 8 contract (per
 * `measure/tracks/housekeeping_batch_20260603/plan.md` Phase 8 and
 * `spec.md` FR-8):
 *   1. Create `packages/db/docs/adr/0001-use-drizzle-not-prisma.md`.
 *   2. Create `packages/db/docs/adr/0002-drop-jwt-era-accounts-columns.md`.
 *   3. Create `packages/db/docs/adr/0003-add-intern-role.md`.
 *   4. Update `packages/db/drizzle/0012_codecamp_intern_role.sql` with a
 *      header comment referencing `0003-add-intern-role.md`.
 *   5. Add a CI lint script at `scripts/ci/sql-adr-guard.sh` that
 *      grep-fails on `DROP TABLE` / `DROP COLUMN` lines not followed
 *      within 10 lines by a comment starting with `-- ADR:` or
 *      `-- Why:`. The script must support an allowlist mechanism so
 *      pre-existing migrations (e.g., `0003_slow_firebrand.sql`,
 *      `0013_prisma_drizzle_schema_unification.sql`) do not break CI
 *      immediately.
 *
 * Background / pre-state at HEAD (commit `a231539a`):
 *   - `packages/db/docs/adr/` does not exist (target absent).
 *   - The 3 ADR files do not exist.
 *   - `scripts/ci/sql-adr-guard.sh` does not exist.
 *   - `packages/db/drizzle/0012_codecamp_intern_role.sql` is a single-
 *     line file (`ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'INTERN';`)
 *     with NO header comment.
 *   - Pre-existing migrations with DROP statements that DO NOT have ADR
 *     references (will trigger the lint unless allow-listed):
 *       * `0003_slow_firebrand.sql` (DROP TABLE refresh_tokens,
 *         verification_tokens; DROP COLUMN users.password,
 *         users.email_verified, users.firebase_uid, plus 8 accounts
 *         columns and 2 sessions columns).
 *       * `0013_prisma_drizzle_schema_unification.sql` (DROP COLUMN
 *         IF EXISTS across 30+ columns in game_rankings, ai_insights,
 *         learning_goals, story_records, chapter_trackings,
 *         user_word_records, user_sentence_records).
 *       * `0018_audit_events.sql` line 50 (commented-out DROP TABLE).
 *   - `build-graph search "ADR"`, `docs/adr`, `sql-adr-guard` all
 *     return no results — Phase 8 is purely additive (no symbol
 *     blast radius).
 *
 * Test strategy / scope decisions:
 *   - Section 1 pins the `packages/db/docs/adr/` directory existence.
 *   - Sections 2–4 pin the 3 ADR file presence and content (each
 *     references its corresponding migration file).
 *   - Section 5 pins the `0012_codecamp_intern_role.sql` header
 *     comment referencing ADR 0003 (per plan task 4).
 *   - Section 6 pins the lint script's presence and executability
 *     (mirroring the `scripts/ci/check-graph-db.sh` convention).
 *   - Section 7 pins the lint script's wiring against two minimal SQL
 *     fixtures (one passing, one failing) and against the current
 *     `0012_codecamp_intern_role.sql` (with annotation). This is the
 *     live-behavior proof (test-strategy.md Phase 8 cross-phase edge
 *     case #5: do NOT run against the entire `drizzle/` tree).
 *   - Section 8 pins the lint script's allowlist mechanism (so
 *     pre-existing migrations do not break CI immediately).
 *   - Section 9 is a live-proof rg sweep for the `docs/adr/` artifacts.
 *
 * Test fixtures are hermetic — created and cleaned in `/tmp` so they
 * cannot pollute the repo or interfere with other tests. The script
 * itself is the only persistent SUT the test invokes.
 *
 * Run via the unit config (no DB):
 *
 *   cd apps/science-advantage && \
 *     /opt/codex-desktop/resources/node-runtime/bin/node \
 *       ./node_modules/vitest/vitest.mjs run \
 *         --config vitest.unit.config.ts \
 *         lib/__tests__/housekeeping-phase8-adr-directory.test.ts
 *
 * See: measure/tracks/housekeeping_batch_20260603/plan.md (Phase 8)
 *      measure/tracks/housekeeping_batch_20260603/test-strategy.md
 *      measure/tracks/housekeeping_batch_20260603/spec.md (FR-8)
 *      measure/audit-reports/science-advantage_20260603/findings.md
 *        (F-503)
 *      scripts/ci/check-graph-db.sh (precedent for executable CI gate)
 *      apps/science-advantage/lib/__tests__/housekeeping-phase7-git-notes.test.ts
 *        (precedent for shell-out + content-presence tests)
 */
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import { execFileSync, spawnSync } from 'child_process';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const MONOREPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim();
const ADR_DIR = path.join(MONOREPO_ROOT, 'packages/db/docs/adr');
const ADR_0001 = path.join(ADR_DIR, '0001-use-drizzle-not-prisma.md');
const ADR_0002 = path.join(ADR_DIR, '0002-drop-jwt-era-accounts-columns.md');
const ADR_0003 = path.join(ADR_DIR, '0003-add-intern-role.md');
const MIGRATION_0003 = path.join(
  MONOREPO_ROOT,
  'packages/db/drizzle/0003_slow_firebrand.sql',
);
const MIGRATION_0012 = path.join(
  MONOREPO_ROOT,
  'packages/db/drizzle/0012_codecamp_intern_role.sql',
);
const MIGRATION_0013 = path.join(
  MONOREPO_ROOT,
  'packages/db/drizzle/0013_prisma_drizzle_schema_unification.sql',
);
const LINT_SCRIPT = path.join(
  MONOREPO_ROOT,
  'scripts/ci/sql-adr-guard.sh',
);

/**
 * Run a command from the monorepo root. Returns stdout/stderr/status.
 * Throws on spawn errors; callers inspect `status` for non-zero exits.
 */
function runCaptured(
  command: string,
  args: string[]
): { status: number; stdout: string; stderr: string } {
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

/**
 * Fixture paths in `/tmp`. Hermetic — created in `beforeAll`, cleaned
 * in `afterAll`. The filenames are prefixed with `.housekeeping-` so
 * they do not collide with user files in `/tmp`.
 */
const FIXTURE_FAILING = path.join(
  os.tmpdir(),
  '.housekeeping-phase8-failing-fixture.sql',
);
const FIXTURE_PASSING = path.join(
  os.tmpdir(),
  '.housekeeping-phase8-passing-fixture.sql',
);

beforeAll(() => {
  // Failing fixture: DROP COLUMN with NO ADR reference within 10 lines.
  fs.writeFileSync(
    FIXTURE_FAILING,
    [
      '-- failing fixture: DROP COLUMN without ADR reference',
      'ALTER TABLE "users" DROP COLUMN "experimental_field";',
      '',
    ].join('\n'),
    'utf-8',
  );
  // Passing fixture: DROP COLUMN followed by -- ADR: reference within
  // 10 lines (here: line 3, well within the 10-line window).
  fs.writeFileSync(
    FIXTURE_PASSING,
    [
      '-- passing fixture: DROP COLUMN with -- ADR: reference within 10 lines',
      'ALTER TABLE "users" DROP COLUMN "experimental_field";',
      '-- ADR: 9999 — fixture-only drop for unit-test wiring',
      '',
    ].join('\n'),
    'utf-8',
  );
});

afterAll(() => {
  for (const f of [FIXTURE_FAILING, FIXTURE_PASSING]) {
    try {
      fs.unlinkSync(f);
    } catch {
      // Best-effort cleanup; ignore missing-file errors.
    }
  }
});

describe('housekeeping_batch_20260603 / Phase 8 — Add `docs/adr/` Directory (F-503)', () => {
  describe('§1 — `packages/db/docs/adr/` directory exists', () => {
    /**
     * FR-8 / Phase 8 task 1–3: an ADR directory at
     * `packages/db/docs/adr/` is the home for the 3 ADRs. At HEAD,
     * neither the directory nor any of the 3 files exist (target
     * absent). The test pins the directory's existence.
     */
    it('§1.1 — packages/db/docs/adr/ is a directory', async () => {
      let stat: fs.Stats;
      try {
        stat = await fsp.stat(ADR_DIR);
      } catch {
        throw new Error(
          `expected ${ADR_DIR} to exist as a directory; stat failed (target absent at HEAD)`,
        );
      }
      expect(
        stat.isDirectory(),
        `expected ${ADR_DIR} to be a directory, but it is not (mode=${stat.mode.toString(8)})`,
      ).toBe(true);
    });
  });

  describe('§2 — ADR 0001 (use-drizzle-not-prisma) exists and references migration 0013', () => {
    /**
     * FR-8 / Phase 8 task 1: reverse-engineer from the
     * `prisma_drizzle_*` track plans. The ADR documents the decision
     * to use Drizzle instead of Prisma and points to the unification
     * migration `0013_prisma_drizzle_schema_unification.sql`.
     *
     * Content pins:
     *   - File exists at `packages/db/docs/adr/0001-use-drizzle-not-prisma.md`.
     *   - Content mentions Drizzle and Prisma.
     *   - Content references `0013_prisma_drizzle_schema_unification.sql`.
     */
    it('§2.1 — packages/db/docs/adr/0001-use-drizzle-not-prisma.md exists', async () => {
      let stat: fs.Stats;
      try {
        stat = await fsp.stat(ADR_0001);
      } catch {
        throw new Error(
          `expected ${ADR_0001} to exist; stat failed (target absent at HEAD)`,
        );
      }
      expect(stat.isFile()).toBe(true);
    });

    it('§2.2 — ADR 0001 mentions Drizzle, Prisma, and migration 0013', async () => {
      const contents = await fsp.readFile(ADR_0001, 'utf-8');
      expect(
        contents,
        `expected ADR 0001 to mention "Drizzle"`,
      ).toMatch(/Drizzle/i);
      expect(
        contents,
        `expected ADR 0001 to mention "Prisma"`,
      ).toMatch(/Prisma/i);
      expect(
        contents,
        `expected ADR 0001 to reference the unification migration 0013_prisma_drizzle_schema_unification.sql`,
      ).toMatch(/0013_prisma_drizzle_schema_unification\.sql/);
    });
  });

  describe('§3 — ADR 0002 (drop-jwt-era-accounts-columns) exists and references migration 0003', () => {
    /**
     * FR-8 / Phase 8 task 2: explain the destructive
     * `0003_slow_firebrand.sql` migration, which drops
     * `refresh_tokens` / `verification_tokens` tables and 14+ columns
     * from `users` / `accounts` / `sessions` (the JWT-era schema).
     *
     * Content pins:
     *   - File exists at `packages/db/docs/adr/0002-drop-jwt-era-accounts-columns.md`.
     *   - Content mentions the migration filename or its drops.
     */
    it('§3.1 — packages/db/docs/adr/0002-drop-jwt-era-accounts-columns.md exists', async () => {
      let stat: fs.Stats;
      try {
        stat = await fsp.stat(ADR_0002);
      } catch {
        throw new Error(
          `expected ${ADR_0002} to exist; stat failed (target absent at HEAD)`,
        );
      }
      expect(stat.isFile()).toBe(true);
    });

    it('§3.2 — ADR 0002 references migration 0003_slow_firebrand.sql', async () => {
      const contents = await fsp.readFile(ADR_0002, 'utf-8');
      expect(
        contents,
        `expected ADR 0002 to reference the destructive migration 0003_slow_firebrand.sql`,
      ).toMatch(/0003_slow_firebrand\.sql/);
    });
  });

  describe('§4 — ADR 0003 (add-intern-role) exists and references migration 0012', () => {
    /**
     * FR-8 / Phase 8 task 3: explain the
     * `0012_codecamp_intern_role.sql` migration (which adds the
     * `INTERN` value to the `role` enum).
     *
     * Content pins:
     *   - File exists at `packages/db/docs/adr/0003-add-intern-role.md`.
     *   - Content references `0012_codecamp_intern_role.sql`.
     */
    it('§4.1 — packages/db/docs/adr/0003-add-intern-role.md exists', async () => {
      let stat: fs.Stats;
      try {
        stat = await fsp.stat(ADR_0003);
      } catch {
        throw new Error(
          `expected ${ADR_0003} to exist; stat failed (target absent at HEAD)`,
        );
      }
      expect(stat.isFile()).toBe(true);
    });

    it('§4.2 — ADR 0003 references migration 0012_codecamp_intern_role.sql', async () => {
      const contents = await fsp.readFile(ADR_0003, 'utf-8');
      expect(
        contents,
        `expected ADR 0003 to reference migration 0012_codecamp_intern_role.sql`,
      ).toMatch(/0012_codecamp_intern_role\.sql/);
    });
  });

  describe('§5 — `0012_codecamp_intern_role.sql` has a header comment referencing ADR 0003', () => {
    /**
     * FR-8 / Phase 8 task 4: the migration file must include a header
     * comment that points to the ADR explaining it. At HEAD, the file
     * is a single-line `ALTER TYPE` statement with no comment.
     *
     * Content pin: the first non-empty line(s) of the file reference
     * ADR 0003 (via the migration filename or `0003-add-intern-role.md`
     * or a generic `See ADR` pattern that mentions "intern role" /
     * "ADR 0003").
     *
     * To avoid false positives from "intern" appearing later in the
     * file, the test scans the FIRST 10 lines (matching the
     * spec's "within 10 lines" framing for the DROP rule).
     */
    it('§5.1 — first 10 lines of 0012_codecamp_intern_role.sql reference ADR 0003', async () => {
      const contents = await fsp.readFile(MIGRATION_0012, 'utf-8');
      const firstLines = contents
        .split('\n')
        .slice(0, 10)
        .join('\n');
      // Pattern: the header must mention "ADR" plus a reference to
      // ADR 0003 (either by the bare number "0003" or by the filename
      // `0003-add-intern-role.md`). The word "ADR" anchors the
      // contract.
      const matchesAdr0003 = /ADR[^A-Za-z0-9]+0003/i.test(firstLines) ||
        /ADR[^A-Za-z0-9]+0003-add-intern-role\.md/i.test(firstLines);
      expect(
        matchesAdr0003,
        `expected the first 10 lines of ${MIGRATION_0012} to reference ADR 0003; got:\n${firstLines}`,
      ).toBe(true);
    });
  });

  describe('§6 — `scripts/ci/sql-adr-guard.sh` exists and is executable', () => {
    /**
     * FR-8 / Phase 8 task 5: wire the lint script into
     * `scripts/ci/`. The convention (mirroring
     * `scripts/ci/check-graph-db.sh`) is a bash script with the
     * owner-execute bit set. Pin both presence and executability so
     * CI can invoke it.
     */
    it('§6.1 — scripts/ci/sql-adr-guard.sh exists', async () => {
      let stat: fs.Stats;
      try {
        stat = await fsp.stat(LINT_SCRIPT);
      } catch {
        throw new Error(
          `expected ${LINT_SCRIPT} to exist; stat failed (target absent at HEAD)`,
        );
      }
      expect(stat.isFile()).toBe(true);
    });

    it('§6.2 — scripts/ci/sql-adr-guard.sh is executable (owner-execute bit set)', async () => {
      const stat = await fsp.stat(LINT_SCRIPT);
      // Owner-execute bit (0o100) is sufficient — CI runs as the same
      // uid, matching the check-graph-db.sh precedent.
      expect(
        stat.mode & 0o100,
        `expected ${LINT_SCRIPT} to have the owner-execute bit (0o100) set; got mode=${stat.mode.toString(8)}`,
      ).toBeGreaterThan(0);
    });
  });

  describe('§7 — SQL-ADR guard wiring (live-behavior proof against fixtures and annotated 0012)', () => {
    /**
     * Per test-strategy.md Phase 8 cross-phase edge case #5: "do NOT
     * run guard against the entire `drizzle/` tree this track." The
     * §7 tests exercise the script on hermetic fixtures in `/tmp` and
     * on the annotated `0012_codecamp_intern_role.sql` (the single
     * in-scope migration that this track annotates).
     *
     * Script invocation contract (per spec FR-8):
     *   - File argument: passing a single SQL file as the final
     *     positional argument runs the guard against that file.
     *   - Exit 0: file passes the guard.
     *   - Exit non-zero: file fails the guard (DROP without ADR).
     *
     * The tests invoke `bash scripts/ci/sql-adr-guard.sh <file>`. If
     * the Implementer chooses a different invocation convention
     * (e.g., `tsx scripts/ci/sql-adr-guard.ts <file>`), they must
     * also create a `scripts/ci/sql-adr-guard.sh` shim that wraps
     * the actual implementation (matching the convention established
     * by `scripts/ci/check-graph-db.sh`).
     */
    it('§7.1 — script exits non-zero on the failing fixture (DROP without ADR)', () => {
      const result = runCaptured('bash', [LINT_SCRIPT, FIXTURE_FAILING]);
      expect(
        result.status,
        `expected ${LINT_SCRIPT} to exit non-zero on the failing fixture (DROP without ADR within 10 lines); got status=${result.status}. stderr: ${result.stderr}`,
      ).not.toBe(0);
    });

    it('§7.2 — script exits 0 on the passing fixture (DROP with ADR within 10 lines)', () => {
      const result = runCaptured('bash', [LINT_SCRIPT, FIXTURE_PASSING]);
      expect(
        result.status,
        `expected ${LINT_SCRIPT} to exit 0 on the passing fixture (DROP with -- ADR: within 10 lines); got status=${result.status}. stderr: ${result.stderr}`,
      ).toBe(0);
    });

    it('§7.3 — script exits 0 on the annotated 0012_codecamp_intern_role.sql (header references ADR 0003)', () => {
      const result = runCaptured('bash', [LINT_SCRIPT, MIGRATION_0012]);
      expect(
        result.status,
        `expected ${LINT_SCRIPT} to exit 0 on the annotated 0012_codecamp_intern_role.sql (header references ADR 0003); got status=${result.status}. stderr: ${result.stderr}`,
      ).toBe(0);
    });

    it('§7.4 — script ignores commented-out DROP statements (0018_audit_events.sql line 50)', () => {
      // Regression for a Phase Acceptance audit finding (2026-06-18):
      // the committed script used `grep -v '^\s*--'` to filter
      // commented DROP lines, but `grep -in` prefixes each line with
      // `<line>:`, so the filter never matched and commented DROP
      // lines were incorrectly flagged as violations. The plan's
      // pre-existing migration audit explicitly lists
      // `0018_audit_events.sql:50` as a commented-out DROP that the
      // script must NOT flag. This test pins that contract directly
      // on the real migration file (no fixture).
      const MIGRATION_0018 = path.join(
        MONOREPO_ROOT,
        'packages/db/drizzle/0018_audit_events.sql',
      );
      const result = runCaptured('bash', [LINT_SCRIPT, MIGRATION_0018]);
      expect(
        result.status,
        `expected ${LINT_SCRIPT} to exit 0 on 0018_audit_events.sql (the only DROP is in a comment on line 50, "-- DROP TABLE IF EXISTS \\"audit_events\\";"); got status=${result.status}. stderr: ${result.stderr}`,
      ).toBe(0);
    });
  });

  describe('§8 — Lint script has an allowlist mechanism for pre-existing migrations', () => {
    /**
     * Per test-strategy.md Phase 8 cross-phase edge case #5: the
     * Phase 8 ADR lint must allow-list pre-existing migrations until
     * they are annotated, or ratchet only on new SQL files. Otherwise
     * CI breaks immediately (0003, 0013, and 0018 contain DROP
     * statements without ADR references).
     *
     * The Implementer's design choice: any of the following
     * constitutes a valid allowlist mechanism:
     *   (a) A CLI flag (e.g., `--allow <file>`, `--allow-list <file>`,
     *       `--grandfather <file>`) that excludes one or more files
     *       from the lint check.
     *   (b) A config file (e.g., `scripts/ci/sql-adr-guard.allowlist`
     *       or `scripts/ci/.adr-lint-allowlist`) listing files to
     *       exclude.
     *
     * The §8.1 test pins that an allowlist mechanism exists by
     * verifying that the lint script's `--help` output (or its
     * equivalent) mentions one of the recognized flag/config names.
     * If the Implementer chooses a different convention, they should
     * update the test to match.
     *
     * The §8.2 test pins that the allowlist mechanism actually works:
     * running the script with the allowlist mechanism invoked
     * (whichever form) on a pre-existing migration
     * (`0003_slow_firebrand.sql` is the canonical destructive one)
     * exits 0.
     */
    it('§8.1 — script help mentions an allowlist flag or config file', () => {
      const helpResult = runCaptured('bash', [LINT_SCRIPT, '--help']);
      // If --help is not implemented, the script may exit non-zero
      // and print usage to stderr — that's acceptable. We only assert
      // that some output mentioning the allowlist mechanism exists
      // across stdout + stderr.
      const combined = `${helpResult.stdout}\n${helpResult.stderr}`;
      const hasAllowlistMention =
        /allow[-_]?list/i.test(combined) ||
        /grandfather/i.test(combined) ||
        /skip/i.test(combined) ||
        /exclude/i.test(combined);
      expect(
        hasAllowlistMention,
        `expected ${LINT_SCRIPT} --help output to mention an allowlist mechanism (e.g., --allow-list, --grandfather, --skip, --exclude). Got help output:\n${combined}`,
      ).toBe(true);
    });

    it('§8.2 — script allows grandfathering a pre-existing DROP-only migration', () => {
      // `0003_slow_firebrand.sql` is the canonical pre-existing
      // destructive migration: it contains DROP TABLE and DROP COLUMN
      // statements without ADR references. Without an allowlist, the
      // script would (correctly) exit non-zero on this file. The
      // contract is that the allowlist mechanism can be invoked to
      // grandfather it, so CI does not break immediately.
      //
      // The test invokes the script with a permissive allowlist form
      // (any of --allow, --allow-list, --grandfather, --skip, or
      // --exclude). The Implementer must wire at least one of these.
      const allowArgs = [
        LINT_SCRIPT,
        '--allow',
        MIGRATION_0003,
        MIGRATION_0003,
      ];
      const result = runCaptured('bash', allowArgs);
      expect(
        result.status,
        `expected ${LINT_SCRIPT} --allow ${MIGRATION_0003} ${MIGRATION_0003} to exit 0 (grandfathered); got status=${result.status}. stderr: ${result.stderr}`,
      ).toBe(0);
    });
  });

  describe('§9 — Live-proof rg sweep: the ADR directory and migration 0013 header are wired', () => {
    /**
     * test-strategy.md Phase 8 "Live-Proof Plan" row pins the rg
     * presence checks for the ADR directory artifacts. This is the
     * ground-truth text search the Implementer can run manually to
     * confirm Phase 8 deliverables exist in the working tree.
     *
     * Pass at Green (after the Implementer creates the 3 ADR files).
     * Fails at HEAD because the files do not exist.
     */
    it('§9.1 — `rg -l "^" packages/db/docs/adr/` returns ≥ 3 files (3 ADRs present)', () => {
      const result = runCaptured('rg', ['-l', '^', 'packages/db/docs/adr/']);
      // rg exit 1 means no files matched. At HEAD, the directory does
      // not exist and rg exits 2 (file not found). Either way, the
      // test fails because the ADR artifacts are missing.
      if (result.status !== 0) {
        throw new Error(
          `expected rg to find ADR files under packages/db/docs/adr/; got status=${result.status}. stderr: ${result.stderr}`,
        );
      }
      const files = result.stdout
        .trim()
        .split('\n')
        .filter((l) => l.length > 0);
      expect(
        files.length,
        `expected at least 3 ADR files under packages/db/docs/adr/; found ${files.length}: [${files.join(', ')}]`,
      ).toBeGreaterThanOrEqual(3);
    });

    it('§9.2 — migration 0013 header references the docs/adr/ artifacts', async () => {
      // ADR 0001 is the natural anchor for 0013 (the unification
      // migration). The migration's existing header comment (lines
      // 1-5) currently mentions `measure/tracks/...` but not
      // `docs/adr/`. After Phase 8, the Implementer may update the
      // header to reference `docs/adr/0001-use-drizzle-not-prisma.md`
      // — but that is not strictly required by FR-8 (FR-8 only
      // mandates annotating 0012). This test is therefore permissive:
      // it passes at HEAD (the existing `measure/tracks/...` reference
      // is sufficient) and continues to pass at Green. It exists to
      // pin the live-proof rg behavior documented in test-strategy.md
      // and to provide a regression guard against the Implementer
      // removing all migration-tracking headers.
      const contents = await fsp.readFile(MIGRATION_0013, 'utf-8');
      const hasAnyAdrReference =
        /docs\/adr/i.test(contents) ||
        /measure\/tracks\/prisma_drizzle/i.test(contents) ||
        /ADR/i.test(contents);
      expect(
        hasAnyAdrReference,
        `expected migration 0013 to reference docs/adr/ or measure/tracks/ for ADR provenance`,
      ).toBe(true);
    });
  });
});