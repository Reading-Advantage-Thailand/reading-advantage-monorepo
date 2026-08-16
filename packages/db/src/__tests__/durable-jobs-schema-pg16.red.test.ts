import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import type { Sql } from "postgres";
import { describe, expect, it } from "vitest";

import {
  durableJobCanonicalColumns,
  durableJobCanonicalRows,
  durableJobInvalidRowFixtures,
  durableJobRowFromFixture,
  type DurableJobCanonicalRow,
} from "./fixtures/durable-job-transition-counterexamples.js";

const DURABLE_JOB_PG16_OPT_IN_ENV = "DURABLE_JOB_PG16_TEST_OPT_IN";
const TASK7_HARNESS_MODULE_URL = new URL(
  "../../../backend/src/jobs/__tests__/postgres16-harness.ts",
  import.meta.url,
).href;
const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const DRIZZLE_ROOT = resolve(PACKAGE_ROOT, "drizzle");
const LEGACY_REVIEW_JOBS_MIGRATION_PATH = resolve(
  DRIZZLE_ROOT,
  "0025_review_jobs.sql",
);
const durableJobMigrationPaths = readdirSync(DRIZZLE_ROOT)
  .filter((name) => /^\d+_durable_jobs(?:_platform)?\.sql$/.test(name))
  .map((name) => resolve(DRIZZLE_ROOT, name));
const durableJobMigrationPath =
  durableJobMigrationPaths.length === 1
    ? durableJobMigrationPaths[0]
    : undefined;

const JSON_COLUMNS = new Set([
  "payload_json",
  "rerun_payload_json",
  "result_json",
]);
const DURABLE_JOB_AUDIT_TABLES = [
  "durable_job_audit_events",
  "review_job_adoption_audit_events",
] as const;
const REQUIRED_DURABLE_JOB_CHECKS = [
  "durable_jobs_attempt_bounds_check",
  "durable_jobs_generation_check",
  "durable_jobs_hash_format_check",
  "durable_jobs_idempotency_key_check",
  "durable_jobs_job_name_check",
  "durable_jobs_lease_tuple_check",
  "durable_jobs_queue_name_check",
  "durable_jobs_redelivery_state_check",
  "durable_jobs_rerun_state_check",
  "durable_jobs_rerun_tuple_check",
  "durable_jobs_safe_error_check",
  "durable_jobs_safe_error_tuple_check",
  "durable_jobs_state_truth_table_check",
  "durable_jobs_tenant_scope_check",
  "durable_jobs_worker_id_check",
] as const;
const FORBIDDEN_AUDIT_COLUMN =
  /(?:payload|result|token|raw(?:_|$)|error|provider|response|sql|url)/i;

