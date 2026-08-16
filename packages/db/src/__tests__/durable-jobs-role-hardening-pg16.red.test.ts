import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import postgres from "postgres";
import { describe, expect, it } from "vitest";

const HARNESS_MODULE_URL = new URL(
  "../../../backend/src/jobs/__tests__/postgres16-harness.ts",
  import.meta.url,
).href;
const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const DRIZZLE_ROOT = resolve(PACKAGE_ROOT, "drizzle");
const TASK9_MIGRATION_NAMES = [
  "0000_wide_vengeance.sql",
  "0005_codecamp_schema.sql",
  "0007_codecamp_repos_reviews.sql",
  "0025_review_jobs.sql",
  "0052_durable_jobs.sql",
] as const;
const AUDIT_TABLE_NAMES = [
  "durable_job_audit_events",
  "review_job_adoption_audit_events",
] as const;
const ROLE_NAMES = [
  "durable_job_audit_owner",
  "durable_job_queue_runtime",
] as const;
const ROLE_HARDENING_ERROR_PATTERN =
  /durable_job_(?:audit_owner|queue_runtime).*(?:no ?login|login|role|unsafe)|(?:no ?login|login|role|unsafe).*durable_job_(?:audit_owner|queue_runtime)/i;

type DurableJobTestSql = ReturnType<typeof postgres>;
type RoleName = (typeof ROLE_NAMES)[number];

interface DurableJobPostgres16HarnessContext {
  readonly connectionTwo: DurableJobTestSql;
  readonly migrationConnection: DurableJobTestSql;
}

interface DurableJobPostgres16HarnessModule {
  readonly isDurableJobPostgres16IntegrationEnabled: (
    environment: NodeJS.ProcessEnv,
  ) => boolean;
  readonly resolveDurableJobPostgres16AdminUrl: (
    environment: NodeJS.ProcessEnv,
  ) => URL;
  readonly withDurableJobPostgres16Harness: <T>(
    hooks: {
      readonly migrate: (
        context: DurableJobPostgres16HarnessContext,
      ) => Promise<void> | void;
    },
    testBody: (context: DurableJobPostgres16HarnessContext) => Promise<T> | T,
  ) => Promise<T>;
}

interface RoleAttributes {
  readonly rolname: RoleName;
  readonly rolcanlogin: boolean;
  readonly rolcreatedb: boolean;
}

interface OwnedProtectedObject {
  readonly objectName: string;
  readonly owner: string;
}

interface RuntimePrivilege {
  readonly tableName: string;
  readonly privilegeType: string;
}

/** Loads the shared fail-closed PostgreSQL 16 test harness. */
async function loadHarness(): Promise<DurableJobPostgres16HarnessModule> {
  return (await import(
    HARNESS_MODULE_URL
  )) as DurableJobPostgres16HarnessModule;
}

/** Reads the two durable-job roles from the current PostgreSQL cluster. */
async function readRoleAttributes(
  sql: DurableJobTestSql,
): Promise<readonly RoleAttributes[]> {
  return sql.unsafe<RoleAttributes[]>(
    `SELECT rolname, rolcanlogin, rolcreatedb
     FROM pg_roles
     WHERE rolname = ANY($1::text[])
     ORDER BY rolname`,
    [Array.from(ROLE_NAMES)],
  );
}

/** Creates both durable-job roles with login and an unsafe database privilege. */
async function createUnsafeRoles(
  sql: DurableJobTestSql,
  createdRoles: RoleName[],
): Promise<void> {
  const existingRoles = await readRoleAttributes(sql);
  if (existingRoles.length > 0) {
    throw new Error(
      "Task 9 role-hardening setup requires both durable-job test roles to be absent.",
    );
  }

  for (const roleName of ROLE_NAMES) {
    await sql.unsafe(`CREATE ROLE "${roleName}" LOGIN CREATEDB`);
    createdRoles.push(roleName);
  }
}

/** Drops only roles created by this test and verifies deterministic cleanup. */
async function cleanupUnsafeRoles(
  sql: DurableJobTestSql,
  createdRoles: readonly RoleName[],
): Promise<void> {
  for (const roleName of createdRoles) {
    await sql.unsafe(`DROP ROLE IF EXISTS "${roleName}"`);
  }
  await expect(readRoleAttributes(sql)).resolves.toEqual([]);
}

/** Executes one migration file with Drizzle statement markers removed. */
async function executeMigration(
  sql: DurableJobTestSql,
  migrationName: string,
): Promise<void> {
  const migrationPath = resolve(DRIZZLE_ROOT, migrationName);
  expect(
    existsSync(migrationPath),
    `Task 9 role hardening requires migration ${migrationName}.`,
  ).toBe(true);
  const migrationSql = readFileSync(migrationPath, "utf8");
  for (const statement of migrationSql.split("--> statement-breakpoint")) {
    if (statement.trim().length > 0) {
      await sql.unsafe(statement);
    }
  }
}

/** Applies the exact Task 9 migration sequence to the isolated database. */
async function applyTask9Migrations(sql: DurableJobTestSql): Promise<void> {
  await executeMigration(sql, TASK9_MIGRATION_NAMES[0]);
  await executeMigration(sql, TASK9_MIGRATION_NAMES[1]);
  await executeMigration(sql, TASK9_MIGRATION_NAMES[2]);
  await executeMigration(sql, TASK9_MIGRATION_NAMES[3]);
  await executeMigration(sql, TASK9_MIGRATION_NAMES[4]);
}

