import { randomBytes } from "node:crypto";
import postgres from "postgres";

type PostgresSql = ReturnType<typeof postgres>;

const ADMIN_ENVIRONMENT_KEY = "COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL";
const SCRATCH_DATABASE_PREFIX = "company_identity_test_";
const POSTGRES_16_MINIMUM = 160_000;
const POSTGRES_17_MINIMUM = 170_000;
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const LIFECYCLE_ADVISORY_LOCK_KEY = 1_947_071_501;

/** Provides isolated PostgreSQL resources created for one company-identity test. */
export interface CompanyIdentityScratchDatabaseContext {
  /** Explicit loopback administration URL for the stable postgres database. */
  readonly adminDatabaseUrl: string;
  /** Unique scratch database name owned by the migration role. */
  readonly databaseName: string;
  /** Direct PostgreSQL URL authenticated as the migration role. */
  readonly directDatabaseUrl: string;
  /** PgBouncer URL authenticated as the runtime role. */
  readonly runtimeDatabaseUrl: string;
  /** Direct PostgreSQL URL authenticated as the runtime role for privilege tests. */
  readonly runtimeDirectDatabaseUrl: string;
  /** Unique least-privilege runtime login role. */
  readonly runtimeRole: string;
  /** Ephemeral runtime-role password retained only in process memory. */
  readonly runtimePassword: string;
  /** Unique migration login role that owns the scratch database. */
  readonly migrationRole: string;
  /** Ephemeral migration-role password retained only in process memory. */
  readonly migrationPassword: string;
  /** PostgreSQL client connected to the scratch database as the admin user. */
  readonly adminSql: PostgresSql;
}

function parseAdminDatabaseUrl(rawValue: string | undefined): URL {
  if (!rawValue) {
    throw new Error(
      `${ADMIN_ENVIRONMENT_KEY} is required for PostgreSQL tests.`,
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error(`${ADMIN_ENVIRONMENT_KEY} must be a valid PostgreSQL URL.`);
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(
      `${ADMIN_ENVIRONMENT_KEY} must use the PostgreSQL protocol.`,
    );
  }
  if (!LOOPBACK_HOSTNAMES.has(parsed.hostname.toLowerCase())) {
    throw new Error(`${ADMIN_ENVIRONMENT_KEY} must use a loopback hostname.`);
  }
  if (parsed.port !== "5432") {
    throw new Error(`${ADMIN_ENVIRONMENT_KEY} must use port 5432.`);
  }
  if (parsed.pathname !== "/postgres") {
    throw new Error(
      `${ADMIN_ENVIRONMENT_KEY} must target the postgres database.`,
    );
  }
  if (parsed.search || parsed.hash) {
    throw new Error(
      `${ADMIN_ENVIRONMENT_KEY} must not select a database through URL parameters.`,
    );
  }

  return parsed;
}

function assertGeneratedIdentifier(identifier: string): void {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(identifier)) {
    throw new Error("Generated PostgreSQL scratch identifier is unsafe.");
  }
}