const durableJobColumnContract = [
  ["id", "uuid", "NO"],
  ["job_name", "text", "NO"],
  ["queue_name", "text", "NO"],
  ["tenant_mode", "USER-DEFINED", "NO"],
  ["tenant_id", "text", "YES"],
  ["idempotency_key", "text", "NO"],
  ["payload_json", "jsonb", "NO"],
  ["payload_fingerprint", "text", "NO"],
  ["state", "USER-DEFINED", "NO"],
  ["attempt", "integer", "NO"],
  ["max_attempts", "integer", "NO"],
  ["available_at", "timestamp with time zone", "NO"],
  ["lease_token_hash", "text", "YES"],
  ["lease_owner", "text", "YES"],
  ["lease_expires_at", "timestamp with time zone", "YES"],
  ["redeliver_current_attempt", "boolean", "NO"],
  ["rerun_requested", "boolean", "NO"],
  ["rerun_queue_name", "text", "YES"],
  ["rerun_payload_json", "jsonb", "YES"],
  ["rerun_payload_fingerprint", "text", "YES"],
  ["rerun_max_attempts", "integer", "YES"],
  ["rerun_available_at", "timestamp with time zone", "YES"],
  ["result_json", "jsonb", "YES"],
  ["last_error_code", "text", "YES"],
  ["last_error_summary", "text", "YES"],
  ["completed_at", "timestamp with time zone", "YES"],
  ["generation", "integer", "NO"],
  ["created_at", "timestamp with time zone", "NO"],
  ["updated_at", "timestamp with time zone", "NO"],
] as const;
const supportTableColumnContracts = {
  durable_job_audit_events: [
    ["id", "uuid", "NO"],
    ["requested_job_id", "uuid", "NO"],
    ["tenant_mode", "USER-DEFINED", "NO"],
    ["tenant_id", "text", "YES"],
    ["action", "text", "NO"],
    ["outcome", "text", "NO"],
    ["prior_state", "USER-DEFINED", "YES"],
    ["actor", "text", "NO"],
    ["authorization_decision_id", "text", "NO"],
    ["authorization_decided_at", "timestamp with time zone", "NO"],
    ["reason", "text", "NO"],
    ["correlation_id", "text", "NO"],
    ["created_at", "timestamp with time zone", "NO"],
  ],
  review_job_adoption_audit_events: [
    ["id", "uuid", "NO"],
    ["from_mode", "USER-DEFINED", "NO"],
    ["to_mode", "USER-DEFINED", "NO"],
    ["prior_generation", "integer", "NO"],
    ["new_generation", "integer", "NO"],
    ["actor", "text", "NO"],
    ["authorization_decision_id", "text", "NO"],
    ["authorization_decided_at", "timestamp with time zone", "NO"],
    ["reason", "text", "NO"],
    ["correlation_id", "text", "NO"],
    ["created_at", "timestamp with time zone", "NO"],
  ],
  review_job_durable_bindings: [
    ["review_job_id", "uuid", "NO"],
    ["durable_job_id", "uuid", "NO"],
    ["created_at", "timestamp with time zone", "NO"],
    ["created_by", "text", "NO"],
    ["correlation_id", "text", "NO"],
  ],
  review_job_durable_adoption: [
    ["control_key", "text", "NO"],
    ["mode", "USER-DEFINED", "NO"],
    ["generation", "integer", "NO"],
    ["updated_at", "timestamp with time zone", "NO"],
    ["updated_by", "text", "NO"],
  ],
  review_job_migration_issues: [
    ["review_job_id", "uuid", "NO"],
    ["preflight_run_id", "uuid", "NO"],
    ["code", "text", "NO"],
    ["field_group", "text", "NO"],
    ["detected_at", "timestamp with time zone", "NO"],
    ["resolution_status", "text", "NO"],
    ["resolution_code", "text", "YES"],
    ["resolver_subject", "text", "YES"],
    ["resolved_at", "timestamp with time zone", "YES"],
  ],
} as const;

type DurableJobTestSql = Sql<Record<string, unknown>>;

interface DurableJobPostgres16HarnessContext {
  readonly connectionOne: DurableJobTestSql;
  readonly migrationConnection: DurableJobTestSql;
}

interface DurableJobPostgres16Harness {
  readonly isDurableJobPostgres16IntegrationEnabled: (
    environment: NodeJS.ProcessEnv,
  ) => boolean;
  readonly withDurableJobPostgres16Harness: <T>(
    hooks: {
      readonly migrate: (
        context: DurableJobPostgres16HarnessContext,
      ) => Promise<void> | void;
    },
    testBody: (context: DurableJobPostgres16HarnessContext) => Promise<T> | T,
  ) => Promise<T>;
}

/**
 * Rejects generic database URLs before an opt-in test can be skipped.
 * @param environment Environment values supplied by the test process.
 * @returns True only for the exact live-test opt-in value.
 * @throws When a generic database URL or ambiguous opt-in value is present.
 */
function resolveTask6Postgres16IntegrationEnabled(
  environment: NodeJS.ProcessEnv,
): boolean {
  for (const key of ["DATABASE_URL", "DIRECT_DATABASE_URL"] as const) {
    if (environment[key]?.trim()) {
      throw new Error(
        `${key} must be unset for durable-job PostgreSQL 16 integration tests.`,
      );
    }
  }

  const optInValue = environment[DURABLE_JOB_PG16_OPT_IN_ENV];
  if (optInValue === undefined || optInValue === "") {
    return false;
  }
  if (optInValue !== "1") {
    throw new Error(`${DURABLE_JOB_PG16_OPT_IN_ENV} must be exactly 1.`);
  }
  return true;
}

