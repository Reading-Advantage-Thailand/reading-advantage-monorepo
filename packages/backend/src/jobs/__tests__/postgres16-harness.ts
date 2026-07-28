import { randomBytes } from "node:crypto";

import postgres from "postgres";

/** Dedicated environment key for the Task 7 PostgreSQL administration URL. */
export const DURABLE_JOB_PG16_ADMIN_URL_ENV =
  "DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL";

/** Explicit opt-in key for live Task 7 PostgreSQL integration tests. */
export const DURABLE_JOB_PG16_OPT_IN_ENV =
  "DURABLE_JOB_PG16_TEST_OPT_IN";

const GENERIC_DATABASE_ENVIRONMENT_KEYS = [
  "DATABASE_URL",
  "DIRECT_DATABASE_URL",
] as const;
const ADMIN_DATABASE_PATTERN = /^durable_job_test_admin_[a-z0-9_]+$/;
const SCRATCH_DATABASE_PREFIX = "durable_job_pg16_test_";
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const POSTGRES_16_MINIMUM = 160_000;
const POSTGRES_17_MINIMUM = 170_000;
const LIFECYCLE_ADVISORY_LOCK_KEY = 1_947_071_507;

/** PostgreSQL client type used only by durable-job integration tests. */
export type DurableJobTestSql = ReturnType<typeof postgres>;

/** Credentials for an additional least-privilege scratch-database connection. */
export interface DurableJobHarnessConnectionCredentials {
  /** Database role created by a migration or setup hook. */
  readonly username: string;
  /** Ephemeral password retained only in the test process. */
  readonly password: string;
}

/** Resources scoped to one disposable PostgreSQL 16 scratch database. */
export interface DurableJobPostgres16HarnessContext {
  /** Unique disposable database name. */
  readonly databaseName: string;
  /** First session-scoped connection used by locking and migration tests. */
  readonly connectionOne: DurableJobTestSql;
  /** Second independently verified session-scoped connection. */
  readonly connectionTwo: DurableJobTestSql;
  /** Connection reserved as the exact migration entry point. */
  readonly migrationConnection: DurableJobTestSql;
  /** Opens a tracked scratch-database connection for a test-created role. */
  readonly openConnection: (
    credentials: DurableJobHarnessConnectionCredentials,
  ) => DurableJobTestSql;
}

/** Planned Task 7 validation extension points for later reviewed migrations. */
export interface DurableJobPostgres16ValidationHooks {
  /** Runs the total legacy preflight assertions after setup. */
  readonly legacyPreflight?: (
    context: DurableJobPostgres16HarnessContext,
  ) => Promise<void> | void;
  /** Runs stale-role and adoption-generation fence assertions after preflight. */
  readonly roleFence?: (
    context: DurableJobPostgres16HarnessContext,
  ) => Promise<void> | void;
  /** Runs append-only audit privilege negatives after role-fence assertions. */
  readonly auditPrivileges?: (
    context: DurableJobPostgres16HarnessContext,
  ) => Promise<void> | void;
  /** Runs representative reclaim EXPLAIN assertions after privilege checks. */
  readonly explainPlans?: (
    context: DurableJobPostgres16HarnessContext,
  ) => Promise<void> | void;
}

/** Exact ordered lifecycle hooks for a durable-job PostgreSQL 16 test. */
export interface DurableJobPostgres16HarnessHooks {
  /** Applies the explicitly selected test migration exactly once. */
  readonly migrate: (
    context: DurableJobPostgres16HarnessContext,
  ) => Promise<void> | void;
  /** Seeds or configures the migrated scratch database exactly once. */
  readonly setup?: (
    context: DurableJobPostgres16HarnessContext,
  ) => Promise<void> | void;
  /** Ordered extension points reserved for Tasks 7, 9, and 11 onward. */
  readonly validations?: DurableJobPostgres16ValidationHooks;
  /** Removes hook-owned resources exactly once before connection cleanup. */
  readonly teardown?: (
    context: DurableJobPostgres16HarnessContext,
  ) => Promise<void> | void;
}

