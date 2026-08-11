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

import { describe, expect, it, vi } from "vitest";

const migrationCeilingFixture = vi.hoisted(() => {
  const executedSql: string[] = [];
  const transaction = {
    unsafe: vi.fn(async (query: unknown) => {
      if (typeof query === "string") executedSql.push(query);
      return [];
    }),
  };
  const client = {
    begin: vi.fn(
      async (callback: (value: typeof transaction) => Promise<void>) =>
        callback(transaction),
    ),
    end: vi.fn(async () => undefined),
  };
  const migrations = [
    {
      tag: "0049_codecamp_exercise_quiz_repair",
      folderMillis: 1785758864000,
      hash: "0049-hash",
      sql: ["SELECT apply_reviewed_codecamp_repair"],
    },
    {
      tag: "0050_finance_operations_records",
      folderMillis: 1785758865000,
      hash: "0050-hash",
      sql: ["SELECT apply_unreviewed_successor"],
    },
  ];
  return { client, executedSql, migrations, transaction };
});

vi.mock("postgres", () => ({
  default: vi.fn(() => migrationCeilingFixture.client),
}));

vi.mock("../migration-files.js", () => ({
  readPostgresMigrationFiles: vi.fn(() => migrationCeilingFixture.migrations),
}));

import { migrateProductDatabase } from "../migration.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "../..");
const CLOUDBUILD_PATH = join(
  REPOSITORY_ROOT,
  "apps/codecamp-advantage/cloudbuild.yaml",
);
const MIGRATOR_PATH = join(PACKAGE_ROOT, "src/migration.ts");
const MIGRATE_SCRIPT_PATH = join(PACKAGE_ROOT, "scripts/migrate.ts");
const TARGET_TAG = "0049_codecamp_exercise_quiz_repair";
const SUCCESSOR_TAG = "0050_finance_operations_records";

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

  it("bounds the Codecamp migration step to 0049 and excludes the successor", () => {
    const cloudBuild = readFileSync(CLOUDBUILD_PATH, "utf8");
    const migrateStep = cloudBuild
      .split(/\n\s*-\s*name:/)
      .find((block) => block.includes('id: "migrate-db"'));
    expect(migrateStep, "Codecamp migrate step must exist").toBeDefined();
    expect(migrateStep).toMatch(
      new RegExp(`MIGRATION_CEILING_TAG=${TARGET_TAG}`),
    );
    expect(migrateStep).not.toContain(SUCCESSOR_TAG);

    const migrationSource = readFileSync(MIGRATOR_PATH, "utf8");
    const migrateScript = readFileSync(MIGRATE_SCRIPT_PATH, "utf8");
    expect(migrationSource).toContain("migrationCeilingTag");
    expect(migrateScript).toContain("MIGRATION_CEILING_TAG");
  });

  it("fails closed before applying a successor beyond the explicit 0049 ceiling", async () => {
    migrationCeilingFixture.executedSql.length = 0;

    const options = Object.assign(
      {
        directDatabaseUrl: "postgres://unit-test.invalid/codecamp",
        migrationsFolder: "/fixture/migrations",
      },
      { migrationCeilingTag: TARGET_TAG },
    );

    await expect(migrateProductDatabase(options)).rejects.toThrow(
      /ceiling|0050|successor/i,
    );
    expect(migrationCeilingFixture.executedSql).not.toContain(
      "SELECT apply_reviewed_codecamp_repair",
    );
    expect(migrationCeilingFixture.executedSql).not.toContain(
      "SELECT apply_unreviewed_successor",
    );
  });
});
