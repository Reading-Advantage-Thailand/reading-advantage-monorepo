/**
 * The Storytime schema, migration, and tenant registry (test strategy P2b.3, task 2b.2).
 *
 * The schema lives in a dedicated module: `packages/db/src/schema/storytime/index.ts`, with its
 * own drizzle config and its own migration folder. It is not part of the shared schema barrel or
 * the shared migrations. The four tables are EXEMPT in the tenant registry.
 *
 * At the base every case fails on `Missing packages/db/src/schema/storytime/index.ts`. The module
 * is loaded only after that assertion, so no case fails with a load error.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../../..");
const SCHEMA_ENTRY = resolve(REPO, "packages/db/src/schema/storytime/index.ts");
const SCHEMA_DIST = resolve(REPO, "packages/db/dist/schema/storytime/index.js");
const MIGRATION_DIR = resolve(REPO, "packages/db/drizzle-storytime");
const DRIZZLE_CONFIG = resolve(REPO, "packages/db/drizzle.storytime.config.ts");
const TENANT_REGISTRY = resolve(REPO, "packages/domain/src/tenant-registry.ts");
const SHARED_BARREL = resolve(REPO, "packages/db/src/schema/index.ts");
const SHARED_MIGRATIONS = resolve(REPO, "packages/db/drizzle");
const PACKAGE_JSON = resolve(REPO, "packages/db/package.json");
const SCHEMA_LABEL = "packages/db/src/schema/storytime/index.ts";

/** The four pinned table exports. */
const TABLE_EXPORTS = [
  "storytimeAccounts",
  "storytimeSessions",
  "storytimeLoginAttempts",
  "storytimeAuditEvents",
] as const;

type TableConfig = {
  name: string;
  columns: Array<{ name: string; notNull: boolean; primary: boolean }>;
  indexes: Array<{ config: { name: string; unique?: boolean; columns: Array<{ name: string }> } }>;
  uniqueConstraints: Array<{ name: string; columns: Array<{ name: string }> }>;
  foreignKeys: Array<{ onDelete?: string; reference(): { columns: Array<{ name: string }> } }>;
  checks: Array<{ name: string; value: unknown }>;
};

/**
 * Loads the schema source module after the pinned path check.
 * @returns The module namespace with the four tables.
 */
async function loadSchema(): Promise<Record<string, unknown>> {
  return (await import("../schema/storytime/index.js")) as Record<string, unknown>;
}

/**
 * Reads one table config from the drizzle metadata.
 * @param schema The schema module.
 * @param name The export name.
 * @returns The table config.
 */
async function tableConfig(
  schema: Record<string, unknown>,
  name: string,
): Promise<TableConfig> {
  const table = schema[name];
  expect(table, `${name} is missing`).toBeDefined();
  const { getTableConfig } = await import("drizzle-orm/pg-core");
  return getTableConfig(table as Parameters<typeof getTableConfig>[0]) as unknown as TableConfig;
}

/**
 * Gives the SQL text of every check constraint of a table.
 * @param config The table config.
 * @returns The check SQL strings.
 */
async function checkSql(config: TableConfig): Promise<string[]> {
  const { PgDialect } = await import("drizzle-orm/pg-core");
  const dialect = new PgDialect();
  return config.checks.map((check) => dialect.sqlToQuery(check.value as never).sql);
}

/**
 * Reports whether a unique key covers exactly the named columns.
 * @param config The table config.
 * @param columns The column names.
 * @returns True when a unique index or unique constraint covers the columns.
 */
function hasUnique(config: TableConfig, columns: string[]): boolean {
  const wanted = [...columns].sort().join(",");
  const indexHit = config.indexes.some(
    (index) =>
      index.config.unique === true &&
      index.config.columns.map((column) => column.name).sort().join(",") === wanted,
  );
  const constraintHit = config.uniqueConstraints.some(
    (constraint) => constraint.columns.map((column) => column.name).sort().join(",") === wanted,
  );
  return indexHit || constraintHit;
}

/**
 * Reports whether an index covers exactly the named columns.
 * @param config The table config.
 * @param columns The column names.
 * @returns True when an index covers the columns in order.
 */
function hasIndex(config: TableConfig, columns: string[]): boolean {
  return config.indexes.some(
    (index) =>
      index.config.columns.map((column) => column.name).join(",") === columns.join(","),
  );
}

