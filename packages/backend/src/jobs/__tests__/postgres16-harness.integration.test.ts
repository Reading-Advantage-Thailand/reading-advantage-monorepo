import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  assertDurableJobPostgres16IndependentSessions,
  assertDurableJobPostgres16ServerVersion,
  DURABLE_JOB_PG16_ADMIN_URL_ENV,
  isDurableJobPostgres16IntegrationEnabled,
  resolveDurableJobPostgres16AdminUrl,
  withDurableJobPostgres16Harness,
} from "./postgres16-harness.js";

const integrationEnabled = isDurableJobPostgres16IntegrationEnabled(
  process.env,
);
const SCRATCH_DATABASE_PREFIX = "durable_job_pg16_test_";
const REPOSITORY_ROOT = fileURLToPath(
  new URL("../../../../../", import.meta.url),
);
const HARNESS_MODULE_URL = new URL("./postgres16-harness.ts", import.meta.url)
  .href;
const TSX_LOADER = fileURLToPath(
  new URL("../../../../../node_modules/tsx/dist/loader.mjs", import.meta.url),
);

type AdminSql = ReturnType<typeof postgres>;

function quoteGeneratedIdentifier(identifier: string): string {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(identifier)) {
    throw new Error("Test generated an unsafe PostgreSQL identifier.");
  }
  return `"${identifier}"`;
}

function openAdminConnection(): AdminSql {
  return postgres(resolveDurableJobPostgres16AdminUrl(process.env).toString(), {
    max: 1,
    prepare: false,
  });
}

async function listScratchDatabases(sql: AdminSql): Promise<string[]> {
  const rows = await sql<{ database_name: string }[]>`
    SELECT datname AS database_name
    FROM pg_database
    WHERE left(datname, ${SCRATCH_DATABASE_PREFIX.length}) =
      ${SCRATCH_DATABASE_PREFIX}
    ORDER BY datname
  `;
  return rows.map((row) => row.database_name);
}

async function expectNoScratchDatabases(sql: AdminSql): Promise<void> {
  expect(await listScratchDatabases(sql)).toEqual([]);
}

function errorMessages(error: unknown): string[] {
  if (error instanceof AggregateError) {
    return [error.message, ...error.errors.flatMap(errorMessages)];
  }
  return [error instanceof Error ? error.message : String(error)];
}

async function expectInjectedFailure(
  run: () => Promise<unknown>,
  expectedMessage: string,
): Promise<void> {
  let failure: unknown;
  try {
    await run();
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeDefined();
  expect(
    errorMessages(failure).some((message) => message.includes(expectedMessage)),
  ).toBe(true);
}

async function waitForChildReady(
  child: ReturnType<typeof spawn>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      reject(new Error(`Signal child did not become ready. Output: ${output}`));
    }, 15_000);
    child.stdout?.setEncoding("utf8");
    child.stderr?.resume();
    child.stdout?.on("data", (chunk: string) => {
      output += chunk;
      if (output.includes("TASK7_SIGNAL_READY")) {
        clearTimeout(timeout);
        resolve(output);
      }
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      if (!output.includes("TASK7_SIGNAL_READY")) {
        clearTimeout(timeout);
        reject(
          new Error(
            `Signal child exited before readiness: code=${code}, signal=${signal}, output=${output}`,
          ),
        );
      }
    });
  });
}

async function waitForChildExit(
  child: ReturnType<typeof spawn>,
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  const [code, signal] = (await new Promise<unknown[]>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (...args) => resolve(args));
  })) as [number | null, NodeJS.Signals | null];
  return { code, signal };
}