/**
 * Loads the frozen Task 7 harness only after the Task 6 live-test opt-in.
 * @returns The verified Task 7 test harness surface.
 * @throws When the frozen harness module does not expose its required API.
 */
async function loadTask7Postgres16Harness(): Promise<DurableJobPostgres16Harness> {
  const loadedModule = (await import(
    TASK7_HARNESS_MODULE_URL
  )) as Partial<DurableJobPostgres16Harness>;
  if (
    typeof loadedModule.isDurableJobPostgres16IntegrationEnabled !==
      "function" ||
    typeof loadedModule.withDurableJobPostgres16Harness !== "function"
  ) {
    throw new Error(
      "The frozen Task 7 PostgreSQL 16 harness API is unavailable.",
    );
  }
  return loadedModule as DurableJobPostgres16Harness;
}

const integrationEnabled = resolveTask6Postgres16IntegrationEnabled(
  process.env,
);

/**
 * Executes one Drizzle SQL file with its statement-boundary markers removed.
 * @param sql PostgreSQL connection that owns the disposable migration session.
 * @param migrationSql Exact migration source to execute.
 * @returns Nothing after every SQL statement completes.
 */
async function executeMigrationSql(
  sql: DurableJobTestSql,
  migrationSql: string,
): Promise<void> {
  for (const statement of migrationSql.split("--> statement-breakpoint")) {
    if (statement.trim()) {
      await sql.unsafe(statement);
    }
  }
}

/**
 * Applies the smallest real legacy review-jobs prerequisite for the adoption migration.
 * @param sql PostgreSQL connection that owns the disposable migration session.
 * @returns Nothing after the legacy review-jobs migration completes.
 */
async function applyLegacyReviewJobsMigration(
  sql: DurableJobTestSql,
): Promise<void> {
  await sql.unsafe(
    'CREATE TABLE "codecamp_pr_reviews" ("id" uuid PRIMARY KEY)',
  );
  await executeMigrationSql(
    sql,
    readFileSync(LEGACY_REVIEW_JOBS_MIGRATION_PATH, "utf8"),
  );
}

/**
 * Inserts one complete durable-job row with JSON values sent as JSONB parameters.
 * @param sql PostgreSQL connection that owns the disposable migration session.
 * @param row Complete durable-job row to insert.
 * @returns Nothing after the insert completes.
 */
