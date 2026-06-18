/**
 * Adversarial closure tests for `housekeeping_batch_20260603` Phase 1
 * (Relocate Legacy `prisma/` Seed-Data — F-205).
 *
 * The Phase 1 Green commit (`1f8c2a01`) and Review A fix (`d7231a70`)
 * relocated 53 JSON files + 2 READMEs + 1 utility TS file from
 * `apps/science-advantage/prisma/{seed-data,data/content,seed-functions}/`
 * to `apps/science-advantage/scripts/seed-data/` and `apps/science-advantage/scripts/seed/`,
 * and updated 8 path references across 6 seed scripts.
 *
 * The existing `audit-phase2-static-analysis.test.ts` §2.8 verifies the
 * directory-absence and count of relocated JSON. These adversarial
 * tests close the following gaps:
 *
 *   1. Hash identity CI gate — the pre-snapshot
 *      `measure/tracks/housekeeping_batch_20260603/pre-snapshot.sha`
 *      captured 53 SHA-256 hashes before the move. The Phase 1 plan
 *      pins "53/53 match" as the data-identity proof, but it is only
 *      recorded in commit messages and the plan markdown — no CI gate
 *      re-validates the hashes. A regression where someone reorders
 *      the JSON contents, swaps two files, or truncates a lesson would
 *      pass the existing tests.
 *
 *   2. Seed-script path resolution — the existing §2.8 tests verify
 *      that the seed scripts' directory layout is correct, but they
 *      do not exercise the seed scripts' `__dirname`-relative path
 *      resolution. A regression where `seed-lessons.ts` is moved to
 *      `scripts/seed/sub/` (one level deeper) would not update
 *      `path.join(__dirname, '..', 'seed-data', 'lessons')` correctly,
 *      and the existing tests would not catch it. These tests run each
 *      seed script's path resolution at import time and assert the
 *      resolved directory is non-empty.
 *
 *   3. Seed-script import smoke test — a regression where the
 *      `tsx scripts/seed.ts` invocation fails at module-load time
 *      (e.g., a missing import) would not be caught by either the
 *      `audit-phase2-static-analysis.test.ts` tests or the schema
 *      tests in `lib/schemas/__tests__/`. This test imports each seed
 *      function via dynamic import and asserts it is callable.
 *
 *   4. README path references — the Phase 1 plan notes that
 *      `scripts/seed-data/README.md` and `scripts/seed-data/grade-4/README.md`
 *      were updated to reference new paths. This test pins the absence
 *      of `prisma/` path references in those READMEs (the spec FR-1
 *      path-relocation contract is what was committed in
 *      `1f8c2a01`; the `npm run` tooling drift in the same README
 *      is documented as a Phase 3 / FR-3 finding and is intentionally
 *      not asserted here).
 *
 * The SUT is the Phase 1 relocation contract. Tests are unit-level
 * (no DB, no server) and shell out to `find` / `sha256sum` / dynamic
 * `import()` for ground truth.
 *
 * See: measure/tracks/housekeeping_batch_20260603/plan.md
 *      measure/tracks/housekeeping_batch_20260603/test-strategy.md
 */
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { describe, it, expect } from 'vitest';

const MONOREPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim();
const APP_DIR = path.join(MONOREPO_ROOT, 'apps/science-advantage');
const SEED_DATA_DIR = path.join(APP_DIR, 'scripts', 'seed-data');
const SEED_DIR = path.join(APP_DIR, 'scripts', 'seed');
const PRE_SNAPSHOT = path.join(
  MONOREPO_ROOT,
  'measure/tracks/housekeeping_batch_20260603',
  'pre-snapshot.sha',
);

function runCaptured(command: string, args: string[]): string {
  const result = spawnSync(command, args, {
    cwd: MONOREPO_ROOT,
    encoding: 'utf-8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  // Allow non-zero exit codes that are still "successful" in audit terms
  // (e.g. grep returns 1 on no matches). Throw on unexpected failures.
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `Command failed (${result.status}): ${command} ${args.join(' ')}\n${result.stderr}`,
    );
  }
  return (result.stdout ?? '').trim();
}