describe.skipIf(!integrationEnabled)(
  "durable job isolated PostgreSQL 16 harness",
  () => {
    let adminSql: AdminSql | undefined;

    beforeAll(async () => {
      adminSql = openAdminConnection();
      await expectNoScratchDatabases(adminSql);
    });

    afterAll(async () => {
      if (!adminSql) {
        return;
      }
      try {
        await expectNoScratchDatabases(adminSql);
      } finally {
        await adminSql.end({ timeout: 5 });
      }
    });

    it(
      "runs exact hooks over two independent connections and tears down",
      { timeout: 120_000 },
      async () => {
        if (!adminSql) {
          throw new Error("The PG16 admin connection was not established.");
        }

        const events: string[] = [];
        let firstBackendPid = 0;
        let secondBackendPid = 0;

        await withDurableJobPostgres16Harness(
          {
            async migrate({ migrationConnection }) {
              events.push("migrate");
              await migrationConnection.unsafe(`
              CREATE TABLE task7_harness_receipt (
                id integer PRIMARY KEY,
                phase text NOT NULL
              )
            `);
            },
            async setup({ connectionOne }) {
              events.push("setup");
              await connectionOne`
              INSERT INTO task7_harness_receipt (id, phase)
              VALUES (1, 'setup')
            `;
            },
            validations: {
              async legacyPreflight({ connectionOne }) {
                events.push("legacy-preflight");
                const [row] = await connectionOne<
                  { phase: string }[]
                >`SELECT phase FROM task7_harness_receipt WHERE id = 1`;
                expect(row?.phase).toBe("setup");
              },
              async roleFence() {
                events.push("role-fence");
              },
              async auditPrivileges() {
                events.push("audit-privileges");
              },
              async explainPlans() {
                events.push("explain-plans");
              },
            },
            async teardown({ connectionTwo }) {
              events.push("teardown");
              const [row] = await connectionTwo<
                { row_count: string }[]
              >`SELECT count(*)::text AS row_count FROM task7_harness_receipt`;
              expect(row?.row_count).toBe("1");
            },
          },
          async ({ connectionOne, connectionTwo, databaseName }) => {
            events.push("test");
            const [first] = await connectionOne<
              { backend_pid: number; database_name: string }[]
            >`
            SELECT
              pg_backend_pid() AS backend_pid,
              current_database() AS database_name
          `;
            const [second] = await connectionTwo<
              { backend_pid: number; database_name: string }[]
            >`
            SELECT
              pg_backend_pid() AS backend_pid,
              current_database() AS database_name
          `;
            firstBackendPid = first?.backend_pid ?? 0;
            secondBackendPid = second?.backend_pid ?? 0;
            expect(first?.database_name).toBe(databaseName);
            expect(second?.database_name).toBe(databaseName);
          },
        );

        expect(firstBackendPid).toBeGreaterThan(0);
        expect(secondBackendPid).toBeGreaterThan(0);
        expect(firstBackendPid).not.toBe(secondBackendPid);
        expect(events).toEqual([
          "migrate",
          "setup",
          "legacy-preflight",
          "role-fence",
          "audit-privileges",
          "explain-plans",
          "test",
          "teardown",
        ]);
        await expectNoScratchDatabases(adminSql);

        const concurrentDatabaseNames: string[] = [];
        let concurrentInvocations = 0;
        let releaseConcurrentInvocations: (() => void) | undefined;
        const bothConcurrentInvocations = new Promise<void>((resolve) => {
          releaseConcurrentInvocations = resolve;
        });
        const concurrentBarrier = async (): Promise<void> => {
          concurrentInvocations += 1;
          if (concurrentInvocations === 2) {
            releaseConcurrentInvocations?.();
          }
          await Promise.race([
            bothConcurrentInvocations,
            new Promise<never>((_, reject) => {
              setTimeout(
                () =>
                  reject(new Error("Concurrent harness barrier timed out.")),
                15_000,
              );
            }),
          ]);
        };

        const concurrentResults = await Promise.all([
          withDurableJobPostgres16Harness(
            {
              async migrate({ migrationConnection }) {
                await migrationConnection.unsafe(
                  "CREATE TABLE task7_concurrent_receipt (id integer PRIMARY KEY)",
                );
              },
            },
            async ({ databaseName }) => {
              concurrentDatabaseNames.push(databaseName);
              await concurrentBarrier();
              return databaseName;
            },
          ),
          withDurableJobPostgres16Harness(
            {
              async migrate({ migrationConnection }) {
                await migrationConnection.unsafe(
                  "CREATE TABLE task7_concurrent_receipt (id integer PRIMARY KEY)",
                );
              },
            },
            async ({ databaseName }) => {
              concurrentDatabaseNames.push(databaseName);
              await concurrentBarrier();
              return databaseName;
            },
          ),
        ]);

        expect(concurrentResults).toHaveLength(2);
        expect(new Set(concurrentResults).size).toBe(2);
        expect(new Set(concurrentDatabaseNames).size).toBe(2);
        await expectNoScratchDatabases(adminSql);

        const failureStages = [
          "migrate",
          "setup",
          "validation",
          "test",
          "teardown",
        ] as const;
        for (const stage of failureStages) {
          await expectInjectedFailure(
            () =>
              withDurableJobPostgres16Harness(
                {
                  async migrate({ migrationConnection }) {
                    if (stage === "migrate") {
                      throw new Error("injected migrate failure");
                    }
                    await migrationConnection.unsafe(
                      "CREATE TABLE task7_failure_receipt (id integer PRIMARY KEY)",
                    );
                  },
                  async setup({ connectionOne }) {
                    if (stage === "setup") {
                      throw new Error("injected setup failure");
                    }
                    await connectionOne`
                    INSERT INTO task7_failure_receipt (id) VALUES (1)
                  `;
                  },
                  validations: {
                    async legacyPreflight() {
                      if (stage === "validation") {
                        throw new Error("injected validation failure");
                      }
                    },
                  },
                  async teardown() {
                    if (stage === "teardown") {
                      throw new Error("injected teardown failure");
                    }
                  },
                },
                async () => {
                  if (stage === "test") {
                    throw new Error("injected test failure");
                  }
                },
              ),
            `injected ${stage} failure`,
          );
          await expectNoScratchDatabases(adminSql);
        }

        let aggregateFailure: unknown;
        try {
          await withDurableJobPostgres16Harness(
            {
              async migrate({ migrationConnection }) {
                await migrationConnection.unsafe(
                  "CREATE TABLE task7_aggregate_receipt (id integer PRIMARY KEY)",
                );
              },
              async teardown() {
                throw new Error("injected aggregate cleanup failure");
              },
            },
            async () => {
              throw new Error("injected aggregate test failure");
            },
          );
        } catch (error) {
          aggregateFailure = error;
        }
        expect(aggregateFailure).toBeInstanceOf(AggregateError);
        expect(errorMessages(aggregateFailure)).toEqual(
          expect.arrayContaining([
            "injected aggregate cleanup failure",
            "injected aggregate test failure",
          ]),
        );
        await expectNoScratchDatabases(adminSql);

        const roleName = `task7_extra_${randomBytes(5).toString("hex")}`;
        const rolePassword = randomBytes(12).toString("hex");
        let additionalConnection: ReturnType<typeof postgres> | undefined;
        let originalAdditionalEnd:
          | ReturnType<typeof postgres>["end"]
          | undefined;
        try {
          await withDurableJobPostgres16Harness(
            {
              async migrate({ migrationConnection }) {
                await migrationConnection.unsafe(
                  `CREATE ROLE ${quoteGeneratedIdentifier(roleName)} LOGIN PASSWORD '${rolePassword}'`,
                );
              },
            },
            async ({ openConnection }) => {
              additionalConnection = openConnection({
                username: roleName,
                password: rolePassword,
              });
              const [row] = await additionalConnection<
                { current_user: string }[]
              >`SELECT current_user`;
              expect(row?.current_user).toBe(roleName);
              originalAdditionalEnd = additionalConnection.end;
              additionalConnection.end = async () => {
                throw new Error("injected additional-role cleanup failure");
              };
            },
          );
        } catch (error) {
          expect(errorMessages(error)).toContain(
            "injected additional-role cleanup failure",
          );
        } finally {
          if (additionalConnection && originalAdditionalEnd) {
            additionalConnection.end = originalAdditionalEnd;
            await additionalConnection
              .end({ timeout: 5 })
              .catch(() => undefined);
          }
          await adminSql.unsafe(
            `DROP ROLE IF EXISTS ${quoteGeneratedIdentifier(roleName)}`,
          );
        }
        expect(additionalConnection).toBeDefined();
        if (!additionalConnection) {
          throw new Error("The additional role connection was not tracked.");
        }
        await expectNoScratchDatabases(adminSql);

        const staleDatabaseName = `${SCRATCH_DATABASE_PREFIX}stale_${randomBytes(5).toString("hex")}`;
        await adminSql.unsafe(
          `CREATE DATABASE ${quoteGeneratedIdentifier(staleDatabaseName)}`,
        );
        try {
          await expectInjectedFailure(
            () =>
              withDurableJobPostgres16Harness(
                {
                  async migrate() {
                    throw new Error(
                      "stale database should refuse before migrate",
                    );
                  },
                },
                async () => undefined,
              ),
            "Stale durable-job scratch databases require explicit operator review",
          );
        } finally {
          await adminSql.unsafe(
            `DROP DATABASE IF EXISTS ${quoteGeneratedIdentifier(staleDatabaseName)}`,
          );
        }
        await expectNoScratchDatabases(adminSql);

        assertDurableJobPostgres16ServerVersion(160_000);
        expect(() => assertDurableJobPostgres16ServerVersion(170_000)).toThrow(
          "require PostgreSQL 16",
        );
        expect(() =>
          assertDurableJobPostgres16IndependentSessions(77, 77),
        ).toThrow("two independent sessions");

        const childEnvironment = { ...process.env };
        childEnvironment[DURABLE_JOB_PG16_ADMIN_URL_ENV] =
          process.env[DURABLE_JOB_PG16_ADMIN_URL_ENV] ?? "";
        childEnvironment.DURABLE_JOB_PG16_TEST_OPT_IN = "1";
        childEnvironment.DATABASE_URL = "";
        childEnvironment.DIRECT_DATABASE_URL = "";
        const childScript = `
        const { withDurableJobPostgres16Harness } = await import(${JSON.stringify(HARNESS_MODULE_URL)});
        await withDurableJobPostgres16Harness(
          {
            async migrate({ migrationConnection }) {
              await migrationConnection\`SELECT 1\`;
              console.log("TASK7_SIGNAL_READY");
              await new Promise((resolve) => setTimeout(resolve, 30_000));
            },
          },
          async () => undefined,
        );
        `;
        const child = spawn(
          process.execPath,
          ["--import", TSX_LOADER, "--input-type=module", "-e", childScript],
          {
            cwd: REPOSITORY_ROOT,
            env: childEnvironment,
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        await waitForChildReady(child);
        child.kill("SIGTERM");
        const childExit = await waitForChildExit(child);
        expect(childExit.code).toBe(143);
        expect(childExit.signal).toBeNull();
        await expectNoScratchDatabases(adminSql);
      },
    );
  },
);
