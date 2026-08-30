import postgres from "postgres";
import {
  buildPostgresOptions,
  normalizePostgresConnectionString,
} from "../connection-options.js";

const ACCOUNTING_DATABASE = "accounting";
const POSTGRES_ROLE_PATTERN = /^[a-z_][a-z0-9_]{0,62}$/;

type AccountingConnectionMismatchCode =
  | "ACCOUNTING_DATABASE_MISMATCH"
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
 * Derives the required database and role directly from a reviewed Accounting URL.
 * @param databaseUrl The runtime or direct PostgreSQL connection URL.
 * @returns The exact database and login role the live connection must report.
 * @throws When the URL is not an exact Accounting database target.
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

  if (
    parsed.protocol !== "postgresql:" ||
    parsed.hash !== "" ||
    databaseName !== ACCOUNTING_DATABASE ||
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
 * Opens a validated Accounting PostgreSQL connection.
 * @param databaseUrl The credential-bearing connection URL.
 * @param poolMax The maximum client-side connection count.
 * @param onnotice Optional PostgreSQL notice handler for structured commands.
 * @returns A validated PostgreSQL client configured without prepared statements.
 * @throws When the URL, database, or role is invalid.
 */
function createValidatedClient(
  databaseUrl: string,
  poolMax: number,
  onnotice?: (notice: postgres.Notice) => void,
): postgres.Sql {
  connectionTargetFromUrl(databaseUrl);
  return postgres(normalizePostgresConnectionString(databaseUrl), {
    ...buildPostgresOptions(databaseUrl),
    max: poolMax,
    onnotice,
    prepare: false,
  });
}

/**
 * Creates the Accounting runtime client and verifies its target database.
 * @param input Runtime URL plus optional assertions used by topology tests.
 * @returns A validated PostgreSQL client configured without prepared statements.
 * @throws When configuration is invalid or the connection target is wrong.
 */
export async function createAccountingRuntimeClient(input: {
  readonly databaseUrl: string;
  readonly expectedDatabaseName?: string;
  readonly expectedRole?: string;
  readonly poolMax?: number;
}): Promise<postgres.Sql> {
  const poolMax = input.poolMax ?? 3;
  if (!Number.isInteger(poolMax) || poolMax < 1 || poolMax > 20) {
    throw new Error(
      "Accounting runtime poolMax must be an integer from 1 to 20.",
    );
  }
  const target = connectionTargetFromUrl(input.databaseUrl);
  if (
    input.expectedDatabaseName !== undefined &&
    input.expectedDatabaseName !== target.databaseName
  ) {
    throw connectionMismatch(
      "ACCOUNTING_DATABASE_MISMATCH",
      "Accounting runtime database expectation does not match the connection URL.",
    );
  }
  if (
    input.expectedRole !== undefined &&
    input.expectedRole !== target.roleName
  ) {
    throw connectionMismatch(
      "ACCOUNTING_DATABASE_MISMATCH",
      "Accounting runtime role expectation does not match the connection URL.",
    );
  }
  return createValidatedClient(input.databaseUrl, poolMax);
}

/**
 * Creates a direct Accounting client for migrations.
 * @param input Direct URL plus optional assertions and notice handling.
 * @returns A validated direct PostgreSQL client.
 * @throws When configuration is invalid or the connection target is wrong.
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
      "ACCOUNTING_DATABASE_MISMATCH",
      "Accounting direct role expectation does not match the connection URL.",
    );
  }
  return createValidatedClient(input.directDatabaseUrl, 1, input.onnotice);
}
