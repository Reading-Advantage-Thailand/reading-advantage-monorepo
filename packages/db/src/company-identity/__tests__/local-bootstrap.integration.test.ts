import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { withCompanyIdentityScratchDatabase } from "./test-postgres.js";

const PRODUCT_DATABASES = [
  "reading_advantage",
  "primary_advantage",
  "science_advantage",
] as const;
const execFileAsync = promisify(execFile);

interface DatabaseFingerprint {
  readonly schemaSha256: string;
  readonly dataSha256: string;
  readonly rowCounts: readonly string[];
}

interface BootstrapModule {
  ensureLocalCompanyIdentityDatabase(input: {
    adminDatabaseUrl: string;
  }): Promise<void>;
}

async function loadBootstrapModule(): Promise<BootstrapModule> {
  try {
    const moduleUrl = new URL("../bootstrap.js", import.meta.url).href;
    const loaded = (await import(/* @vite-ignore */ moduleUrl)) as Record<
      string,
      unknown
    >;
    expect(
      loaded.ensureLocalCompanyIdentityDatabase,
      "PostgreSQL 16 was reached, but ensureLocalCompanyIdentityDatabase is absent.",
    ).toBeTypeOf("function");
    return loaded as unknown as BootstrapModule;
  } catch (error) {
    throw new Error(
      "PostgreSQL 16 was reached, but the production local bootstrap primitive is absent.",
      { cause: error },
    );
  }
}