function quoteIdentifier(identifier: string): string {
  assertGeneratedIdentifier(identifier);
  return `"${identifier}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function deriveDatabaseUrl(
  base: URL,
  username: string,
  password: string,
  databaseName: string,
  port: number,
): string {
  const derived = new URL(base);
  derived.username = username;
  derived.password = password;
  derived.port = String(port);
  derived.pathname = `/${databaseName}`;
  derived.search = "";
  derived.hash = "";
  return derived.toString();
}

/**
 * Runs a test against a unique PostgreSQL 16 database and disposable login roles.
 * @param testBody Test callback that receives verified scratch resources.
 * @returns The value returned by the test callback after successful cleanup.
 * @throws When configuration, PostgreSQL preflight, test execution, or cleanup fails.
 */
export async function withCompanyIdentityScratchDatabase<T>(
  testBody: (context: CompanyIdentityScratchDatabaseContext) => Promise<T> | T,
): Promise<T> {
  const adminUrl = parseAdminDatabaseUrl(
    process.env.COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL,
  );
  const nonce = randomBytes(6).toString("hex");
  const suffix = `${process.pid}_${nonce}`;
  const databaseName = `${SCRATCH_DATABASE_PREFIX}${suffix}`;
  const runtimeRole = `company_identity_rt_${suffix}`;
  const migrationRole = `company_identity_mg_${suffix}`;
  const runtimePassword = randomBytes(24).toString("base64url");
  const migrationPassword = randomBytes(24).toString("base64url");

  for (const identifier of [databaseName, runtimeRole, migrationRole]) {
    assertGeneratedIdentifier(identifier);
  }

  const serverAdminSql = postgres(adminUrl.toString(), {
    max: 1,
    prepare: false,
  });
  let scratchAdminSql: PostgresSql | undefined;
  let runtimeRoleCreated = false;
  let migrationRoleCreated = false;
  let databaseCreated = false;
  let cleanupPromise: Promise<void> | undefined;
  let lifecycleLockHeld = false;

  const acquireLifecycleLock = async (): Promise<void> => {
    if (!lifecycleLockHeld) {
      await serverAdminSql`SELECT pg_advisory_lock(${LIFECYCLE_ADVISORY_LOCK_KEY})`;
      lifecycleLockHeld = true;
    }
  };

  const releaseLifecycleLock = async (): Promise<void> => {
    if (lifecycleLockHeld) {
      await serverAdminSql`SELECT pg_advisory_unlock(${LIFECYCLE_ADVISORY_LOCK_KEY})`;
      lifecycleLockHeld = false;
    }
  };

  const cleanup = (): Promise<void> => {
    if (cleanupPromise) {
      return cleanupPromise;
    }

    cleanupPromise = (async () => {
      const cleanupErrors: unknown[] = [];

      try {
        await acquireLifecycleLock();
      } catch (error) {
        cleanupErrors.push(error);
      }

      if (scratchAdminSql) {
        try {
          await scratchAdminSql.end({ timeout: 5 });
        } catch (error) {
          cleanupErrors.push(error);
        }
      }

      if (databaseCreated) {
        try {
          await serverAdminSql`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = ${databaseName}
              AND pid <> pg_backend_pid()
          `;
          await serverAdminSql.unsafe(
            `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`,
          );
          databaseCreated = false;
        } catch (error) {
          cleanupErrors.push(error);
        }
      }

      if (runtimeRoleCreated) {
        try {
          await serverAdminSql.unsafe(
            `DROP ROLE IF EXISTS ${quoteIdentifier(runtimeRole)}`,
          );
          runtimeRoleCreated = false;
        } catch (error) {
          cleanupErrors.push(error);
        }
      }

      if (migrationRoleCreated) {
        try {
          await serverAdminSql.unsafe(
            `DROP ROLE IF EXISTS ${quoteIdentifier(migrationRole)}`,
          );
          migrationRoleCreated = false;
        } catch (error) {
          cleanupErrors.push(error);
        }
      }

      try {
        await releaseLifecycleLock();
      } catch (error) {
        cleanupErrors.push(error);
      }

      try {
        await serverAdminSql.end({ timeout: 5 });
      } catch (error) {
        cleanupErrors.push(error);
      }

      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          cleanupErrors,
          `Company-identity scratch cleanup failed; inspect retained database ${databaseName}.`,
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

  let callbackResult: T | undefined;
  let callbackError: unknown;
  let cleanupError: unknown;

  try {
    const [preflight] = await serverAdminSql<
      { database_name: string; server_version_num: string }[]
    >`
      SELECT
        current_database() AS database_name,
        current_setting('server_version_num') AS server_version_num
    `;
    const serverVersion = Number(preflight?.server_version_num);

    if (preflight?.database_name !== "postgres") {
      throw new Error(
        "Company-identity test administration must connect to postgres.",
      );
    }
    if (
      !Number.isInteger(serverVersion) ||
      serverVersion < POSTGRES_16_MINIMUM ||
      serverVersion >= POSTGRES_17_MINIMUM
    ) {
      throw new Error(
        "Company-identity integration tests require PostgreSQL 16.",
      );
    }

    await acquireLifecycleLock();
    const staleDatabases = await serverAdminSql<{ database_name: string }[]>`
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
      const retainedNames = staleDatabases
        .map(({ database_name }) => JSON.stringify(database_name))
        .join(", ");
      throw new Error(
        `Stale company-identity scratch databases require operator cleanup: ${retainedNames}. ` +
          "Inspect active sessions, terminate only confirmed stale sessions, and run DROP DATABASE for each retained name; the harness deletes nothing during stale preflight.",
      );
    }

    process.once("SIGINT", handleSigint);
    process.once("SIGTERM", handleSigterm);

    await serverAdminSql.unsafe(
      `CREATE ROLE ${quoteIdentifier(migrationRole)} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${quoteLiteral(migrationPassword)}`,
    );
    migrationRoleCreated = true;
    await serverAdminSql.unsafe(
      `CREATE ROLE ${quoteIdentifier(runtimeRole)} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${quoteLiteral(runtimePassword)}`,
    );
    runtimeRoleCreated = true;
    await serverAdminSql.unsafe(
      `CREATE DATABASE ${quoteIdentifier(databaseName)} OWNER ${quoteIdentifier(migrationRole)}`,
    );
    databaseCreated = true;
    await serverAdminSql.unsafe(
      `GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName)} TO ${quoteIdentifier(runtimeRole)}`,
    );

    const scratchAdminDatabaseUrl = deriveDatabaseUrl(
      adminUrl,
      decodeURIComponent(adminUrl.username),
      decodeURIComponent(adminUrl.password),
      databaseName,
      5432,
    );
    scratchAdminSql = postgres(scratchAdminDatabaseUrl, {
      max: 1,
      prepare: false,
    });
    const [scratchProbe] = await scratchAdminSql<
      { database_name: string; server_version_num: string }[]
    >`
      SELECT
        current_database() AS database_name,
        current_setting('server_version_num') AS server_version_num
    `;
    if (
      scratchProbe?.database_name !== databaseName ||
      Number(scratchProbe.server_version_num) < POSTGRES_16_MINIMUM ||
      Number(scratchProbe.server_version_num) >= POSTGRES_17_MINIMUM
    ) {
      throw new Error(
        "Scratch database identity or PostgreSQL version verification failed.",
      );
    }

    await releaseLifecycleLock();

    callbackResult = await testBody({
      adminDatabaseUrl: adminUrl.toString(),
      databaseName,
      directDatabaseUrl: deriveDatabaseUrl(
        adminUrl,
        migrationRole,
        migrationPassword,
        databaseName,
        5432,
      ),
      runtimeDatabaseUrl: deriveDatabaseUrl(
        adminUrl,
        runtimeRole,
        runtimePassword,
        databaseName,
        6432,
      ),
      runtimeDirectDatabaseUrl: deriveDatabaseUrl(
        adminUrl,
        runtimeRole,
        runtimePassword,
        databaseName,
        5432,
      ),
      runtimeRole,
      runtimePassword,
      migrationRole,
      migrationPassword,
      adminSql: scratchAdminSql,
    });
  } catch (error) {
    callbackError = error;
  } finally {
    process.off("SIGINT", handleSigint);
    process.off("SIGTERM", handleSigterm);

    try {
      await cleanup();
    } catch (error) {
      cleanupError = error;
    }
  }

  if (callbackError !== undefined && cleanupError !== undefined) {
    throw new AggregateError(
      [callbackError, cleanupError],
      "Company-identity test and scratch cleanup both failed.",
    );
  }
  if (cleanupError !== undefined) {
    throw cleanupError;
  }
  if (callbackError !== undefined) {
    throw callbackError;
  }

  return callbackResult as T;
}