async function insertDurableJobRow(
  sql: DurableJobTestSql,
  row: DurableJobCanonicalRow,
): Promise<void> {
  const columns = durableJobCanonicalColumns.map((column) => `"${column}"`);
  const placeholders = durableJobCanonicalColumns.map((column, index) =>
    JSON_COLUMNS.has(column) ? `$${index + 1}::jsonb` : `$${index + 1}`,
  );
  const values = durableJobCanonicalColumns.map((column) => row[column]);

  await sql.unsafe(
    `INSERT INTO "durable_jobs" (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    values,
  );
}

/**
 * Verifies the required support-table column types and nullability.
 * @param sql PostgreSQL connection that owns the migrated scratch database.
 * @returns Nothing after every declared support column is verified.
 */
async function expectSupportTableColumnContracts(
  sql: DurableJobTestSql,
): Promise<void> {
  for (const [tableName, expectedColumns] of Object.entries(
    supportTableColumnContracts,
  )) {
    const columns = await sql<
      { column_name: string; data_type: string; is_nullable: string }[]
    >`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ORDER BY ordinal_position
    `;
    for (const [column_name, data_type, is_nullable] of expectedColumns) {
      expect(columns).toContainEqual({ column_name, data_type, is_nullable });
    }
  }
}

/**
 * Verifies primary, singleton, and unique keys for adoption support tables.
 * @param sql PostgreSQL connection that owns the migrated scratch database.
 * @returns Nothing after every required key is verified.
 */
async function expectSupportTableKeys(sql: DurableJobTestSql): Promise<void> {
  const keys = await sql<
    {
      table_name: string;
      constraint_name: string;
      constraint_type: string;
      column_name: string;
    }[]
  >`
    SELECT
      constraint_row.table_name,
      constraint_row.constraint_name,
      constraint_row.constraint_type,
      key_column.column_name
    FROM information_schema.table_constraints AS constraint_row
    JOIN information_schema.key_column_usage AS key_column
      ON key_column.constraint_catalog = constraint_row.constraint_catalog
     AND key_column.constraint_schema = constraint_row.constraint_schema
     AND key_column.constraint_name = constraint_row.constraint_name
    WHERE constraint_row.table_schema = 'public'
      AND constraint_row.table_name IN (
        'durable_job_audit_events',
        'review_job_adoption_audit_events',
        'review_job_durable_bindings',
        'review_job_durable_adoption',
        'review_job_migration_issues'
      )
      AND constraint_row.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
    ORDER BY
      constraint_row.table_name,
      constraint_row.constraint_type,
      constraint_row.constraint_name,
      key_column.ordinal_position
  `;

  const keyColumnsFor = (
    tableName: string,
    constraintType: string,
  ): string[][] => {
    const columnsByConstraint = new Map<string, string[]>();
    for (const key of keys) {
      if (
        key.table_name !== tableName ||
        key.constraint_type !== constraintType
      ) {
        continue;
      }
      const columns = columnsByConstraint.get(key.constraint_name) ?? [];
      columns.push(key.column_name);
      columnsByConstraint.set(key.constraint_name, columns);
    }
    return [...columnsByConstraint.values()];
  };

  for (const tableName of DURABLE_JOB_AUDIT_TABLES) {
    expect(keyColumnsFor(tableName, "PRIMARY KEY")).toEqual([["id"]]);
    expect(keyColumnsFor(tableName, "UNIQUE")).toEqual([]);
  }
  expect(keyColumnsFor("review_job_durable_bindings", "PRIMARY KEY")).toEqual([
    ["review_job_id"],
  ]);
  expect(keyColumnsFor("review_job_durable_bindings", "UNIQUE")).toEqual([
    ["durable_job_id"],
  ]);
  expect(keyColumnsFor("review_job_durable_adoption", "PRIMARY KEY")).toEqual([
    ["control_key"],
  ]);
  expect(keyColumnsFor("review_job_durable_adoption", "UNIQUE")).toEqual([]);
  expect(keyColumnsFor("review_job_migration_issues", "PRIMARY KEY")).toEqual(
    [],
  );
  expect(keyColumnsFor("review_job_migration_issues", "UNIQUE")).toEqual([
    ["review_job_id", "code"],
  ]);
}

/**
 * Verifies required singleton and positive-generation support-table checks.
 * @param sql PostgreSQL connection that owns the migrated scratch database.
 * @returns Nothing after the support-table bounds pass.
 */
async function expectSupportTableBounds(sql: DurableJobTestSql): Promise<void> {
  const checks = await sql<
    { table_name: string; constraint_definition: string }[]
  >`
    SELECT relation.relname AS table_name,
      pg_get_constraintdef(constraint_row.oid, true) AS constraint_definition
    FROM pg_constraint AS constraint_row
    JOIN pg_class AS relation ON relation.oid = constraint_row.conrelid
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname IN (
        'durable_job_audit_events',
        'review_job_adoption_audit_events',
        'review_job_durable_bindings',
        'review_job_durable_adoption',
        'review_job_migration_issues'
      )
      AND constraint_row.contype = 'c'
  `;
  const boundColumns = {
    durable_job_audit_events: [
      "actor",
      "authorization_decision_id",
      "reason",
      "correlation_id",
    ],
    review_job_adoption_audit_events: [
      "actor",
      "authorization_decision_id",
      "reason",
      "correlation_id",
    ],
    review_job_durable_bindings: ["created_by", "correlation_id"],
    review_job_durable_adoption: ["updated_by"],
    review_job_migration_issues: [
      "code",
      "field_group",
      "resolution_code",
      "resolver_subject",
    ],
  } as const;
  for (const [tableName, columns] of Object.entries(boundColumns)) {
    const definitions = checks
      .filter(({ table_name }) => table_name === tableName)
      .map(({ constraint_definition }) => constraint_definition)
      .join(" ");
    for (const column of columns) {
      expect(
        definitions,
        `${tableName}.${column} requires a database length bound.`,
      ).toMatch(
        new RegExp(
          `(?:char_length|length)\\s*\\(\\s*${column}\\s*\\)\\s*(?:BETWEEN|>=|>|=|<=|<)`,
          "i",
        ),
      );
    }
  }
  const adoptionChecks = checks
    .filter(({ table_name }) => table_name === "review_job_durable_adoption")
    .map(({ constraint_definition }) => constraint_definition);
  const auditChecks = checks
    .filter(
      ({ table_name }) => table_name === "review_job_adoption_audit_events",
    )
    .map(({ constraint_definition }) => constraint_definition);

  expect(
    adoptionChecks.some((definition) =>
      /control_key.*singleton/i.test(definition),
    ),
  ).toBe(true);
  expect(
    adoptionChecks.some((definition) => /generation.*>=.*1/i.test(definition)),
  ).toBe(true);
  expect(
    auditChecks.some((definition) =>
      /prior_generation.*>=.*1/i.test(definition),
    ),
  ).toBe(true);
  expect(
    auditChecks.some((definition) => /new_generation.*>=.*1/i.test(definition)),
  ).toBe(true);
}

/**
 * Verifies catalog metadata that cannot be proven by SQL-label source checks.
 * @param sql PostgreSQL connection that owns the migrated scratch database.
 * @returns Nothing after the live catalog contract passes.
 */
async function expectDurableJobCatalogContract(
  sql: DurableJobTestSql,
): Promise<void> {
  const columns = await sql<
    { column_name: string; data_type: string; is_nullable: string }[]
  >`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'durable_jobs'
    ORDER BY ordinal_position
  `;
  expect(columns).toEqual(
    durableJobColumnContract.map(([column_name, data_type, is_nullable]) => ({
      column_name,
      data_type,
      is_nullable,
    })),
  );

  await expect(
    sql<{ column_name: string; udt_name: string }[]>`
      SELECT column_name, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'durable_jobs'
        AND column_name IN ('tenant_mode', 'state')
      ORDER BY column_name
    `,
  ).resolves.toEqual([
    { column_name: "state", udt_name: "durable_job_state" },
    { column_name: "tenant_mode", udt_name: "durable_job_tenant_mode" },
  ]);

  await expect(
    sql<{ enum_name: string; enum_value: string }[]>`
      SELECT type.typname AS enum_name, enum.enumlabel AS enum_value
      FROM pg_type AS type
      JOIN pg_enum AS enum ON enum.enumtypid = type.oid
      WHERE type.typname IN ('durable_job_state', 'durable_job_tenant_mode')
      ORDER BY type.typname, enum.enumsortorder
    `,
  ).resolves.toEqual([
    { enum_name: "durable_job_state", enum_value: "pending" },
    { enum_name: "durable_job_state", enum_value: "running" },
    { enum_name: "durable_job_state", enum_value: "succeeded" },
    { enum_name: "durable_job_state", enum_value: "dead" },
    { enum_name: "durable_job_state", enum_value: "legacy-failed" },
    { enum_name: "durable_job_tenant_mode", enum_value: "global" },
    { enum_name: "durable_job_tenant_mode", enum_value: "tenant" },
  ]);

  await expect(
    sql<{ constraint_name: string }[]>`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'durable_jobs'
        AND constraint_type = 'PRIMARY KEY'
    `,
  ).resolves.toEqual([{ constraint_name: "durable_jobs_pkey" }]);

  const checks = await sql<
    { constraint_name: string; constraint_definition: string }[]
  >`
    SELECT constraint_row.conname AS constraint_name,
      pg_get_constraintdef(constraint_row.oid, true) AS constraint_definition
    FROM pg_constraint AS constraint_row
    JOIN pg_class AS relation ON relation.oid = constraint_row.conrelid
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = 'durable_jobs'
      AND constraint_row.contype = 'c'
    ORDER BY constraint_name
  `;
  const declaredCheckNames = new Set(
    checks.map(({ constraint_name }) => constraint_name),
  );
  for (const requiredCheck of REQUIRED_DURABLE_JOB_CHECKS) {
    expect(declaredCheckNames).toContain(requiredCheck);
  }
  for (const { constraint_name, constraint_definition } of checks) {
    expect(
      constraint_definition,
      `${constraint_name} must not be vacuous.`,
    ).not.toMatch(/^CHECK \(true\)$/i);
  }

  const identityIndexes = await sql<{ indexname: string; indexdef: string }[]>`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'durable_jobs'
      AND indexname IN (
        'durable_jobs_global_identity_unique',
        'durable_jobs_tenant_identity_unique'
      )
    ORDER BY indexname
  `;
  expect(identityIndexes.map(({ indexname }) => indexname)).toEqual([
    "durable_jobs_global_identity_unique",
    "durable_jobs_tenant_identity_unique",
  ]);
  expect(identityIndexes[0]?.indexdef).toMatch(
    /UNIQUE.*\(job_name, idempotency_key\).*tenant_mode.*global/i,
  );
  expect(identityIndexes[1]?.indexdef).toMatch(
    /UNIQUE.*\(job_name, tenant_id, idempotency_key\).*tenant_mode.*tenant/i,
  );
  for (const { indexdef } of identityIndexes) {
    expect(indexdef).not.toMatch(/\(.*queue_name.*\)/i);
  }

  await expectSupportTableColumnContracts(sql);
  await expectSupportTableKeys(sql);
  await expectSupportTableBounds(sql);

  for (const tableName of DURABLE_JOB_AUDIT_TABLES) {
    const auditColumns = await sql<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ORDER BY ordinal_position
    `;
    expect(auditColumns).not.toEqual([]);
    for (const { column_name } of auditColumns) {
      expect(
        column_name,
        `${tableName} must not persist sensitive queue data.`,
      ).not.toMatch(FORBIDDEN_AUDIT_COLUMN);
    }

    await expect(
      sql<{ tableowner: string }[]>`
        SELECT tableowner
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename = ${tableName}
      `,
    ).resolves.toEqual([{ tableowner: "durable_job_audit_owner" }]);

    await expect(
      sql<{ count: number }[]>`
        SELECT count(*)::integer AS count
        FROM information_schema.table_privileges
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
          AND grantee = 'PUBLIC'
      `,
    ).resolves.toEqual([{ count: 0 }]);

    const runtimeGrants = await sql<
      { grantee: string; privilege_type: string }[]
    >`
      SELECT grantee, privilege_type
      FROM information_schema.table_privileges
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND grantee ~ '^durable_job_[a-z_]+_runtime$'
      ORDER BY grantee, privilege_type
    `;
    expect(
      runtimeGrants.length,
      `${tableName} needs a runtime insert grant.`,
    ).toBeGreaterThan(0);
    expect(runtimeGrants.map(({ privilege_type }) => privilege_type)).toContain(
      "INSERT",
    );
    for (const { privilege_type } of runtimeGrants) {
      expect(privilege_type).toMatch(/^(INSERT|SELECT)$/);
    }

    const triggers = await sql<
      {
        trigger_name: string;
        trigger_owner: string;
        trigger_function: string;
        trigger_type: number;
      }[]
    >`
      SELECT
        trigger_record.tgname AS trigger_name,
        owner_role.rolname AS trigger_owner,
        routine.proname AS trigger_function,
        trigger_record.tgtype AS trigger_type
      FROM pg_catalog.pg_trigger AS trigger_record
      JOIN pg_catalog.pg_class AS relation
        ON relation.oid = trigger_record.tgrelid
      JOIN pg_catalog.pg_namespace AS namespace_record
        ON namespace_record.oid = relation.relnamespace
      JOIN pg_catalog.pg_proc AS routine
        ON routine.oid = trigger_record.tgfoid
      JOIN pg_catalog.pg_roles AS owner_role
        ON owner_role.oid = routine.proowner
      WHERE namespace_record.nspname = 'public'
        AND relation.relname = ${tableName}
        AND NOT trigger_record.tgisinternal
      ORDER BY trigger_record.tgname
    `;
    expect(triggers).toEqual([
      {
        trigger_name: `${tableName}_reject_truncate`,
        trigger_owner: "durable_job_audit_owner",
        trigger_function: "durable_job_reject_audit_mutation",
        trigger_type: 34,
      },
      {
        trigger_name: `${tableName}_reject_update_delete`,
        trigger_owner: "durable_job_audit_owner",
        trigger_function: "durable_job_reject_audit_mutation",
        trigger_type: 27,
      },
    ]);
  }
}