function databaseUrl(adminDatabaseUrl: string, databaseName: string): string {
  const url = new URL(adminDatabaseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z_][a-z0-9_$]*$/.test(identifier)) {
    throw new Error(`Unsafe catalog identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

async function databaseFingerprint(
  sql: ReturnType<typeof postgres>,
  targetDatabaseUrl: string,
): Promise<DatabaseFingerprint> {
  const tables = await sql<Array<{ table_name: string; table_schema: string }>>`
    select table_schema, table_name
      from information_schema.tables
     where table_type = 'BASE TABLE'
       and table_schema not in ('information_schema', 'pg_catalog')
       and table_schema not like 'pg_toast%'
     order by table_schema, table_name
  `;
  const rowCounts: string[] = [];
  for (const { table_name: tableName, table_schema: tableSchema } of tables) {
    const [row] = await sql.unsafe<Array<{ count: number }>>(
      `select count(*)::int as count from ${quoteIdentifier(tableSchema)}.${quoteIdentifier(tableName)}`,
    );
    rowCounts.push(`${tableSchema}.${tableName}:${row!.count}`);
  }

  const dumpHash = async (section: "schema" | "data"): Promise<string> => {
    const parsed = new URL(targetDatabaseUrl);
    const { stdout } = await execFileAsync(
      "pg_dump",
      [
        section === "schema" ? "--schema-only" : "--data-only",
        "--no-owner",
        "--no-privileges",
        "--dbname",
        decodeURIComponent(parsed.pathname.slice(1)),
      ],
      {
        env: {
          ...process.env,
          PGHOST: parsed.hostname,
          PGPORT: parsed.port || "5432",
          PGUSER: decodeURIComponent(parsed.username),
          PGPASSWORD: decodeURIComponent(parsed.password),
          PGOPTIONS: "-c default_transaction_read_only=on",
        },
        maxBuffer: 256 * 1024 * 1024,
      },
    );
    const normalizedDump = stdout
      .replace(/^\\restrict .+$/gm, "\\restrict <normalized>")
      .replace(/^\\unrestrict .+$/gm, "\\unrestrict <normalized>");
    return createHash("sha256").update(normalizedDump).digest("hex");
  };

  return {
    schemaSha256: await dumpHash("schema"),
    dataSha256: await dumpHash("data"),
    rowCounts,
  };
}

async function findContainerCli(): Promise<"podman" | "docker"> {
  for (const candidate of ["podman", "docker"] as const) {
    try {
      await execFileAsync(candidate, ["version"]);
      return candidate;
    } catch {
      // Try the other supported local container runtime.
    }
  }
  throw new Error("Fresh-volume bootstrap proof requires podman or docker.");
}

async function withFreshPostgres16Volume<T>(
  testBody: (adminDatabaseUrl: string) => Promise<T>,
): Promise<T> {
  const cli = await findContainerCli();
  const suffix = `${process.pid}_${randomBytes(5).toString("hex")}`;
  const containerName = `company_identity_fresh_${suffix}`;
  const password = randomBytes(24).toString("base64url");
  let started = false;

  try {
    await execFileAsync(
      cli,
      [
        "run",
        "--detach",
        "--rm",
        "--name",
        containerName,
        "--label",
        "company-identity-test=true",
        "--tmpfs",
        "/var/lib/postgresql/data:rw",
        "--env",
        "POSTGRES_PASSWORD",
        "--publish",
        "127.0.0.1::5432",
        "postgres:16-alpine",
      ],
      { env: { ...process.env, POSTGRES_PASSWORD: password } },
    );
    started = true;
    const { stdout } = await execFileAsync(cli, [
      "port",
      containerName,
      "5432/tcp",
    ]);
    const portMatch = stdout.trim().match(/:(\d+)$/);
    if (!portMatch) {
      throw new Error("Could not resolve the disposable PostgreSQL port.");
    }
    const adminDatabaseUrl =
      `postgresql://postgres:${encodeURIComponent(password)}` +
      `@127.0.0.1:${portMatch[1]}/postgres`;
    const sql = postgres(adminDatabaseUrl, {
      connect_timeout: 2,
      max: 1,
      prepare: false,
    });
    try {
      let lastError: unknown;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        try {
          const [probe] = await sql<
            { database_name: string; version_number: string }[]
          >`select current_database() as database_name,
                   current_setting('server_version_num') as version_number`;
          if (
            probe?.database_name === "postgres" &&
            Number(probe.version_number) >= 160_000 &&
            Number(probe.version_number) < 170_000
          ) {
            return await testBody(adminDatabaseUrl);
          }
        } catch (error) {
          lastError = error;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error("Disposable PostgreSQL 16 did not become ready.", {
        cause: lastError,
      });
    } finally {
      await sql.end({ timeout: 2 });
    }
  } finally {
    if (started) {
      await execFileAsync(cli, ["rm", "--force", containerName]);
    }
  }
}

describe("persistent local company identity database bootstrap", () => {
  it("is idempotent, preserves product fingerprints, and creates no shared test database", async () => {
    await withCompanyIdentityScratchDatabase(
      async ({ adminDatabaseUrl, adminSql }) => {
        const databaseRows = await adminSql<
          Array<{ datname: string }>
        >`select datname from pg_database where datname in ${adminSql(PRODUCT_DATABASES)}`;
        expect(databaseRows.map(({ datname }) => datname).sort()).toEqual(
          [...PRODUCT_DATABASES].sort(),
        );

        const bootstrap = await loadBootstrapModule();
        await withFreshPostgres16Volume(async (freshAdminDatabaseUrl) => {
          const freshAdminSql = postgres(freshAdminDatabaseUrl, {
            max: 1,
            prepare: false,
          });
          try {
            expect(
              await freshAdminSql`
              select datname from pg_database where datname = 'company_identity'
            `,
            ).toEqual([]);
            await bootstrap.ensureLocalCompanyIdentityDatabase({
              adminDatabaseUrl: freshAdminDatabaseUrl,
            });
            const freshIdentityUrl = databaseUrl(
              freshAdminDatabaseUrl,
              "company_identity",
            );
            const freshIdentitySql = postgres(freshIdentityUrl, { max: 1 });
            try {
              const afterCreate = await databaseFingerprint(
                freshIdentitySql,
                freshIdentityUrl,
              );
              await bootstrap.ensureLocalCompanyIdentityDatabase({
                adminDatabaseUrl: freshAdminDatabaseUrl,
              });
              expect(
                await databaseFingerprint(freshIdentitySql, freshIdentityUrl),
              ).toEqual(afterCreate);
            } finally {
              await freshIdentitySql.end();
            }
          } finally {
            await freshAdminSql.end();
          }
        });

        const productClients = PRODUCT_DATABASES.map((databaseName) => ({
          databaseName,
          databaseUrl: databaseUrl(adminDatabaseUrl, databaseName),
          sql: postgres(databaseUrl(adminDatabaseUrl, databaseName), {
            max: 1,
          }),
        }));

        try {
          for (const { sql } of productClients) {
            await sql`set default_transaction_read_only = on`;
          }
          const productFingerprintsBefore = await Promise.all(
            productClients.map(
              async ({ databaseName, databaseUrl: productUrl, sql }) => ({
                databaseName,
                fingerprint: await databaseFingerprint(sql, productUrl),
              }),
            ),
          );

          await adminSql`
          create table local_bootstrap_non_target_sentinel (
            id integer primary key,
            value text not null
          )
        `;
          await adminSql`
          insert into local_bootstrap_non_target_sentinel (id, value)
          values (1, 'preserve-disposable-scratch')
        `;

          await bootstrap.ensureLocalCompanyIdentityDatabase({
            adminDatabaseUrl,
          });
          const identityUrl = databaseUrl(adminDatabaseUrl, "company_identity");
          const identitySql = postgres(identityUrl, { max: 1 });
          const [
            identityFingerprintAfterFirstRun,
            identityFingerprintAfterReplay,
          ] = await (async (): Promise<
            [DatabaseFingerprint, DatabaseFingerprint]
          > => {
            try {
              await identitySql`set default_transaction_read_only = on`;
              const firstFingerprint = await databaseFingerprint(
                identitySql,
                identityUrl,
              );
              await bootstrap.ensureLocalCompanyIdentityDatabase({
                adminDatabaseUrl,
              });
              return [
                firstFingerprint,
                await databaseFingerprint(identitySql, identityUrl),
              ];
            } finally {
              await identitySql.end();
            }
          })();

          expect(
            await adminSql`
            select datname
              from pg_database
             where datname in ('company_identity', 'company_identity_test')
             order by datname
          `,
          ).toEqual([{ datname: "company_identity" }]);

          expect(identityFingerprintAfterReplay).toEqual(
            identityFingerprintAfterFirstRun,
          );
          expect(
            await adminSql`
            select id, value from local_bootstrap_non_target_sentinel
          `,
          ).toEqual([{ id: 1, value: "preserve-disposable-scratch" }]);
          expect(
            await Promise.all(
              productClients.map(
                async ({ databaseName, databaseUrl: productUrl, sql }) => ({
                  databaseName,
                  fingerprint: await databaseFingerprint(sql, productUrl),
                }),
              ),
            ),
          ).toEqual(productFingerprintsBefore);
        } finally {
          for (const { sql } of productClients) {
            await sql.end();
          }
        }
      },
    );
  }, 120_000);
});
