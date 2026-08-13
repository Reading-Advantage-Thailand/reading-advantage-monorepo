import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DURABLE_JOB_PG16_OPT_IN_ENV,
  isDurableJobPostgres16IntegrationEnabled,
  withDurableJobPostgres16Harness,
} from "../../../backend/src/jobs/__tests__/postgres16-harness.js";
import {
  durableJobCanonicalColumns,
  durableJobCanonicalRows,
} from "./fixtures/durable-job-transition-counterexamples.js";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const DRIZZLE_ROOT = resolve(PACKAGE_ROOT, "drizzle");
const durableJobMigrationPaths = readdirSync(DRIZZLE_ROOT)
  .filter((name) => /^\d+_durable_jobs(?:_platform)?\.sql$/.test(name))
  .map((name) => resolve(DRIZZLE_ROOT, name));
const durableJobMigrationPath =
  durableJobMigrationPaths.length === 1
    ? durableJobMigrationPaths[0]
    : undefined;
const optInValue = process.env[DURABLE_JOB_PG16_OPT_IN_ENV];
const integrationEnabled =
  optInValue === undefined || optInValue === ""
    ? false
    : isDurableJobPostgres16IntegrationEnabled(process.env);

const JSON_COLUMNS = new Set([
  "payload_json",
  "rerun_payload_json",
  "result_json",
]);

describe.skipIf(!integrationEnabled)(
  "Task 6 durable-jobs PostgreSQL 16 schema Red contract",
  () => {
    it("accepts one canonical row and requires the Task 11 migration", async () => {
      await withDurableJobPostgres16Harness(
        {
          async migrate({ migrationConnection }) {
            expect(
              durableJobMigrationPath,
              "Intentional Red: the Task 11 durable-jobs migration is absent.",
            ).toBeDefined();
            if (durableJobMigrationPath === undefined) return;

            const migration = readFileSync(durableJobMigrationPath, "utf8");
            for (const statement of migration.split("--> statement-breakpoint")) {
              if (statement.trim()) {
                await migrationConnection.unsafe(statement);
              }
            }
          },
        },
        async ({ connectionOne }) => {
          const canonicalRow = durableJobCanonicalRows.pending;
          const columns = durableJobCanonicalColumns.map((column) => `"${column}"`);
          const placeholders = durableJobCanonicalColumns.map((column, index) =>
            JSON_COLUMNS.has(column) ? `$${index + 1}::jsonb` : `$${index + 1}`,
          );
          const values = durableJobCanonicalColumns.map(
            (column) => canonicalRow[column],
          );

          await connectionOne.unsafe(
            `INSERT INTO "durable_jobs" (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
            values,
          );
          const [row] = await connectionOne<
            { id: string; state: string; attempt: number }[]
          >`SELECT "id", "state", "attempt" FROM "durable_jobs"`;

          expect(row).toEqual({
            id: canonicalRow.id,
            state: canonicalRow.state,
            attempt: canonicalRow.attempt,
          });
        },
      );
    });
  },
);