describe.skipIf(!integrationEnabled)(
  "Task 6 durable-jobs PostgreSQL 16 schema Red contract",
  () => {
    it("accepts canonical rows and rejects every invalid fixture by its named constraint", async () => {
      const harness = await loadTask7Postgres16Harness();
      expect(
        harness.isDurableJobPostgres16IntegrationEnabled(process.env),
      ).toBe(true);
      await harness.withDurableJobPostgres16Harness(
        {
          async migrate({ migrationConnection }) {
            expect(
              durableJobMigrationPaths,
              "Intentional Red: the Task 11 durable-jobs migration is absent.",
            ).toHaveLength(1);
            if (durableJobMigrationPath === undefined) return;

            await applyLegacyReviewJobsMigration(migrationConnection);
            await executeMigrationSql(
              migrationConnection,
              readFileSync(durableJobMigrationPath, "utf8"),
            );
          },
        },
        async ({ connectionOne }) => {
          await expectDurableJobCatalogContract(connectionOne);

          for (const canonicalRow of Object.values(durableJobCanonicalRows)) {
            await insertDurableJobRow(connectionOne, canonicalRow);
            await expect(
              connectionOne<
                { id: string; state: string; attempt: number }[]
              >`SELECT "id", "state", "attempt" FROM "durable_jobs"`,
            ).resolves.toEqual([
              {
                id: canonicalRow.id,
                state: canonicalRow.state,
                attempt: canonicalRow.attempt,
              },
            ]);
            await connectionOne`DELETE FROM "durable_jobs"`;
          }

          for (const fixture of durableJobInvalidRowFixtures) {
            await expect(
              insertDurableJobRow(
                connectionOne,
                durableJobRowFromFixture(fixture),
              ),
              `${fixture.id} must fail through ${fixture.expectedConstraint}.`,
            ).rejects.toMatchObject({
              code: "23514",
              constraint_name: fixture.expectedConstraint,
            });
          }
        },
      );
    });
  },
);

describe("Task 6 durable-jobs PostgreSQL 16 environment guard", () => {
  it("rejects generic database URLs before the live suite can skip", () => {
    for (const key of ["DATABASE_URL", "DIRECT_DATABASE_URL"] as const) {
      expect(() =>
        resolveTask6Postgres16IntegrationEnabled({
          [key]: "postgres://unsafe",
        }),
      ).toThrow(`${key} must be unset`);
    }
  });

  it("skips only when the opt-in and generic database URLs are absent", () => {
    expect(resolveTask6Postgres16IntegrationEnabled({})).toBe(false);
    expect(
      resolveTask6Postgres16IntegrationEnabled({
        [DURABLE_JOB_PG16_OPT_IN_ENV]: "",
        DATABASE_URL: "",
        DIRECT_DATABASE_URL: "   ",
      }),
    ).toBe(false);
  });
});
