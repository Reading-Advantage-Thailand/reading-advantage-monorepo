/**
 * Red deployment contract for the historical Codecamp 0049 ledger gap.
 *
 * The normal migration runner applies 0049 forward after validating the
 * restored ledger, then the deployment gate must require 0049's exact ledger
 * row and schema sentinel. Filesystem assertions keep this contract active
 * without a PostgreSQL credential.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "../..");
const CLOUDBUILD_PATH = join(
  REPOSITORY_ROOT,
  "apps/codecamp-advantage/cloudbuild.yaml",
);
const TARGET_TAG = "0049_codecamp_exercise_quiz_repair";

describe("Codecamp 0049 historical-ledger gap deploy contract", () => {
  it("runs the normal migration before the exact 0049 doctor gate", () => {
    const cloudBuild = readFileSync(CLOUDBUILD_PATH, "utf8");
    const normalMigrateIndex = cloudBuild.indexOf(
      "pnpm --filter @reading-advantage/db migrate",
    );
    const doctorIndex = cloudBuild.indexOf(
      `doctor --check --required-migration ${TARGET_TAG}`,
    );

    expect(
      normalMigrateIndex,
      "Codecamp Cloud Build must run the normal, fail-closed product migration path.",
    ).toBeGreaterThanOrEqual(0);
    expect(
      doctorIndex,
      "Codecamp Cloud Build must retain the required 0049 doctor gate after migration.",
    ).toBeGreaterThanOrEqual(0);
    expect(
      normalMigrateIndex,
      "The normal migration path must run before the required 0049 doctor gate.",
    ).toBeLessThan(doctorIndex);
  });
});