/** Reads protected table and trigger-function ownership for the role contract. */
async function readProtectedObjectOwners(
  sql: DurableJobTestSql,
): Promise<readonly OwnedProtectedObject[]> {
  return sql<OwnedProtectedObject[]>`
    SELECT relation.relname AS "objectName", owner.rolname AS owner
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    JOIN pg_roles AS owner ON owner.oid = relation.relowner
    WHERE namespace.nspname = 'public'
      AND relation.relname = ANY(${sql.array([...AUDIT_TABLE_NAMES])})
    UNION ALL
    SELECT procedure.proname AS "objectName", owner.rolname AS owner
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    JOIN pg_roles AS owner ON owner.oid = procedure.proowner
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'durable_job_reject_audit_mutation'
    ORDER BY "objectName"
  `;
}

/** Reads runtime grants that the migration may apply to audit tables. */
async function readRuntimePrivileges(
  sql: DurableJobTestSql,
): Promise<readonly RuntimePrivilege[]> {
  return sql<RuntimePrivilege[]>`
    SELECT table_name AS "tableName", privilege_type AS "privilegeType"
    FROM information_schema.table_privileges
    WHERE table_schema = 'public'
      AND table_name = ANY(${sql.array([...AUDIT_TABLE_NAMES])})
      AND grantee = 'durable_job_queue_runtime'
    ORDER BY table_name, privilege_type
  `;
}

/** Verifies the successful migration path hardens roles before protected grants and ownership remain. */
async function expectEnforcedRoleHardening(
  sql: DurableJobTestSql,
): Promise<void> {
  const roles = await readRoleAttributes(sql);
  expect(roles).toHaveLength(ROLE_NAMES.length);
  for (const role of roles) {
    expect(
      role.rolcanlogin,
      `${role.rolname} must be NOLOGIN before protected grants and ownership.`,
    ).toBe(false);
  }

  await expect(readProtectedObjectOwners(sql)).resolves.toEqual([
    {
      objectName: "durable_job_audit_events",
      owner: "durable_job_audit_owner",
    },
    {
      objectName: "durable_job_reject_audit_mutation",
      owner: "durable_job_audit_owner",
    },
    {
      objectName: "review_job_adoption_audit_events",
      owner: "durable_job_audit_owner",
    },
  ]);

  await expect(readRuntimePrivileges(sql)).resolves.toEqual([
    { tableName: "durable_job_audit_events", privilegeType: "INSERT" },
    { tableName: "durable_job_audit_events", privilegeType: "SELECT" },
    {
      tableName: "review_job_adoption_audit_events",
      privilegeType: "INSERT",
    },
    {
      tableName: "review_job_adoption_audit_events",
      privilegeType: "SELECT",
    },
  ]);
}

/** Verifies the fail-closed path has no unsafe audit owner or runtime grant. */
async function expectFailedClosedBeforePrivileges(
  sql: DurableJobTestSql,
  error: unknown,
): Promise<void> {
  expect(
    String(error),
    "Unsafe role rejection must identify role hardening.",
  ).toMatch(ROLE_HARDENING_ERROR_PATTERN);
  const protectedObjects = await readProtectedObjectOwners(sql);
  expect(
    protectedObjects.filter(({ owner }) =>
      ROLE_NAMES.includes(owner as RoleName),
    ),
    "Fail-closed migration must reject unsafe roles before protected ownership.",
  ).toEqual([]);
  await expect(readRuntimePrivileges(sql)).resolves.toEqual([]);
}

describe("Task 9 durable-job role hardening PostgreSQL 16 Red contract", () => {
  it("fails closed or enforces NOLOGIN before audit ownership and grants", async () => {
    const harness = await loadHarness();
    if (!harness.isDurableJobPostgres16IntegrationEnabled(process.env)) {
      return;
    }

    const adminUrl = harness.resolveDurableJobPostgres16AdminUrl(process.env);
    const adminSql = postgres(adminUrl.toString(), { max: 1, prepare: false });
    const createdRoles: RoleName[] = [];
    let migrationFailedClosed = false;
    let migrationCompleted = false;
    let executionError: unknown;
    let cleanupError: unknown;

    try {
      await createUnsafeRoles(adminSql, createdRoles);
      try {
        await harness.withDurableJobPostgres16Harness(
          {
            async migrate(context) {
              try {
                await applyTask9Migrations(context.migrationConnection);
              } catch (error) {
                await expectFailedClosedBeforePrivileges(
                  context.migrationConnection,
                  error,
                );
                migrationFailedClosed = true;
                throw error;
              }
            },
          },
          async (context) => {
            migrationCompleted = true;
            await expectEnforcedRoleHardening(context.connectionTwo);
          },
        );
      } catch (error) {
        if (!migrationFailedClosed) {
          throw error;
        }
      }

      expect(
        migrationCompleted || migrationFailedClosed,
        "Migration must enforce NOLOGIN or fail closed for unsafe pre-existing roles.",
      ).toBe(true);
    } catch (error) {
      executionError = error;
    } finally {
      try {
        await cleanupUnsafeRoles(adminSql, createdRoles);
      } catch (error) {
        cleanupError = error;
      }
      await adminSql.end({ timeout: 5 });
    }

    if (executionError !== undefined && cleanupError !== undefined) {
      throw new AggregateError(
        [executionError, cleanupError],
        "Task 9 role-hardening Red contract and cleanup both failed.",
      );
    }
    if (cleanupError !== undefined) {
      throw cleanupError;
    }
    if (executionError !== undefined) {
      throw executionError;
    }
  });
});
