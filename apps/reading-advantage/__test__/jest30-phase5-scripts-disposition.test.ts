/**
 * Jest 30 Migration - Phase 5 Task 4: Scripts Package Disposition Red Proof.
 *
 * `@reading-advantage/scripts` (legacy scripts package at
 * `packages/reading-advantage-scripts/`) still pins `jest@^29.7.0`
 * in its devDependencies. The package's only jest usage is
 * `jest --passWithNoTests` in its `test` script - the migration
 * would be trivial. However, jest30-audit.md §1 scopes the
 * migration to `apps/reading-advantage` and `apps/advantage-games`,
 * so the scripts package is technically out-of-scope. The
 * spec.md AC#1 says "Jest upgraded from 29.x to 30.x in
 * reading-advantage and advantage-games" - the literal reading
 * limits the upgrade scope to those two apps, but the spec
 * does not anticipate a third Jest consumer outside the
 * migration.
 *
 * Task 4 requires the implementer to choose one of two outcomes:
 *
 *   (a) MIGRATE: bump `packages/reading-advantage-scripts/package.json`
 *       to `jest@^30.2.0` (or compatible). The migration is
 *       trivial - no `jest.config.ts` exists in the package, and
 *       the only jest usage is `jest --passWithNoTests`. This
 *       makes spec.md AC#6 literally true across the whole
 *       monorepo.
 *
 *   (b) EXCLUDE: create a formal disposition manifest at
 *       `measure/tracks/jest30_major_migration/phase-5-scripts-disposition.json`
 *       with owner, date, and follow-up track id. AC#6 is then
 *       satisfied "for the apps in the migration scope" rather
 *       than "for the entire monorepo".
 *
 * This file is the Red proof for Task 4: it asserts one of the
 * two outcomes holds. At HEAD, the scripts package is at
 * `jest@^29.7.0` AND the disposition manifest does not exist,
 * so both assertions fail.
 *
 * Design constraints:
 *
 *   - One focused test file. The migration is owned by the Phase 5
 *     implementer; the disposition manifest is also implementer-owned
 *     (see plan.md hand-off §5.4).
 *   - The test reads the live `package.json` and the disposition
 *     manifest. It does NOT run any package install or modify any
 *     files.
 *   - Bounded: `__test__/jest30-phase5-scripts-disposition.test.ts`
 *     is the single source of truth; no `--testPathPattern` widening,
 *     no full-suite smoke, no watch mode.
 *
 * Expected behavior:
 *
 *   - FAILS at the pre-Phase-5 HEAD because the scripts package is
 *     at `jest@^29.7.0` and the disposition manifest does not
 *     exist. Both tests fail for the right reason - no disposition
 *     is in place.
 *   - PASSES once the implementer either migrates the package (test
 *     1 passes) or writes the disposition manifest (test 2 passes).
 *     The two tests are independent: either one passing makes the
 *     disposition valid; both must pass for the task to be complete.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const SCRIPTS_PACKAGE_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "packages",
  "reading-advantage-scripts",
  "package.json",
);

const DISPOSITION_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "measure",
  "tracks",
  "jest30_major_migration",
  "phase-5-scripts-disposition.json",
);

interface Phase5ScriptsDisposition {
  created_at?: string;
  packages: string;
  owner: string;
  excluded_at: string;
  follow_up_track: string;
  rationale?: string;
}

function readScriptsPackageVersion(): string | null {
  if (!fs.existsSync(SCRIPTS_PACKAGE_PATH)) {
    return null;
  }
  const raw = JSON.parse(fs.readFileSync(SCRIPTS_PACKAGE_PATH, "utf8")) as {
    devDependencies?: Record<string, string>;
  };
  return raw.devDependencies?.jest ?? null;
}

function readDispositionOrNull(): Phase5ScriptsDisposition | null {
  if (!fs.existsSync(DISPOSITION_PATH)) {
    return null;
  }
  const raw = fs.readFileSync(DISPOSITION_PATH, "utf8");
  try {
    return JSON.parse(raw) as Phase5ScriptsDisposition;
  } catch (error) {
    throw new Error(
      `phase-5-scripts-disposition: JSON parse failed at ${DISPOSITION_PATH}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

describe(
  "jest30-phase5-scripts-disposition - scripts package is migrated OR has a formal disposition",
  () => {
    const jestVersion = readScriptsPackageVersion();
    const disposition = readDispositionOrNull();

    test(
      "scripts package is on Jest 30.x (migrated) - devDependencies.jest starts with ^30.",
      () => {
        expect(jestVersion).not.toBeNull();
        expect(jestVersion).toMatch(/^\^?30\./);
      },
    );

    test(
      "OR a formal disposition manifest exists at the canonical path with owner/date/follow-up",
      () => {
        expect(disposition).not.toBeNull();
        expect(disposition?.packages).toEqual("@reading-advantage/scripts");
        expect(disposition?.owner).toEqual(expect.any(String));
        expect((disposition?.owner ?? "").length).toBeGreaterThan(0);
        expect(disposition?.excluded_at).toEqual(expect.any(String));
        expect(disposition?.excluded_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
        expect(disposition?.follow_up_track).toEqual(expect.any(String));
        expect((disposition?.follow_up_track ?? "").length).toBeGreaterThan(0);
      },
    );
  },
);