describe("storytime schema (red)", () => {
  it("exports the four pinned tables with the account role and username rules", async () => {
    expect(existsSync(SCHEMA_ENTRY), `Missing ${SCHEMA_LABEL}`).toBe(true);
    const schema = await loadSchema();
    let exported = 0;
    for (const name of TABLE_EXPORTS) {
      if (schema[name]) exported += 1;
    }
    expect(exported, "exported tables").toBe(4);

    const accounts = await tableConfig(schema, "storytimeAccounts");
    const accountColumns = accounts.columns.map((column) => column.name);
    for (const column of ["id", "username", "password_hash", "role", "disabled", "created_at"]) {
      expect(accountColumns, `storytime_accounts needs ${column}`).toContain(column);
    }
    const roleSql = (await checkSql(accounts)).join(" ");
    for (const role of ["family", "class", "teacher"]) {
      expect(roleSql).toContain(role);
    }
    expect(hasUnique(accounts, ["username"]), "username is unique").toBe(true);
    const lowerSql = (await checkSql(accounts)).join(" ");
    expect(lowerSql, "username is lower case").toMatch(/lower\s*\(\s*"?username"?\s*\)/i);
  });

  it("gives sessions a unique 64-hex digest, a cascade account key, and the use index", async () => {
    expect(existsSync(SCHEMA_ENTRY), `Missing ${SCHEMA_LABEL}`).toBe(true);
    const schema = await loadSchema();
    const sessions = await tableConfig(schema, "storytimeSessions");
    const columns = sessions.columns.map((column) => column.name);
    for (const column of ["token_digest", "account_id", "expires_at", "last_use_at", "created_at"]) {
      expect(columns, `storytime_sessions needs ${column}`).toContain(column);
    }
    expect(hasUnique(sessions, ["token_digest"]), "token_digest is unique").toBe(true);
    const digestSql = (await checkSql(sessions)).join(" ");
    expect(digestSql, "the digest is 64 hex characters").toMatch(/64/);
    expect(digestSql, "the digest check names token_digest").toContain("token_digest");
    expect(hasIndex(sessions, ["account_id", "created_at"]), "index on account and creation").toBe(
      true,
    );
    const cascade = sessions.foreignKeys.some(
      (key) =>
        key.onDelete === "cascade" &&
        key.reference().columns.map((column) => column.name).join(",") === "account_id",
    );
    expect(cascade, "account_id has ON DELETE CASCADE").toBe(true);
  });

  it("keys login attempts by their bucket key and keeps audit events append only", async () => {
    expect(existsSync(SCHEMA_ENTRY), `Missing ${SCHEMA_LABEL}`).toBe(true);
    const schema = await loadSchema();
    const attempts = await tableConfig(schema, "storytimeLoginAttempts");
    const key = attempts.columns.find((column) => column.name === "key");
    expect(key, "storytime_login_attempts needs key").toBeDefined();
    expect(key?.primary, "key is the primary key").toBe(true);
    for (const column of ["failed_count", "window_start"]) {
      expect(attempts.columns.map((entry) => entry.name)).toContain(column);
    }
    const audit = await tableConfig(schema, "storytimeAuditEvents");
    for (const column of ["action", "created_at"]) {
      expect(audit.columns.map((entry) => entry.name)).toContain(column);
    }
  });

  it("registers the four tables as EXEMPT in the tenant registry", async () => {
    expect(existsSync(SCHEMA_ENTRY), `Missing ${SCHEMA_LABEL}`).toBe(true);
    expect(existsSync(SCHEMA_DIST), "Missing packages/db/dist/schema/storytime/index.js").toBe(true);
    const built = (await import(/* @vite-ignore */ pathToFileURL(SCHEMA_DIST).href)) as Record<
      string,
      unknown
    >;
    const registry = (await import(/* @vite-ignore */ pathToFileURL(TENANT_REGISTRY).href)) as {
      classifyTable(table: unknown): string;
    };
    let exempt = 0;
    for (const name of TABLE_EXPORTS) {
      expect(built[name], `${name} is missing from the built module`).toBeDefined();
      expect(registry.classifyTable(built[name]), `${name} is EXEMPT`).toBe("EXEMPT");
      exempt += 1;
    }
    expect(exempt, "exempt_tables").toBe(4);
    const registrySource = readFileSync(TENANT_REGISTRY, "utf8");
    expect(registrySource).toContain("@reading-advantage/db/storytime/schema");
  });

  it("keeps the storytime module out of the shared barrel and the shared migrations", async () => {
    expect(existsSync(SCHEMA_ENTRY), `Missing ${SCHEMA_LABEL}`).toBe(true);
    const barrel = readFileSync(SHARED_BARREL, "utf8");
    expect(barrel.toLowerCase(), "the shared barrel holds no storytime export").not.toContain(
      "storytime",
    );
    const sharedMigrationNames = existsSync(SHARED_MIGRATIONS)
      ? readdirSync(SHARED_MIGRATIONS)
      : [];
    expect(
      sharedMigrationNames.filter((name) => name.toLowerCase().includes("storytime")),
      "no storytime file in the shared migrations",
    ).toEqual([]);
  });

  it("holds one migration SQL file, one journal entry, the config, and the script", async () => {
    expect(existsSync(SCHEMA_ENTRY), `Missing ${SCHEMA_LABEL}`).toBe(true);
    expect(existsSync(MIGRATION_DIR), "Missing packages/db/drizzle-storytime").toBe(true);
    expect(existsSync(DRIZZLE_CONFIG), "Missing packages/db/drizzle.storytime.config.ts").toBe(true);
    const sqlFiles = readdirSync(MIGRATION_DIR).filter((name) => name.endsWith(".sql"));
    expect(sqlFiles, "one migration SQL file").toHaveLength(1);
    const journalPath = join(MIGRATION_DIR, "meta/_journal.json");
    expect(existsSync(journalPath), "Missing packages/db/drizzle-storytime/meta/_journal.json").toBe(
      true,
    );
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
      entries: Array<{ tag: string }>;
    };
    expect(journal.entries, "one journal entry").toHaveLength(1);
    const config = readFileSync(DRIZZLE_CONFIG, "utf8");
    expect(config).toContain("src/schema/storytime/index.ts");
    expect(config).toContain("drizzle-storytime");
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.["storytime:migrate"], "Missing the storytime:migrate script").toBeDefined();
    expect(pkg.scripts?.["storytime:migrate"]).toContain("storytime");
  });

  it("applies the committed migration in PGlite and raises on an audit change", async () => {
    expect(existsSync(SCHEMA_ENTRY), `Missing ${SCHEMA_LABEL}`).toBe(true);
    expect(existsSync(MIGRATION_DIR), "Missing packages/db/drizzle-storytime").toBe(true);
    const sqlFiles = readdirSync(MIGRATION_DIR).filter((name) => name.endsWith(".sql"));
    expect(sqlFiles.length, "exactly one migration SQL file").toBe(1);
    const sqlText = readFileSync(join(MIGRATION_DIR, sqlFiles[0]), "utf8");
    expect(sqlText, "the audit trigger blocks update and delete").toMatch(
      /BEFORE\s+UPDATE\s+OR\s+DELETE/i,
    );
    expect(sqlText).toMatch(/RAISE\s+EXCEPTION/i);
    const { PGlite } = (await import("@electric-sql/pglite")) as {
      PGlite: new () => {
        exec(sql: string): Promise<unknown>;
        query(sql: string): Promise<{ rows: Array<Record<string, unknown>> }>;
      };
    };
    const database = new PGlite();
    for (const statement of sqlText.split("--> statement-breakpoint")) {
      if (statement.trim()) await database.exec(statement);
    }
    const result = await database.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    expect(result.rows.map((row) => row.table_name)).toEqual([
      "storytime_accounts",
      "storytime_audit_events",
      "storytime_login_attempts",
      "storytime_sessions",
    ]);
    await database.exec(
      "INSERT INTO storytime_audit_events (action) VALUES ('sign_in_success')",
    ).catch(async () => {
      // A schema with a required column other than action needs one more value.
      await database.exec(
        "INSERT INTO storytime_audit_events (action, created_at) VALUES ('sign_in_success', now())",
      );
    });
    await expect(
      database.exec("UPDATE storytime_audit_events SET action = 'tampered'"),
    ).rejects.toThrow();
    await expect(database.exec("DELETE FROM storytime_audit_events")).rejects.toThrow();
  });
});
