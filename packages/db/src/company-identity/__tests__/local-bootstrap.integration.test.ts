import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import postgres from "postgres";
import { describe, expect, it } from "vitest";

const PRODUCT_DATABASES = [
  "reading_advantage",
  "primary_advantage",
  "science_advantage",
] as const;
const execFileAsync = promisify(execFile);

interface DatabaseFingerprint {
  readonly dataSha256: string;
  readonly rowCounts: readonly string[];
  readonly schemaSha256: string;
}

interface BootstrapModule {
  ensureLocalCompanyIdentityDatabase(input: {
    adminDatabaseUrl: string;
    directDatabaseUrl: string;
    runtimeDatabaseUrl: string;
  }): Promise<void>;
}

interface ClientModule {
  proveCompanyIdentityConnectionTopology(input: {
    directDatabaseUrl: string;
    runtimeDatabaseUrl: string;
  }): Promise<void>;
}

interface FreshVolumeConnections {
  readonly adminDatabaseUrl: string;
  readonly directDatabaseUrl: string;
  readonly runtimeDatabaseUrl: string;
}

/**
 * Loads the production local-bootstrap primitive after PostgreSQL preflight.
 * @returns The production bootstrap module.
 * @throws When the module or expected export is absent.
 */
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

/**
 * Loads the production topology proof after PostgreSQL preflight.
 * @returns The production company-identity client module.
 * @throws When the module or topology export is absent.
 */
async function loadClientModule(): Promise<ClientModule> {
  try {
    const moduleUrl = new URL("../client.js", import.meta.url).href;
    const loaded = (await import(/* @vite-ignore */ moduleUrl)) as Record<
      string,
      unknown
    >;
    expect(
      loaded.proveCompanyIdentityConnectionTopology,
      "PostgreSQL 16 was reached, but proveCompanyIdentityConnectionTopology is absent.",
    ).toBeTypeOf("function");
    return loaded as unknown as ClientModule;
  } catch (error) {
    throw new Error(
      "PostgreSQL 16 was reached, but the production topology proof is absent.",
      { cause: error },
    );
  }
}

/**
 * Re-targets an administrative URL to a named database.
 * @param adminDatabaseUrl PostgreSQL administrator URL.
 * @param databaseName Database pathname to select.
 * @returns The derived PostgreSQL connection URL.
 */