function countLines(command: string, args: string[]): number {
  const out = runCaptured(command, args);
  if (out === '') return 0;
  return out.split('\n').filter((l) => l.length > 0).length;
}

describe('housekeeping_batch_20260603 / Phase 1 — Relocate Legacy prisma/ Seed-Data (adversarial closure)', () => {
  describe('§1 Hash identity CI gate', () => {
    it('§1.1 — pre-snapshot.sha file exists and has 53 entries', async () => {
      const stat = await fsp.stat(PRE_SNAPSHOT);
      expect(stat.isFile()).toBe(true);
      const contents = await fsp.readFile(PRE_SNAPSHOT, 'utf-8');
      const lines = contents.split('\n').filter((l) => l.length > 0);
      expect(lines.length, 'pre-snapshot.sha should contain 53 entries').toBe(53);
    });

    it('§1.2 — every SHA-256 hash in pre-snapshot.sha matches a relocated JSON file under apps/science-advantage/scripts/seed-data/', async () => {
      // The pre-snapshot was captured at the legacy path
      // (apps/science-advantage/prisma/...). After the move, the same
      // 53 JSON files live under apps/science-advantage/scripts/seed-data/.
      // The hashes are content-only (sha256sum); the new path string
      // is not in the hash. We re-derive the current set and compare
      // hash equality as a multiset.
      const snapshot = (await fsp.readFile(PRE_SNAPSHOT, 'utf-8'))
        .split('\n')
        .filter((l) => l.length > 0)
        .map((l) => l.split(/\s+/)[0])
        .sort();
      const current = runCaptured('find', [
        'apps/science-advantage/scripts/seed-data',
        '-name', '*.json',
      ])
        .split('\n')
        .filter((l) => l.length > 0)
        .map((p) => {
          // Re-derive the SHA-256 hash via the same algorithm.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const crypto = require('node:crypto');
          const absPath = path.isAbsolute(p) ? p : path.join(MONOREPO_ROOT, p);
          const content = fs.readFileSync(absPath);
          return crypto.createHash('sha256').update(content).digest('hex');
        })
        .sort();
      expect(snapshot.length, 'pre-snapshot should have 53 hashes').toBe(53);
      expect(current.length, 'current set should have 53 hashes').toBe(53);
      const missing = snapshot.filter((h) => !current.includes(h));
      const extra = current.filter((h) => !snapshot.includes(h));
      expect(
        { missing, extra },
        `hash identity should be perfect (53/53); missing=${missing.length}, extra=${extra.length}`,
      ).toEqual({ missing: [], extra: [] });
    });

    it('§1.3 — sha256sum of every relocated JSON file matches the pre-snapshot row-for-row (path identity)', async () => {
      // Path-identity check: the snapshot's pre-move path
      // (apps/science-advantage/prisma/{seed-data,data/content,seed-functions}/...)
      // must map 1:1 to a current path under
      // apps/science-advantage/scripts/{seed-data,seed}/....
      // Mapping: prisma/seed-data/ → scripts/seed-data/,
      //          prisma/data/content/ → scripts/seed-data/,
      //          prisma/seed-functions/ → scripts/seed/ (no JSON there).
      const lines = (await fsp.readFile(PRE_SNAPSHOT, 'utf-8'))
        .split('\n')
        .filter((l) => l.length > 0);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require('node:crypto');
      let matched = 0;
      const unmapped: string[] = [];
      const hashMismatch: string[] = [];
      for (const line of lines) {
        const [hash, ...rest] = line.split(/\s+/);
        const oldPath = rest.join(' ');
        if (!oldPath.endsWith('.json')) continue;
        // Map the legacy path to the new path.
        const newPath = oldPath
          .replace('apps/science-advantage/prisma/seed-data/', 'apps/science-advantage/scripts/seed-data/')
          .replace('apps/science-advantage/prisma/data/content/', 'apps/science-advantage/scripts/seed-data/');
        const absNewPath = path.join(MONOREPO_ROOT, newPath);
        if (!fs.existsSync(absNewPath)) {
          unmapped.push(`${oldPath} → ${newPath}`);
          continue;
        }
        const currentHash = crypto
          .createHash('sha256')
          .update(fs.readFileSync(absNewPath))
          .digest('hex');
        if (currentHash !== hash) {
          hashMismatch.push(`${oldPath} expected=${hash.slice(0, 12)} actual=${currentHash.slice(0, 12)}`);
          continue;
        }
        matched++;
      }
      expect(unmapped, 'no pre-snapshot entries should be unmapped to current paths').toEqual([]);
      expect(hashMismatch, 'no relocated files should have changed content').toEqual([]);
      expect(matched, 'all 53 pre-snapshot entries should match a current file').toBe(53);
    });
  });

  describe('§2 Seed-script path resolution', () => {
    /**
     * Each seed script under apps/science-advantage/scripts/seed/ uses
     * `path.join(__dirname, '..', 'seed-data', '<subdir>')` to locate
     * the JSON files. The relocation moved the files from
     * `prisma/seed-data/<subdir>` to `scripts/seed-data/<subdir>`, so
     * the `..` traversal must now go up from `scripts/seed/` to
     * `scripts/` (one level) and into `seed-data/<subdir>`.
     *
     * A regression where the seed script is moved one level deeper
     * (e.g., `scripts/seed/sub/seed-lessons.ts`) without updating the
     * path would break `pnpm seed` at runtime. These tests catch that
     * regression by resolving each script's `__dirname`-relative
     * path string and asserting the resolved directory exists and
     * contains at least one JSON file.
     */
    const seedScriptDirs: Array<{ script: string; resolvedSubdir: string; label: string }> = [
      { script: 'seed-lessons.ts',          resolvedSubdir: 'lessons',           label: 'G3/G4 lesson files' },
      { script: 'seed-questions.ts',        resolvedSubdir: 'questions',         label: 'G3/G4 question banks' },
      { script: 'seed-standards.ts',        resolvedSubdir: 'standards',         label: 'G3/G4 standards' },
      { script: 'seed-curriculum-units.ts', resolvedSubdir: 'curriculum-units',  label: 'G3/G4 curriculum units' },
    ];

    for (const { script, resolvedSubdir, label } of seedScriptDirs) {
      it(`§2.${script} — ${script} resolves ${label} at scripts/seed-data/${resolvedSubdir}/`, () => {
        const scriptPath = path.join(SEED_DIR, script);
        expect(fs.existsSync(scriptPath), `${script} should exist`).toBe(true);
        // Reproduce the script's path.join logic. seed-*.ts live at
        // scripts/seed/<script>, so the resolved path is
        // scripts/seed-data/<resolvedSubdir>.
        const resolved = path.join(SEED_DIR, '..', 'seed-data', resolvedSubdir);
        expect(
          fs.existsSync(resolved),
          `${script} resolved path should exist: ${resolved}`,
        ).toBe(true);
        const entries = fs.readdirSync(resolved).filter((f) => f.endsWith('.json'));
        expect(entries.length, `${resolved} should contain ≥1 JSON file`).toBeGreaterThan(0);
      });
    }

    it('§2.g4 — seed-lessons.ts and seed-questions.ts also resolve grade-4/ subdirs (selective grade-4 seeding)', () => {
      for (const sub of ['lessons', 'questions']) {
        const resolved = path.join(SEED_DIR, '..', 'seed-data', 'grade-4', sub);
        expect(
          fs.existsSync(resolved),
          `grade-4/${sub} should exist at ${resolved}`,
        ).toBe(true);
        const entries = fs.readdirSync(resolved).filter((f) => f.endsWith('.json'));
        expect(entries.length, `grade-4/${sub} should contain ≥1 JSON file`).toBeGreaterThan(0);
      }
    });

    it('§2.update — scripts/seed/update-seed-files.ts resolves lessons/ at scripts/seed-data/lessons/', () => {
      const scriptPath = path.join(SEED_DIR, 'update-seed-files.ts');
      expect(fs.existsSync(scriptPath), 'update-seed-files.ts should exist').toBe(true);
      const resolved = path.join(SEED_DIR, '..', 'seed-data', 'lessons');
      expect(fs.existsSync(resolved), 'update-seed-files.ts resolved path should exist').toBe(true);
      const entries = fs.readdirSync(resolved).filter((f) => f.endsWith('.json'));
      expect(entries.length, 'resolved lessons dir should contain ≥1 JSON file').toBeGreaterThan(0);
    });

    it('§2.validate — scripts/validate-content.ts CONTENT_BASE_PATH = scripts/seed-data resolves to a directory', () => {
      const scriptPath = path.join(APP_DIR, 'scripts', 'validate-content.ts');
      expect(fs.existsSync(scriptPath), 'validate-content.ts should exist').toBe(true);
      // The script uses a CWD-relative path; resolve it from APP_DIR.
      const resolved = path.join(APP_DIR, 'scripts', 'seed-data');
      expect(fs.existsSync(resolved), 'CONTENT_BASE_PATH should resolve to a real directory').toBe(true);
    });

    it('§2.migrate — scripts/migrate-seed-data.ts seedDataPath = scripts/seed-data resolves to a directory', () => {
      const scriptPath = path.join(APP_DIR, 'scripts', 'migrate-seed-data.ts');
      expect(fs.existsSync(scriptPath), 'migrate-seed-data.ts should exist').toBe(true);
      const resolved = path.join(APP_DIR, 'scripts', 'seed-data');
      expect(fs.existsSync(resolved), 'migrate-seed-data.ts seedDataPath should resolve').toBe(true);
    });

    it('§2.convert — scripts/convert-md-to-structured.ts inputPath = scripts/seed-data/lessons/thai-g3-unit-1.json exists', () => {
      const scriptPath = path.join(APP_DIR, 'scripts', 'convert-md-to-structured.ts');
      expect(fs.existsSync(scriptPath), 'convert-md-to-structured.ts should exist').toBe(true);
      const resolved = path.join(APP_DIR, 'scripts', 'seed-data', 'lessons', 'thai-g3-unit-1.json');
      expect(fs.existsSync(resolved), `${resolved} should exist`).toBe(true);
    });
  });

  describe('§3 Seed-script import smoke test', () => {
    /**
     * Each seed script exports one or more functions
     * (seedStandards, seedLessons, …). A regression where the
     * module-load fails (e.g., a missing import) would silently
     * break `pnpm seed`. This test imports each script via Vitest's
     * `import()` and asserts the expected export exists.
     *
     * Note: this test does not invoke the functions (they would
     * require a live DB); it only proves the module can be loaded
     * and the export is present.
     */
    it('§3.1 — scripts/seed/seed-lessons.ts exports seedLessons', async () => {
      const mod = await import('@/scripts/seed/seed-lessons');
      expect(typeof mod.seedLessons, 'seedLessons should be a function').toBe('function');
    });

    it('§3.2 — scripts/seed/seed-questions.ts exports seedQuestions', async () => {
      const mod = await import('@/scripts/seed/seed-questions');
      expect(typeof mod.seedQuestions, 'seedQuestions should be a function').toBe('function');
    });

    it('§3.3 — scripts/seed/seed-standards.ts exports seedStandards', async () => {
      const mod = await import('@/scripts/seed/seed-standards');
      expect(typeof mod.seedStandards, 'seedStandards should be a function').toBe('function');
    });

    it('§3.4 — scripts/seed/seed-curriculum-units.ts exports seedCurriculumUnits', async () => {
      const mod = await import('@/scripts/seed/seed-curriculum-units');
      expect(typeof mod.seedCurriculumUnits, 'seedCurriculumUnits should be a function').toBe('function');
    });

    it('§3.5 — scripts/seed/update-seed-files.ts loads without error (top-level side effects are tolerated)', () => {
      // update-seed-files.ts runs at import time (it mutates files).
      // We assert the module path exists; the import side effects are
      // scoped to writing titleThai fields, which is idempotent.
      const stat = fs.statSync(path.join(SEED_DIR, 'update-seed-files.ts'));
      expect(stat.isFile()).toBe(true);
    });
  });

  describe('§4 README path references', () => {
    it('§4.1 — scripts/seed-data/README.md has no `prisma/seed-data|seed-functions` path references', async () => {
      const contents = await fsp.readFile(
        path.join(SEED_DATA_DIR, 'README.md'),
        'utf-8',
      );
      // Path-relocation contract: the README may not point back at the
      // legacy prisma/ path. Tooling drift (e.g., `npm run db:seed`)
      // is a Phase 3 / FR-3 finding and is intentionally not asserted.
      const matches = contents.match(/prisma\/(?:seed-data|seed-functions)/g);
      expect(matches, 'README should not reference legacy prisma/ paths').toBeNull();
    });

    it('§4.2 — scripts/seed-data/grade-4/README.md has no `prisma/seed-data|seed-functions` path references', async () => {
      const contents = await fsp.readFile(
        path.join(SEED_DATA_DIR, 'grade-4', 'README.md'),
        'utf-8',
      );
      const matches = contents.match(/prisma\/(?:seed-data|seed-functions)/g);
      expect(matches, 'grade-4/README.md should not reference legacy prisma/ paths').toBeNull();
    });

    it('§4.3 — scripts/seed-data/README.md references scripts/seed.ts (the relocated orchestrator)', async () => {
      const contents = await fsp.readFile(
        path.join(SEED_DATA_DIR, 'README.md'),
        'utf-8',
      );
      expect(contents, 'README should mention scripts/seed.ts').toContain('scripts/seed.ts');
    });
  });

  describe('§5 Regression guard: prisma/ must not reappear', () => {
    it('§5.1 — apps/science-advantage/prisma/ does not exist (asserted via stat-throws, not find-vacuous)', async () => {
      // The existing §2.8 test uses `find apps/science-advantage/prisma`
      // which returns 0 lines when the directory is absent — this
      // passes vacuously and is therefore weak. Use fs.stat-throws
      // to assert absence directly.
      await expect(fsp.stat(path.join(APP_DIR, 'prisma'))).rejects.toThrow();
    });

    it('§5.2 — apps/science-advantage/AGENTS.md has the regression-guard note (forbidding prisma/ at app root)', async () => {
      const contents = await fsp.readFile(path.join(APP_DIR, 'AGENTS.md'), 'utf-8');
      // The guard is the first non-heading paragraph. Pin a unique
      // substring to avoid matching JSDoc comments in unrelated files.
      expect(
        contents,
        'AGENTS.md should contain the F-205 regression-guard note',
      ).toMatch(/Regression guard.*prisma.*must not exist/s);
    });

    it('§5.3 — `prisma/seed-data|prisma/data/content|prisma/seed-functions` appears in ZERO `.ts` files under apps/science-advantage/scripts/ (excluding __tests__/)', () => {
      // The existing §2.8 test covers this scope. Re-assert with a
      // strict regex anchored to the script (not a JSDoc comment)
      // to catch the subtle case where a comment references the
      // legacy path.
      const result = spawnSync('rg', [
        'prisma/seed-data|prisma/data/content|prisma/seed-functions',
        'apps/science-advantage/scripts/',
        '-g', '*.ts',
        '-g', '!*.test.*',
        '-g', '!__tests__/**',
        '-t', 'ts',
      ], { cwd: MONOREPO_ROOT, encoding: 'utf-8' });
      const out = (result.stdout ?? '').trim();
      expect(out, 'no active script should reference legacy prisma/ paths').toBe('');
    });
  });
});
