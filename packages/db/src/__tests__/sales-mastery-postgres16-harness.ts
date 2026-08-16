import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const DRIZZLE_ROOT = resolve(PACKAGE_ROOT, "drizzle");
const SALES_MIGRATION = resolve(
  DRIZZLE_ROOT,
  "0052_sales_mastery_tenant_mapping.sql",
);

type PostgresClient = ReturnType<typeof postgres>;

/** Disposable PostgreSQL 16 resources used by Sales Phase 2 live tests. */
export interface SalesMasteryPostgres16Harness {
  /** Direct URL for the isolated database. */
  readonly databaseUrl: string;
  /** Isolated database name. */
  readonly databaseName: string;
  /** PostgreSQL client for the isolated database. */
  readonly sql: PostgresClient;
  /** Closes the client and drops the isolated database. */
  close(): Promise<void>;
}

/** Returns the explicitly configured PostgreSQL test URL without fallbacks. */
function explicitTestUrl(): string {
  const value = process.env.PG_TEST_URL?.trim();
  if (!value) {
    throw new Error(
      "PG_TEST_URL must be explicitly set for Sales PostgreSQL 16 tests; DATABASE_URL is not accepted.",
    );
  }
  const parsed = new URL(value);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(
      "PG_TEST_URL must use the postgres or postgresql protocol.",
    );
  }
  return value;
}

/** Replaces the database path while preserving the explicit test URL settings. */
function withDatabase(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

/** Quotes a generated PostgreSQL identifier. */
function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

/** Applies one SQL migration split at Drizzle statement breakpoints. */
async function applyMigration(
  sql: PostgresClient,
  migrationPath: string,
): Promise<void> {
  const source = await readFile(migrationPath, "utf8");
  for (const statement of source.split("--> statement-breakpoint")) {
    if (statement.trim()) await sql.unsafe(statement);
  }
}

/** Creates the minimum parent schema required by the Sales mapping migration. */
async function createSalesParentSchema(sql: PostgresClient): Promise<void> {
  await sql.unsafe("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await sql.unsafe(`
    CREATE TABLE schools (
      id uuid PRIMARY KEY,
      name text NOT NULL
    )
  `);
}

/** Creates an isolated PostgreSQL 16 database and applies the Sales migration. */
export async function createSalesMasteryPostgres16Harness(): Promise<SalesMasteryPostgres16Harness> {
  const baseUrl = explicitTestUrl();
  const databaseName = `sales_phase2_${process.pid}_${randomUUID().replaceAll("-", "")}`;
  const admin = postgres(baseUrl, { max: 1, prepare: false });
  let sql: PostgresClient | undefined;
  let databaseUrl = "";

  try {
    await admin.unsafe(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    databaseUrl = withDatabase(baseUrl, databaseName);
    sql = postgres(databaseUrl, { max: 8, prepare: false });
    const [{ server_version_num: serverVersionNum }] = await sql<
      { server_version_num: string }[]
    >`
      SHOW server_version_num
    `;
    if (!serverVersionNum.startsWith("16")) {
      throw new Error(
        `Sales live tests require PostgreSQL 16; received ${serverVersionNum}.`,
      );
    }
    await createSalesParentSchema(sql);
    await applyMigration(sql, SALES_MIGRATION);
  } catch (error) {
    await sql?.end({ timeout: 5 });
    await admin.unsafe(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`,
    );
    await admin.end({ timeout: 5 });
    throw error;
  }

  if (!sql) throw new Error("Sales PostgreSQL client was not initialized.");

  let closed = false;
  return {
    databaseUrl,
    databaseName,
    sql,
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await sql.end({ timeout: 5 });
      try {
        await admin.unsafe(
          `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`,
        );
      } finally {
        await admin.end({ timeout: 5 });
      }
    },
  };
}

/** Runs the complete committed Drizzle migration chain in a disposable database. */
export async function runSalesMigrationChainOnPostgres16(): Promise<void> {
  const baseUrl = explicitTestUrl();
  const databaseName = `sales_chain_${process.pid}_${randomUUID().replaceAll("-", "")}`;
  const admin = postgres(baseUrl, { max: 1, prepare: false });
  const databaseUrl = withDatabase(baseUrl, databaseName);
  const sql = postgres(databaseUrl, { max: 4, prepare: false });

  try {
    await admin.unsafe(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    const [{ server_version_num: serverVersionNum }] = await sql<
      { server_version_num: string }[]
    >`
      SHOW server_version_num
    `;
    if (!serverVersionNum.startsWith("16")) {
      throw new Error(
        `Sales migration-chain tests require PostgreSQL 16; received ${serverVersionNum}.`,
      );
    }
    await migrate(drizzle(sql), { migrationsFolder: DRIZZLE_ROOT });
  } finally {
    await sql.end({ timeout: 5 });
    try {
      await admin.unsafe(
        `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`,
      );
    } finally {
      await admin.end({ timeout: 5 });
    }
  }
}