function databaseUrl(adminDatabaseUrl: string, databaseName: string): string {
  const url = new URL(adminDatabaseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

/**
 * Quotes a fixed safe catalog identifier used by the local-volume proof.
 * @param identifier Catalog identifier to validate.
 * @returns The quoted PostgreSQL identifier.
 * @throws When the identifier is unsafe.
 */
function quoteIdentifier(identifier: string): string {
  if (!/^[a-z_][a-z0-9_$]*$/.test(identifier)) {
    throw new Error(`Unsafe catalog identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

/**
 * Fingerprints every user table and row count in a local test database.
 * @param sql PostgreSQL connection for catalog and row-count queries.
 * @param targetDatabaseUrl Credential-bearing URL passed only to pg_dump.
 * @returns Stable schema, data, and row-count evidence.
 */
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

  /**
   * Hashes one normalized pg_dump section.
   * @param section Schema or data section to dump.
   * @returns The SHA-256 hash of normalized dump output.
   */
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
    dataSha256: await dumpHash("data"),
    rowCounts,
    schemaSha256: await dumpHash("schema"),
  };
}

/**
 * Finds an available local container runtime.
 * @returns The first supported container CLI.
 * @throws When neither Podman nor Docker is available.
 */
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

/**
 * Runs a callback against one disposable PostgreSQL 16 data volume.
 * @param testBody Callback receiving separate admin, migration, and runtime URLs.
 * @returns The callback result after container cleanup.
 * @throws When the container, PostgreSQL preflight, callback, or cleanup fails.
 */
async function withFreshPostgres16Volume<T>(
  testBody: (connections: FreshVolumeConnections) => Promise<T>,
): Promise<T> {
  const cli = await findContainerCli();
  const suffix = `${process.pid}_${randomBytes(5).toString("hex")}`;
  const containerName = `company_identity_fresh_${suffix}`;
  const adminPassword = randomBytes(24).toString("base64url");
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
      { env: { ...process.env, POSTGRES_PASSWORD: adminPassword } },
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
      `postgresql://postgres:${encodeURIComponent(adminPassword)}` +
      `@127.0.0.1:${portMatch[1]}/postgres`;
    const sql = postgres(adminDatabaseUrl, {
      connect_timeout: 2,
      max: 1,
      prepare: false,
    });
    try {
      let lastError: unknown;
      let ready = false;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        try {
          const [probe] = await sql<
            Array<{ database_name: string; version_number: string }>
          >`select current_database() as database_name,
                   current_setting('server_version_num') as version_number`;
          if (
            probe?.database_name === "postgres" &&
            Number(probe.version_number) >= 160_000 &&
            Number(probe.version_number) < 170_000
          ) {
            ready = true;
            break;
          }
        } catch (error) {
          lastError = error;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (!ready) {
        throw new Error("Disposable PostgreSQL 16 did not become ready.", {
          cause: lastError,
        });
      }
      const directUrl = new URL(adminDatabaseUrl);
      directUrl.username = "company_identity_migrator";
      directUrl.password = randomBytes(24).toString("base64url");
      directUrl.pathname = "/company_identity";
      const runtimeUrl = new URL(adminDatabaseUrl);
      runtimeUrl.username = "company_identity_runtime";
      runtimeUrl.password = randomBytes(24).toString("base64url");
      runtimeUrl.pathname = "/company_identity";
      return await testBody({
        adminDatabaseUrl,
        directDatabaseUrl: directUrl.toString(),
        runtimeDatabaseUrl: runtimeUrl.toString(),
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
  it(
    "rejects migration and runtime URLs that resolve to different clusters",
    { timeout: 120_000 },
    async () => {
      await withFreshPostgres16Volume(async (firstCluster) => {
        await withFreshPostgres16Volume(async (secondCluster) => {
          const bootstrap = await loadBootstrapModule();
          await bootstrap.ensureLocalCompanyIdentityDatabase(firstCluster);
          await bootstrap.ensureLocalCompanyIdentityDatabase(secondCluster);
          const client = await loadClientModule();

          await expect(
            client.proveCompanyIdentityConnectionTopology({
              directDatabaseUrl: firstCluster.directDatabaseUrl,
              runtimeDatabaseUrl: secondCluster.runtimeDatabaseUrl,
            }),
          ).rejects.toMatchObject({
            code: "COMPANY_IDENTITY_TOPOLOGY_MISMATCH",
          });
        });
      });
    },
  );

  it("provisions separate roles, replays safely, and preserves product databases", async () => {
    await withFreshPostgres16Volume(async (connections) => {
      const adminSql = postgres(connections.adminDatabaseUrl, {
        max: 1,
        prepare: false,
      });
      const productClients: Array<{
        databaseName: string;
        databaseUrl: string;
        sql: ReturnType<typeof postgres>;
      }> = [];
      try {
        for (const databaseName of PRODUCT_DATABASES) {
          await adminSql.unsafe(
            `create database ${quoteIdentifier(databaseName)}`,
          );
          const productUrl = databaseUrl(
            connections.adminDatabaseUrl,
            databaseName,
          );
          const productSql = postgres(productUrl, { max: 1 });
          await productSql`
            create table local_bootstrap_product_sentinel (
              id integer primary key,
              value text not null
            )
          `;
          await productSql`
            insert into local_bootstrap_product_sentinel (id, value)
            values (1, ${`preserve-${databaseName}`})
          `;
          productClients.push({
            databaseName,
            databaseUrl: productUrl,
            sql: productSql,
          });
        }
        const productFingerprintsBefore = await Promise.all(
          productClients.map(async (product) => ({
            databaseName: product.databaseName,
            fingerprint: await databaseFingerprint(
              product.sql,
              product.databaseUrl,
            ),
          })),
        );

        const bootstrap = await loadBootstrapModule();
        await adminSql.unsafe('create database "company_identity"');
        const preexistingIdentityAdminSql = postgres(
          databaseUrl(connections.adminDatabaseUrl, "company_identity"),
          { max: 1 },
        );
        try {
          await preexistingIdentityAdminSql`
            create view local_bootstrap_non_table_object as select 1 as id
          `;
          await expect(
            bootstrap.ensureLocalCompanyIdentityDatabase(connections),
          ).rejects.toThrow(/ownership|reviewed|backup/i);
          await preexistingIdentityAdminSql`
            drop view local_bootstrap_non_table_object
          `;
        } finally {
          await preexistingIdentityAdminSql.end();
        }
        await bootstrap.ensureLocalCompanyIdentityDatabase(connections);
        const identitySql = postgres(connections.directDatabaseUrl, { max: 1 });
        const runtimeSql = postgres(connections.runtimeDatabaseUrl, { max: 1 });
        try {
          const firstFingerprint = await databaseFingerprint(
            identitySql,
            connections.directDatabaseUrl,
          );
          await runtimeSql`select count(*) from company_accounts`;
          await expect(
            runtimeSql`create table runtime_must_not_create (id integer)`,
          ).rejects.toMatchObject({ code: "42501" });

          await bootstrap.ensureLocalCompanyIdentityDatabase(connections);
          expect(
            await databaseFingerprint(
              identitySql,
              connections.directDatabaseUrl,
            ),
          ).toEqual(firstFingerprint);

          const [owner] = await adminSql<Array<{ owner_name: string }>>`
            select pg_catalog.pg_get_userbyid(datdba) as owner_name
              from pg_catalog.pg_database
             where datname = 'company_identity'
          `;
          expect(owner?.owner_name).toBe("company_identity_migrator");
          const roles = await adminSql<
            Array<{
              has_memberships: boolean;
              inherits_privileges: boolean;
              role_name: string;
              superuser: boolean;
            }>
          >`
            select
              exists(
                select 1 from pg_catalog.pg_auth_members membership
                 where membership.member = role.oid
              ) as has_memberships,
              role.rolinherit as inherits_privileges,
              role.rolname as role_name,
              role.rolsuper as superuser
            from pg_catalog.pg_roles role
            where role.rolname in (
              'company_identity_migrator',
              'company_identity_runtime'
            )
            order by role.rolname
          `;
          expect(roles).toEqual([
            {
              has_memberships: false,
              inherits_privileges: false,
              role_name: "company_identity_migrator",
              superuser: false,
            },
            {
              has_memberships: false,
              inherits_privileges: false,
              role_name: "company_identity_runtime",
              superuser: false,
            },
          ]);
        } finally {
          await runtimeSql.end();
          await identitySql.end();
        }

        const rotatedRuntimeUrl = new URL(connections.runtimeDatabaseUrl);
        rotatedRuntimeUrl.password = randomBytes(24).toString("base64url");
        const rotatedConnections = {
          ...connections,
          runtimeDatabaseUrl: rotatedRuntimeUrl.toString(),
        };
        await bootstrap.ensureLocalCompanyIdentityDatabase(rotatedConnections);
        const rotatedRuntimeSql = postgres(
          rotatedConnections.runtimeDatabaseUrl,
          { max: 1 },
        );
        const staleRuntimeSql = postgres(connections.runtimeDatabaseUrl, {
          connect_timeout: 2,
          max: 1,
        });
        try {
          await rotatedRuntimeSql`select count(*) from company_accounts`;
          await expect(
            staleRuntimeSql`select count(*) from company_accounts`,
          ).rejects.toMatchObject({ code: "28P01" });
        } finally {
          await staleRuntimeSql.end({ timeout: 1 });
          await rotatedRuntimeSql.end();
        }

        expect(
          await Promise.all(
            productClients.map(async (product) => ({
              databaseName: product.databaseName,
              fingerprint: await databaseFingerprint(
                product.sql,
                product.databaseUrl,
              ),
            })),
          ),
        ).toEqual(productFingerprintsBefore);
        expect(
          await adminSql<Array<{ datname: string }>>`
            select datname from pg_catalog.pg_database
             where datname in (
               'company_identity',
               'company_identity_test',
               'reading_advantage',
               'primary_advantage',
               'science_advantage'
             )
             order by datname
          `,
        ).toEqual([
          { datname: "company_identity" },
          { datname: "primary_advantage" },
          { datname: "reading_advantage" },
          { datname: "science_advantage" },
        ]);

        await adminSql.unsafe(
          'alter database "company_identity" owner to "postgres"',
        );
        try {
          await expect(
            bootstrap.ensureLocalCompanyIdentityDatabase(rotatedConnections),
          ).rejects.toThrow(/ownership|reviewed|backup/i);
        } finally {
          await adminSql.unsafe(
            'alter database "company_identity" owner to "company_identity_migrator"',
          );
        }
      } finally {
        for (const product of productClients) {
          await product.sql.end();
        }
        await adminSql.end();
      }
    });
  }, 120_000);
});
