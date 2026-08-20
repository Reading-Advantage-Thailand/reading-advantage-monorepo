import postgres from "postgres";
import {
  buildPostgresOptions,
  normalizePostgresConnectionString,
} from "../connection-options.js";

const ACCOUNTING_DATABASE = "accounting";
const POSTGRES_ROLE_PATTERN = /^[a-z_][a-z0-9_]{0,62}$/;

type AccountingConnectionMismatchCode =
  | "ACCOUNTING_DATABASE_MISMATCH"
  | "ACCOUNTING_PRIVILEGE_MISMATCH"
  | "ACCOUNTING_ROLE_MISMATCH"
  | "ACCOUNTING_URL_INVALID";

interface ConnectionTarget {
  readonly databaseName: string;
  readonly roleName: string;
}

/**
 * Creates a stable connection-boundary error without exposing credentials.
 * @param code The machine-readable connection mismatch category.
 * @param message The secret-free diagnostic message.
 * @returns An error carrying the stable mismatch code.
 */
function connectionMismatch(
  code: AccountingConnectionMismatchCode,
  message: string,
): Error & { code: AccountingConnectionMismatchCode } {
  return Object.assign(new Error(message), { code });
}

/**
 * Derives the required database and role directly from a reviewed accounting URL.
 * @param databaseUrl The direct PostgreSQL connection URL.
 * @returns The exact database and login role the live connection must report.
 * @throws When the URL is not an exact accounting target.
 */
function connectionTargetFromUrl(databaseUrl: string): ConnectionTarget {
  if (databaseUrl !== databaseUrl.trim()) {
    throw connectionMismatch(
      "ACCOUNTING_URL_INVALID",
      "Accounting database URL must not contain surrounding whitespace.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw connectionMismatch(
      "ACCOUNTING_URL_INVALID",
      "Accounting database URL must be an absolute PostgreSQL URL.",
    );
  }

  const databaseName = parsed.pathname.slice(1);
  let roleName = "";
  try {
    roleName = decodeURIComponent(parsed.username);
  } catch {
    // The stable validation error below intentionally omits the malformed URL.
  }

  if (databaseName !== ACCOUNTING_DATABASE) {
    throw connectionMismatch(
      "ACCOUNTING_DATABASE_MISMATCH",
      "Accounting connection URL targets an unapproved database.",
    );
  }
  if (
    parsed.protocol !== "postgresql:" ||
    parsed.hash !== "" ||
    !POSTGRES_ROLE_PATTERN.test(roleName)
  ) {
    throw connectionMismatch(
      "ACCOUNTING_URL_INVALID",
      "Accounting connection must use PostgreSQL, the accounting database name, and a valid login role.",
    );
  }

  return { databaseName, roleName };
}

/**
 * Verifies the resolved database, role, ownership, and non-inheritance boundary.
 * @param sql The newly opened PostgreSQL connection.
 * @param target The URL-derived database and role target.
 * @returns A promise that resolves after the connection identity is verified.
 * @throws When PostgreSQL reports an unexpected or over-privileged connection.
 */
async function validateDirectConnection(
  sql: postgres.Sql,
  target: ConnectionTarget,
): Promise<void> {
  const [probe] = await sql<
    Array<{
      bypass_rls: boolean;
      can_create_database: boolean;
      can_create_role: boolean;
      database_name: string;
      database_owner: string;
      has_memberships: boolean;
      inherits_privileges: boolean;
      replication: boolean;
      role_name: string;
      superuser: boolean;
    }>
  >`
    select
      role.rolbypassrls as bypass_rls,
      role.rolcreatedb as can_create_database,
      role.rolcreaterole as can_create_role,
      database.datname as database_name,
      pg_catalog.pg_get_userbyid(database.datdba) as database_owner,
      exists(
        select 1 from pg_catalog.pg_auth_members membership
         where membership.member = role.oid
      ) as has_memberships,
      role.rolinherit as inherits_privileges,
      role.rolreplication as replication,
      role.rolname as role_name,
      role.rolsuper as superuser
    from pg_catalog.pg_database database
    join pg_catalog.pg_roles role on role.rolname = current_user
    where database.datname = current_database()
  `;

  if (probe?.database_name !== target.databaseName) {
    throw connectionMismatch(
      "ACCOUNTING_DATABASE_MISMATCH",
      `Accounting connection reached database ${probe?.database_name ?? "unknown"}; expected ${target.databaseName}.`,
    );
  }
  if (probe.role_name !== target.roleName) {
    throw connectionMismatch(
      "ACCOUNTING_ROLE_MISMATCH",
      `Accounting connection reached role ${probe.role_name}; expected ${target.roleName}.`,
    );
  }

  const unsafeRole =
    probe.superuser ||
    probe.can_create_database ||
    probe.can_create_role ||
    probe.replication ||
    probe.bypass_rls ||
    probe.inherits_privileges ||
    probe.has_memberships;
  if (unsafeRole || probe.database_owner !== probe.role_name) {
    throw connectionMismatch(
      "ACCOUNTING_PRIVILEGE_MISMATCH",
      "Accounting direct role does not satisfy the reviewed ownership and inheritance boundary.",
    );
  }
}

/**
 * Creates a direct accounting client and verifies its database and migration role.
 * @param input Direct URL plus optional assertions and notice handling for an operational command.
 * @returns A validated direct PostgreSQL client.
 * @throws When configuration is invalid or the connection violates the migration boundary.
 */
export async function createAccountingDirectClient(input: {
  readonly directDatabaseUrl: string;
  readonly expectedDatabaseName?: string;
  readonly expectedRole?: string;
  readonly onnotice?: (notice: postgres.Notice) => void;
}): Promise<postgres.Sql> {
  const target = connectionTargetFromUrl(input.directDatabaseUrl);
  if (
    input.expectedDatabaseName !== undefined &&
    input.expectedDatabaseName !== target.databaseName
  ) {
    throw connectionMismatch(
      "ACCOUNTING_DATABASE_MISMATCH",
      "Accounting direct database expectation does not match the connection URL.",
    );
  }
  if (
    input.expectedRole !== undefined &&
    input.expectedRole !== target.roleName
  ) {
    throw connectionMismatch(
      "ACCOUNTING_ROLE_MISMATCH",
      "Accounting direct role expectation does not match the connection URL.",
    );
  }

  const sql = postgres(
    normalizePostgresConnectionString(input.directDatabaseUrl),
    {
      ...buildPostgresOptions(input.directDatabaseUrl),
      max: 1,
      onnotice: input.onnotice,
      prepare: false,
    },
  );
  try {
    await validateDirectConnection(sql, target);
    return sql;
  } catch (error) {
    await sql.end({ timeout: 1 });
    throw error;
  }
}