function isNonEmptyEnvironmentValue(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

function parseDatabaseName(parsed: URL): string {
  if (parsed.pathname.slice(1).includes("/")) {
    throw new Error(
      `${DURABLE_JOB_PG16_ADMIN_URL_ENV} must target one dedicated database.`,
    );
  }

  try {
    return decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    throw new Error(
      `${DURABLE_JOB_PG16_ADMIN_URL_ENV} has an invalid database name.`,
    );
  }
}

/**
 * Resolves and validates the only permitted Task 7 PostgreSQL administration URL.
 * @param environment Environment values supplied by the caller.
 * @returns A parsed loopback URL targeting a dedicated test administration database.
 * @throws When configuration is absent, ambiguous, shared, non-local, or unsafe.
 */
export function resolveDurableJobPostgres16AdminUrl(
  environment: NodeJS.ProcessEnv,
): URL {
  for (const key of GENERIC_DATABASE_ENVIRONMENT_KEYS) {
    if (isNonEmptyEnvironmentValue(environment[key])) {
      throw new Error(
        `${key} must be unset for durable-job PostgreSQL 16 integration tests.`,
      );
    }
  }

  const rawValue = environment[DURABLE_JOB_PG16_ADMIN_URL_ENV];
  if (rawValue === undefined || rawValue.trim().length === 0) {
    throw new Error(
      `${DURABLE_JOB_PG16_ADMIN_URL_ENV} is required for durable-job PostgreSQL 16 integration tests.`,
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error(
      `${DURABLE_JOB_PG16_ADMIN_URL_ENV} must be a valid PostgreSQL URL.`,
    );
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(
      `${DURABLE_JOB_PG16_ADMIN_URL_ENV} must use the PostgreSQL protocol.`,
    );
  }
  if (!LOOPBACK_HOSTNAMES.has(parsed.hostname.toLowerCase())) {
    throw new Error(
      `${DURABLE_JOB_PG16_ADMIN_URL_ENV} must use a loopback hostname; remote hosts require a separately reviewed harness change.`,
    );
  }
  if (!parsed.username) {
    throw new Error(
      `${DURABLE_JOB_PG16_ADMIN_URL_ENV} must include an explicit test role.`,
    );
  }
  if (parsed.search || parsed.hash) {
    throw new Error(
      `${DURABLE_JOB_PG16_ADMIN_URL_ENV} must not use URL parameters or fragments.`,
    );
  }

  const databaseName = parseDatabaseName(parsed);
  if (!ADMIN_DATABASE_PATTERN.test(databaseName)) {
    throw new Error(
      `${DURABLE_JOB_PG16_ADMIN_URL_ENV} must target a dedicated durable_job_test_admin_ database.`,
    );
  }

  return parsed;
}

/**
 * Determines whether live PostgreSQL 16 tests were safely and explicitly enabled.
 * @param environment Environment values supplied by the test process.
 * @returns True only for exact opt-in with a validated dedicated URL.
 * @throws When opt-in is ambiguous or its dedicated URL is absent or unsafe.
 */
export function isDurableJobPostgres16IntegrationEnabled(
  environment: NodeJS.ProcessEnv,
): boolean {
  const optIn = environment[DURABLE_JOB_PG16_OPT_IN_ENV];
  if (optIn === undefined || optIn === "") {
    return false;
  }
  if (optIn !== "1") {
    throw new Error(`${DURABLE_JOB_PG16_OPT_IN_ENV} must be exactly 1.`);
  }

  resolveDurableJobPostgres16AdminUrl(environment);
  return true;
}

function assertGeneratedIdentifier(identifier: string): void {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(identifier)) {
    throw new Error("Generated durable-job PostgreSQL identifier is unsafe.");
  }
}

function quoteIdentifier(identifier: string): string {
  assertGeneratedIdentifier(identifier);
  return `"${identifier}"`;
}

function deriveScratchDatabaseUrl(
  adminUrl: URL,
  databaseName: string,
  credentials?: DurableJobHarnessConnectionCredentials,
): string {
  const derived = new URL(adminUrl);
  derived.pathname = `/${databaseName}`;
  derived.search = "";
  derived.hash = "";
  if (credentials) {
    derived.username = credentials.username;
    derived.password = credentials.password;
  }
  return derived.toString();
}

async function assertPostgres16(
  sql: DurableJobTestSql,
  expectedDatabaseName: string,
): Promise<number> {
  const [probe] = await sql<
    {
      backend_pid: number;
      database_name: string;
      server_version_num: string;
    }[]
  >`
    SELECT
      pg_backend_pid() AS backend_pid,
      current_database() AS database_name,
      current_setting('server_version_num') AS server_version_num
  `;
  const serverVersion = Number(probe?.server_version_num);
  if (probe?.database_name !== expectedDatabaseName) {
    throw new Error("Durable-job PostgreSQL database identity check failed.");
  }
  if (
    !Number.isInteger(serverVersion) ||
    serverVersion < POSTGRES_16_MINIMUM ||
    serverVersion >= POSTGRES_17_MINIMUM
  ) {
    throw new Error("Durable-job integration tests require PostgreSQL 16.");
  }
  if (!Number.isInteger(probe.backend_pid) || probe.backend_pid <= 0) {
    throw new Error("Durable-job PostgreSQL backend identity check failed.");
  }
  return probe.backend_pid;
}

async function runValidationHooks(
  hooks: DurableJobPostgres16ValidationHooks | undefined,
  context: DurableJobPostgres16HarnessContext,
): Promise<void> {
  await hooks?.legacyPreflight?.(context);
  await hooks?.roleFence?.(context);
  await hooks?.auditPrivileges?.(context);
  await hooks?.explainPlans?.(context);
}

/**
 * Runs a test in one disposable PostgreSQL 16 database with two verified sessions.
 * @param hooks Exact migration, setup, future validation, and teardown hooks.
 * @param testBody Test callback executed after all configured validation hooks.
 * @returns The test callback result after deterministic teardown succeeds.
 * @throws When URL guards, PostgreSQL preflight, a hook, the test, or cleanup fails.
 */
export async function withDurableJobPostgres16Harness<T>(
  hooks: DurableJobPostgres16HarnessHooks,
  testBody: (
    context: DurableJobPostgres16HarnessContext,
  ) => Promise<T> | T,
): Promise<T> {
  const adminUrl = resolveDurableJobPostgres16AdminUrl(process.env);
  const adminDatabaseName = parseDatabaseName(adminUrl);
  const suffix = `${process.pid}_${randomBytes(6).toString("hex")}`;
  const databaseName = `${SCRATCH_DATABASE_PREFIX}${suffix}`;
  assertGeneratedIdentifier(databaseName);

  const adminSql = postgres(adminUrl.toString(), { max: 1, prepare: false });
  let connectionOne: DurableJobTestSql | undefined;
  let connectionTwo: DurableJobTestSql | undefined;
  const additionalConnections: DurableJobTestSql[] = [];
  let databaseCreated = false;
  let lifecycleLockHeld = false;
  let cleanupPromise: Promise<void> | undefined;
  let context: DurableJobPostgres16HarnessContext | undefined;

  const acquireLifecycleLock = async (): Promise<void> => {
    if (!lifecycleLockHeld) {
      await adminSql`SELECT pg_advisory_lock(${LIFECYCLE_ADVISORY_LOCK_KEY})`;
      lifecycleLockHeld = true;
    }
  };
  const releaseLifecycleLock = async (): Promise<void> => {
    if (lifecycleLockHeld) {
      await adminSql`SELECT pg_advisory_unlock(${LIFECYCLE_ADVISORY_LOCK_KEY})`;
      lifecycleLockHeld = false;
    }
  };

  const cleanup = (): Promise<void> => {
    if (cleanupPromise) {
      return cleanupPromise;
    }
    cleanupPromise = (async () => {
      const errors: unknown[] = [];

      if (context) {
        try {
          await hooks.teardown?.(context);
        } catch (error) {
          errors.push(error);
        }
      }

      for (const sql of additionalConnections.reverse()) {
        try {
          await sql.end({ timeout: 5 });
        } catch (error) {
          errors.push(error);
        }
      }
      for (const sql of [connectionTwo, connectionOne]) {
        if (sql) {
          try {
            await sql.end({ timeout: 5 });
          } catch (error) {
            errors.push(error);
          }
        }
      }

      try {
        await acquireLifecycleLock();
      } catch (error) {
        errors.push(error);
      }

      if (databaseCreated) {
        try {
          await adminSql`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = ${databaseName}
              AND pid <> pg_backend_pid()
          `;
          await adminSql.unsafe(
            `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`,
          );
          databaseCreated = false;
        } catch (error) {
          errors.push(error);
        }
      }

      try {
        await releaseLifecycleLock();
      } catch (error) {
        errors.push(error);
      }
      try {
        await adminSql.end({ timeout: 5 });
      } catch (error) {
        errors.push(error);
      }

      if (errors.length > 0) {
        throw new AggregateError(
          errors,
          "Durable-job PostgreSQL scratch cleanup failed; operator inspection is required.",
        );
      }
    })();
    return cleanupPromise;
  };

  const handleSignal = (signal: NodeJS.Signals): void => {
    void cleanup().finally(() => {
      process.exit(signal === "SIGINT" ? 130 : 143);
    });
  };
  const handleSigint = (): void => handleSignal("SIGINT");
  const handleSigterm = (): void => handleSignal("SIGTERM");

  let result: T | undefined;
  let executionError: unknown;
  let cleanupError: unknown;

  try {
    await assertPostgres16(adminSql, adminDatabaseName);
    await acquireLifecycleLock();

    const staleDatabases = await adminSql<{ database_name: string }[]>`
      SELECT database.datname AS database_name
      FROM pg_database AS database
      WHERE left(database.datname, ${SCRATCH_DATABASE_PREFIX.length}) =
            ${SCRATCH_DATABASE_PREFIX}
        AND NOT EXISTS (
          SELECT 1
          FROM pg_stat_activity AS activity
          WHERE activity.datname = database.datname
        )
      ORDER BY database.datname
    `;
    if (staleDatabases.length > 0) {
      throw new Error(
        "Stale durable-job scratch databases require explicit operator review; the harness will not delete them automatically.",
      );
    }

    await adminSql.unsafe(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    databaseCreated = true;
    await releaseLifecycleLock();

    const scratchUrl = deriveScratchDatabaseUrl(adminUrl, databaseName);
    connectionOne = postgres(scratchUrl, { max: 1, prepare: false });
    connectionTwo = postgres(scratchUrl, { max: 1, prepare: false });
    const firstBackendPid = await assertPostgres16(
      connectionOne,
      databaseName,
    );
    const secondBackendPid = await assertPostgres16(
      connectionTwo,
      databaseName,
    );
    if (firstBackendPid === secondBackendPid) {
      throw new Error(
        "Durable-job PostgreSQL harness requires two independent sessions.",
      );
    }

    context = {
      databaseName,
      connectionOne,
      connectionTwo,
      migrationConnection: connectionOne,
      openConnection(credentials) {
        const extra = postgres(
          deriveScratchDatabaseUrl(adminUrl, databaseName, credentials),
          { max: 1, prepare: false },
        );
        additionalConnections.push(extra);
        return extra;
      },
    };

    process.once("SIGINT", handleSigint);
    process.once("SIGTERM", handleSigterm);

    await hooks.migrate(context);
    await hooks.setup?.(context);
    await runValidationHooks(hooks.validations, context);
    result = await testBody(context);
  } catch (error) {
    executionError = error;
  } finally {
    process.off("SIGINT", handleSigint);
    process.off("SIGTERM", handleSigterm);
    try {
      await cleanup();
    } catch (error) {
      cleanupError = error;
    }
  }

  if (executionError !== undefined && cleanupError !== undefined) {
    throw new AggregateError(
      [executionError, cleanupError],
      "Durable-job PostgreSQL test and cleanup both failed.",
    );
  }
  if (cleanupError !== undefined) {
    throw cleanupError;
  }
  if (executionError !== undefined) {
    throw executionError;
  }
  return result as T;
}
