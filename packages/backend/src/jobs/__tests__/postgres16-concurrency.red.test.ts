import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import postgres from "postgres";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ClaimJobsRequest,
  DurableJobQueuePort,
  EnqueueJobRequest,
  JobTenant,
  ReclaimExpiredJobsRequest,
} from "../index.js";
import {
  DURABLE_JOB_PG16_ADMIN_URL_ENV,
  DURABLE_JOB_PG16_OPT_IN_ENV,
  isDurableJobPostgres16IntegrationEnabled,
  resolveDurableJobPostgres16AdminUrl,
  withDurableJobPostgres16Harness,
  type DurableJobPostgres16HarnessContext,
  type DurableJobTestSql,
} from "./postgres16-harness.js";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "../../../../..");
const ADAPTER_ROOT = resolve(
  REPOSITORY_ROOT,
  "packages/backend/src/jobs/adapters/postgres",
);
const ADAPTER_SOURCE = resolve(ADAPTER_ROOT, "index.ts");
const DRIZZLE_ROOT = resolve(REPOSITORY_ROOT, "packages/db/drizzle");
const LEGACY_MIGRATION_PATH = resolve(DRIZZLE_ROOT, "0025_review_jobs.sql");
const SCRATCH_DATABASE_PREFIX = "durable_job_pg16_test_";
const BASE_TIME = "2026-08-14T10:00:00.000Z";
const NEXT_TIME = "2026-08-14T10:00:02.000Z";
const AFTER_FRESH_EXPIRY = "2026-08-14T10:01:03.000Z";
const QUEUE_NAME = "task8-red";
const JOB_NAME = "codecamp.review.pull-request";
const GLOBAL_TENANT = { mode: "global" } as const;
const COMPANY_SCOPE = { mode: "tenant", tenantId: "company-task8" } as const;
const SCHOOL_SCOPE = { mode: "tenant", tenantId: "school-task8" } as const;
const OTHER_COMPANY_SCOPE = {
  mode: "tenant",
  tenantId: "company-other-task8",
} as const;
const OTHER_SCHOOL_SCOPE = {
  mode: "tenant",
  tenantId: "school-other-task8",
} as const;
const TENANT_SCOPE = SCHOOL_SCOPE;
const MISSING_ADAPTER_MESSAGE =
  "Intentional Red: PostgreSQL durable-job adapter behavior is missing under the approved adapter root.";

interface DurableJobPostgresAdapterModule {
  readonly createDurableJobQueuePort?: (input: {
    readonly sql: DurableJobTestSql;
  }) => DurableJobQueuePort;
}

interface ClaimedJob {
  readonly id: string;
  readonly attempt: number;
  readonly state: "running";
  readonly lease: {
    readonly token: string;
    readonly workerId: string;
    readonly expiresAt: string;
  };
  readonly lastError?: unknown;
}

interface PersistedLeaseRow {
  readonly leaseTokenHash: string | null;
  readonly leaseExpiresAt: Date | string | null;
  readonly state: string;
  readonly resultJson: unknown;
  readonly lastErrorCode: string | null;
  readonly lastErrorSummary: string | null;
}

type EnqueueResult = Awaited<ReturnType<DurableJobQueuePort["enqueue"]>>;

function enqueueRequest(
  idempotencyKey: string,
  tenant: JobTenant = GLOBAL_TENANT,
): EnqueueJobRequest {
  return {
    jobName: JOB_NAME,
    queueName: QUEUE_NAME,
    tenant,
    idempotencyKey,
    payload: { idempotencyKey },
    maxAttempts: 3,
    availableAt: BASE_TIME,
  };
}

function claimRequest(
  workerId: string,
  tenant: JobTenant = GLOBAL_TENANT,
  now = BASE_TIME,
): ClaimJobsRequest {
  return {
    queueName: QUEUE_NAME,
    tenant,
    workerId,
    limit: 1,
    leaseSeconds: 60,
    now,
  };
}

function reclaimRequest(
  tenant: JobTenant = GLOBAL_TENANT,
  now = NEXT_TIME,
): ReclaimExpiredJobsRequest {
  return {
    queueName: QUEUE_NAME,
    tenant,
    limit: 10,
    now,
  };
}

function jobIdFromEnqueue(result: EnqueueResult): string {
  expect(
    ["enqueued", "refreshed", "active-lease-retained"],
    "The adapter must return a declared durable enqueue outcome.",
  ).toContain(result.outcome);
  return result.jobId;
}

function claimedJob(
  result: Awaited<ReturnType<DurableJobQueuePort["claim"]>>,
): ClaimedJob {
  expect(
    result.outcome,
    "Intentional Red: the PostgreSQL adapter must return one typed claim outcome.",
  ).toBe("claimed");
  if (result.outcome !== "claimed") {
    throw new Error("The PostgreSQL adapter did not claim a job.");
  }
  const job = result.jobs[0];
  expect(
    job,
    "A claimed result must contain one running envelope.",
  ).toBeDefined();
  if (job === undefined) {
    throw new Error("The PostgreSQL adapter returned an empty claimed batch.");
  }
  return job as ClaimedJob;
}

function expectLeaseRejected(
  result: { readonly outcome?: string },
  message: string,
): void {
  expect(["stale-lease", "not-running", "missing"], message).toContain(
    result.outcome,
  );
}

function expectStaleLease(
  result: { readonly outcome?: string },
  message: string,
): void {
  expect(result, message).toEqual({ outcome: "stale-lease" });
}

function hashLeaseToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizePersistedTimestamp(
  value: Date | string | null,
): string | null {
  return value === null ? null : new Date(value).toISOString();
}

function expectedExpiry(now: string, leaseSeconds: number): string {
  return new Date(new Date(now).getTime() + leaseSeconds * 1_000).toISOString();
}

function assertAdapterRoot(): void {
  expect(
    existsSync(ADAPTER_ROOT) && existsSync(ADAPTER_SOURCE),
    MISSING_ADAPTER_MESSAGE,
  ).toBe(true);
}

async function loadQueuePort(
  sql: DurableJobTestSql,
): Promise<DurableJobQueuePort> {
  assertAdapterRoot();
  const loaded = (await import(
    ADAPTER_SOURCE
  )) as DurableJobPostgresAdapterModule;
  expect(
    loaded.createDurableJobQueuePort,
    "Intentional Red: the approved adapter root must expose the provider-neutral queue port.",
  ).toBeTypeOf("function");
  if (typeof loaded.createDurableJobQueuePort !== "function") {
    throw new Error(
      "The PostgreSQL adapter queue-port factory is unavailable.",
    );
  }
  return loaded.createDurableJobQueuePort({ sql });
}

async function withFreshQueuePort<T>(
  context: DurableJobPostgres16HarnessContext,
  testBody: (port: DurableJobQueuePort) => Promise<T>,
): Promise<T> {
  const scratchUrl = resolveDurableJobPostgres16AdminUrl(process.env);
  scratchUrl.pathname = `/${context.databaseName}`;
  const freshSql = postgres(scratchUrl.toString(), {
    max: 1,
    prepare: false,
  });
  try {
    return await testBody(await loadQueuePort(freshSql));
  } finally {
    await freshSql.end({ timeout: 5 });
  }
}

async function readPersistedLeaseRow(
  context: DurableJobPostgres16HarnessContext,
  jobId: string,
): Promise<PersistedLeaseRow> {
  const verifierUrl = resolveDurableJobPostgres16AdminUrl(process.env);
  verifierUrl.pathname = `/${context.databaseName}`;
  const verifierSql = postgres(verifierUrl.toString(), {
    max: 1,
    prepare: false,
  });
  try {
    const [row] = await verifierSql<PersistedLeaseRow[]>`
      SELECT
        "lease_token_hash" AS "leaseTokenHash",
        "lease_expires_at" AS "leaseExpiresAt",
        "state",
        "result_json" AS "resultJson",
        "last_error_code" AS "lastErrorCode",
        "last_error_summary" AS "lastErrorSummary"
      FROM "durable_jobs"
      WHERE "id" = ${jobId}
        AND "tenant_mode" = 'global'
        AND "tenant_id" IS NULL
    `;
    expect(
      row,
      "The fresh verifier session must read the claimed durable row.",
    ).toBeDefined();
    if (row === undefined) {
      throw new Error("The fresh verifier session returned no durable row.");
    }
    return row;
  } finally {
    await verifierSql.end({ timeout: 5 });
  }
}

async function applyOptionalDurableMigrations(
  migrationConnection: DurableJobTestSql,
): Promise<void> {
  const migrationNames = readdirSync(DRIZZLE_ROOT)
    .filter((name) => /^\d+_durable_jobs(?:_platform)?\.sql$/.test(name))
    .sort();
  const durableMigration = migrationNames.at(-1);
  if (durableMigration === undefined) return;

  if (existsSync(LEGACY_MIGRATION_PATH)) {
    await applySqlFile(migrationConnection, LEGACY_MIGRATION_PATH);
  }
  await applySqlFile(
    migrationConnection,
    resolve(DRIZZLE_ROOT, durableMigration),
  );
}

async function applySqlFile(
  sql: DurableJobTestSql,
  path: string,
): Promise<void> {
  const source = readFileSync(path, "utf8");
  for (const statement of source.split("--> statement-breakpoint")) {
    if (statement.trim().length > 0) {
      await sql.unsafe(statement);
    }
  }
}

async function expectNoScratchDatabases(): Promise<void> {
  const adminUrl = resolveDurableJobPostgres16AdminUrl(process.env);
  const adminSql = postgres(adminUrl.toString(), { max: 1, prepare: false });
  try {
    const scratchDatabases = await adminSql.unsafe(
      "SELECT datname AS database_name FROM pg_database " +
        "WHERE left(datname, " +
        String(SCRATCH_DATABASE_PREFIX.length) +
        ") = $1 ORDER BY datname",
      [SCRATCH_DATABASE_PREFIX],
    );
    expect(
      scratchDatabases,
      "The frozen harness must remove every Task 8 scratch database.",
    ).toEqual([]);
  } finally {
    await adminSql.end({ timeout: 5 });
  }
}

async function withTask8Harness<T>(
  testBody: (
    context: DurableJobPostgres16HarnessContext,
    firstPort: DurableJobQueuePort,
    secondPort: DurableJobQueuePort,
  ) => Promise<T>,
): Promise<T> {
  try {
    return await withDurableJobPostgres16Harness(
      {
        migrate: ({ migrationConnection }) =>
          applyOptionalDurableMigrations(migrationConnection),
      },
      async (context) => {
        const firstPort = await loadQueuePort(context.connectionOne);
        const secondPort = await loadQueuePort(context.connectionTwo);
        return testBody(context, firstPort, secondPort);
      },
    );
  } finally {
    await expectNoScratchDatabases();
  }
}

const integrationEnabled = isDurableJobPostgres16IntegrationEnabled(
  process.env,
);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Task 8 durable-job PostgreSQL adapter Red contract", () => {
  it("requires the exact PostgreSQL adapter root and factory", () => {
    assertAdapterRoot();
  });

  it("keeps the production adapter boundary provider-neutral", () => {
    expect(ADAPTER_ROOT).toBe(
      resolve(REPOSITORY_ROOT, "packages/backend/src/jobs/adapters/postgres"),
    );
    expect(MISSING_ADAPTER_MESSAGE).toContain("approved adapter root");
  });
});

describe("Task 8 PostgreSQL 16 environment guard", () => {
  it("rejects harness execution before PostgreSQL access without explicit opt-in", async () => {
    vi.stubEnv(DURABLE_JOB_PG16_OPT_IN_ENV, undefined);
    vi.stubEnv(DURABLE_JOB_PG16_ADMIN_URL_ENV, undefined);
    vi.stubEnv("DATABASE_URL", undefined);
    vi.stubEnv("DIRECT_DATABASE_URL", undefined);

    expect(isDurableJobPostgres16IntegrationEnabled(process.env)).toBe(false);
    await expect(
      withDurableJobPostgres16Harness(
        { migrate: () => undefined },
        () => undefined,
      ),
    ).rejects.toThrow(
      DURABLE_JOB_PG16_OPT_IN_ENV +
        " must be exactly 1 before durable-job PostgreSQL 16 harness execution.",
    );
  });

  it("rejects generic database URLs before the live suite can skip", () => {
    expect(() =>
      isDurableJobPostgres16IntegrationEnabled({
        DATABASE_URL: "postgresql://unsafe",
      }),
    ).toThrow("DATABASE_URL must be unset");
    expect(() =>
      isDurableJobPostgres16IntegrationEnabled({
        DIRECT_DATABASE_URL: "postgresql://unsafe",
      }),
    ).toThrow("DIRECT_DATABASE_URL must be unset");
  });
});

describe.skipIf(!integrationEnabled)(
  "Task 8 isolated PostgreSQL 16 concurrency and reclaim behavior",
  () => {
    it("does not grant duplicate active ownership across two connections", async () => {
      await withTask8Harness(async (_context, firstPort, secondPort) => {
        const request = enqueueRequest("task8-concurrent-claim");
        const firstEnqueue = await firstPort.enqueue(request);
        const secondEnqueue = await secondPort.enqueue(request);
        const jobId = jobIdFromEnqueue(firstEnqueue);
        expect(jobIdFromEnqueue(secondEnqueue)).toBe(jobId);

        const [firstClaim, secondClaim] = await Promise.all([
          firstPort.claim(claimRequest("worker-a")),
          secondPort.claim(claimRequest("worker-b")),
        ]);
        const claimed = [firstClaim, secondClaim].filter(
          (result) => result.outcome === "claimed",
        );
        expect(
          claimed,
          "Two connections must produce one active owner.",
        ).toHaveLength(1);
        expect(
          claimed.flatMap((result) =>
            result.outcome === "claimed"
              ? result.jobs.map((job) => job.id)
              : [],
          ),
        ).toEqual([jobId]);
      });
    });

    it("rejects the reclaimed worker token without mutating persisted lease state", async () => {
      await withTask8Harness(async (context, firstPort, secondPort) => {
        const jobId = jobIdFromEnqueue(
          await firstPort.enqueue(enqueueRequest("task8-stale-cas")),
        );
        const firstJob = claimedJob(
          await firstPort.claim({
            ...claimRequest("worker-before-reclaim"),
            leaseSeconds: 1,
          }),
        );
        expect(firstJob.id).toBe(jobId);

        await expect(
          secondPort.reclaimExpired(reclaimRequest(GLOBAL_TENANT)),
        ).resolves.toEqual({ outcome: "reclaimed", count: 1 });

        const freshJob = claimedJob(
          await secondPort.claim(
            claimRequest("worker-after-reclaim", GLOBAL_TENANT, NEXT_TIME),
          ),
        );
        expect(freshJob.id).toBe(jobId);
        expect(freshJob.state).toBe("running");
        expect(freshJob.lease.token).not.toBe(firstJob.lease.token);
        expect(freshJob.lease.expiresAt).toBe(expectedExpiry(NEXT_TIME, 60));
        expect(freshJob.lastError).toBeUndefined();
        const freshLeaseSnapshot = {
          leaseTokenHash: hashLeaseToken(freshJob.lease.token),
          leaseExpiresAt: freshJob.lease.expiresAt,
          state: freshJob.state,
          resultJson: null,
          lastErrorCode: null,
          lastErrorSummary: null,
        };

        const staleHeartbeat = await secondPort.heartbeat({
          jobId,
          tenant: GLOBAL_TENANT,
          leaseToken: firstJob.lease.token,
          now: NEXT_TIME,
          extendBySeconds: 600,
        });
        expectStaleLease(
          staleHeartbeat,
          "A reclaimed worker cannot extend its old expiry.",
        );

        const staleSettle = await secondPort.settle({
          jobId,
          tenant: GLOBAL_TENANT,
          leaseToken: firstJob.lease.token,
          now: NEXT_TIME,
          result: { staleWorkerResult: true },
        });
        expectStaleLease(
          staleSettle,
          "A reclaimed worker cannot write a result.",
        );

        const staleFailure = await secondPort.fail({
          jobId,
          tenant: GLOBAL_TENANT,
          leaseToken: firstJob.lease.token,
          now: NEXT_TIME,
          error: {
            code: "STALE_WORKER_FAILURE",
            safeSummary: "Stale worker must not write an error",
          },
        });
        expectStaleLease(
          staleFailure,
          "A reclaimed worker cannot write an error or retry state.",
        );

        const persistedLease = await readPersistedLeaseRow(context, jobId);
        expect(
          {
            leaseTokenHash: persistedLease.leaseTokenHash,
            leaseExpiresAt: normalizePersistedTimestamp(
              persistedLease.leaseExpiresAt,
            ),
            state: persistedLease.state,
            resultJson: persistedLease.resultJson,
            lastErrorCode: persistedLease.lastErrorCode,
            lastErrorSummary: persistedLease.lastErrorSummary,
          },
          "A fresh SQL session must prove stale calls did not mutate the replacement lease.",
        ).toEqual(freshLeaseSnapshot);

        expectLeaseRejected(
          await secondPort.heartbeat({
            jobId,
            tenant: GLOBAL_TENANT,
            leaseToken: freshJob.lease.token,
            now: AFTER_FRESH_EXPIRY,
            extendBySeconds: 60,
          }),
          "The stale heartbeat cannot extend the replacement lease expiry.",
        );
        await expect(
          secondPort.reclaimExpired(
            reclaimRequest(GLOBAL_TENANT, AFTER_FRESH_EXPIRY),
          ),
        ).resolves.toEqual({ outcome: "reclaimed", count: 1 });
        const finalJob = claimedJob(
          await secondPort.claim(
            claimRequest(
              "worker-after-stale-expiry-probe",
              GLOBAL_TENANT,
              AFTER_FRESH_EXPIRY,
            ),
          ),
        );
        expect(finalJob.id).toBe(jobId);

        await expect(
          secondPort.settle({
            jobId,
            tenant: GLOBAL_TENANT,
            leaseToken: finalJob.lease.token,
            now: AFTER_FRESH_EXPIRY,
            result: { completedBy: "fresh-worker" },
          }),
        ).resolves.toEqual({ outcome: "settled", state: "succeeded" });
        await expect(
          firstPort.enqueue(enqueueRequest("task8-stale-cas")),
        ).resolves.toEqual({
          outcome: "refreshed",
          jobId,
          priorState: "succeeded",
        });
      });
    });

    it("reclaims an expired lease once across independent sessions", async () => {
      await withTask8Harness(async (_context, firstPort, secondPort) => {
        const jobId = jobIdFromEnqueue(
          await firstPort.enqueue(enqueueRequest("task8-one-time-reclaim")),
        );
        const firstJob = claimedJob(
          await firstPort.claim({
            ...claimRequest("worker-before-restart"),
            leaseSeconds: 1,
          }),
        );
        expect(firstJob.id).toBe(jobId);

        const reclaimResults = await Promise.all([
          firstPort.reclaimExpired(reclaimRequest()),
          secondPort.reclaimExpired(reclaimRequest()),
        ]);
        expect(
          reclaimResults.filter((result) => result.outcome === "reclaimed"),
        ).toEqual([{ outcome: "reclaimed", count: 1 }]);
        expect(
          reclaimResults.filter((result) => result.outcome === "no-op"),
        ).toEqual([{ outcome: "no-op" }]);

        const claimResults = await Promise.all([
          firstPort.claim(
            claimRequest(
              "worker-after-concurrent-reclaim",
              GLOBAL_TENANT,
              NEXT_TIME,
            ),
          ),
          secondPort.claim(
            claimRequest(
              "worker-after-concurrent-reclaim-2",
              GLOBAL_TENANT,
              NEXT_TIME,
            ),
          ),
        ]);
        const activeOwners = claimResults.filter(
          (result) => result.outcome === "claimed",
        );
        expect(activeOwners).toHaveLength(1);
        const restartedJob = claimedJob(activeOwners[0]);
        expect(restartedJob.id).toBe(jobId);
        expect(restartedJob.attempt).toBe(firstJob.attempt);
        expect(restartedJob.lease.token).not.toBe(firstJob.lease.token);
        await expect(
          secondPort.settle({
            jobId,
            tenant: GLOBAL_TENANT,
            leaseToken: restartedJob.lease.token,
            now: NEXT_TIME,
            result: { completed: true },
          }),
        ).resolves.toEqual({ outcome: "settled", state: "succeeded" });
      });
    });

    it("isolates global, company, and school tenant ownership", async () => {
      await withTask8Harness(async (_context, firstPort, secondPort) => {
        const globalJobId = jobIdFromEnqueue(
          await firstPort.enqueue(
            enqueueRequest("task8-global-reverse-isolation", GLOBAL_TENANT),
          ),
        );
        const tenantScopes = [
          COMPANY_SCOPE,
          SCHOOL_SCOPE,
          OTHER_COMPANY_SCOPE,
          OTHER_SCHOOL_SCOPE,
        ] as const;
        for (const [index, tenant] of tenantScopes.entries()) {
          await expect(
            firstPort.claim(
              claimRequest(`worker-outside-global-${index}`, tenant),
            ),
          ).resolves.toEqual({ outcome: "empty" });
        }
        const globalJob = claimedJob(
          await firstPort.claim(claimRequest("worker-global-owner")),
        );
        expect(globalJob.id).toBe(globalJobId);
        for (const tenant of tenantScopes) {
          expectLeaseRejected(
            await secondPort.heartbeat({
              jobId: globalJobId,
              tenant,
              leaseToken: globalJob.lease.token,
              now: BASE_TIME,
              extendBySeconds: 60,
            }),
            "A tenant scope cannot extend a global lease.",
          );
          expectLeaseRejected(
            await secondPort.settle({
              jobId: globalJobId,
              tenant,
              leaseToken: globalJob.lease.token,
              now: BASE_TIME,
              result: { wrongTenant: true },
            }),
            "A tenant scope cannot settle a global job.",
          );
          expectLeaseRejected(
            await secondPort.fail({
              jobId: globalJobId,
              tenant,
              leaseToken: globalJob.lease.token,
              now: BASE_TIME,
              error: {
                code: "WRONG_GLOBAL_SCOPE",
                safeSummary: "Tenant scope must not fail a global job",
              },
            }),
            "A tenant scope cannot fail a global job.",
          );
        }
        await expect(
          firstPort.settle({
            jobId: globalJobId,
            tenant: GLOBAL_TENANT,
            leaseToken: globalJob.lease.token,
            now: BASE_TIME,
            result: { completedBy: "global-owner" },
          }),
        ).resolves.toEqual({ outcome: "settled", state: "succeeded" });

        const globalReclaimJobId = jobIdFromEnqueue(
          await firstPort.enqueue(
            enqueueRequest("task8-global-reverse-reclaim", GLOBAL_TENANT),
          ),
        );
        const globalReclaimJob = claimedJob(
          await firstPort.claim({
            ...claimRequest("worker-global-before-reclaim"),
            leaseSeconds: 1,
          }),
        );
        expect(globalReclaimJob.id).toBe(globalReclaimJobId);
        await expect(
          Promise.all(
            tenantScopes.map((tenant) =>
              secondPort.reclaimExpired(reclaimRequest(tenant)),
            ),
          ),
        ).resolves.toEqual(tenantScopes.map(() => ({ outcome: "no-op" })));
        await expect(
          firstPort.reclaimExpired(reclaimRequest(GLOBAL_TENANT)),
        ).resolves.toEqual({ outcome: "reclaimed", count: 1 });
        const reclaimedGlobalJob = claimedJob(
          await secondPort.claim(
            claimRequest(
              "worker-global-after-reclaim",
              GLOBAL_TENANT,
              NEXT_TIME,
            ),
          ),
        );
        expect(reclaimedGlobalJob.id).toBe(globalReclaimJobId);
        await expect(
          secondPort.settle({
            jobId: globalReclaimJobId,
            tenant: GLOBAL_TENANT,
            leaseToken: reclaimedGlobalJob.lease.token,
            now: NEXT_TIME,
            result: { completedBy: "global-reclaimer" },
          }),
        ).resolves.toEqual({ outcome: "settled", state: "succeeded" });

        const schoolJobId = jobIdFromEnqueue(
          await firstPort.enqueue(
            enqueueRequest("task8-school-isolation", SCHOOL_SCOPE),
          ),
        );
        const outsideScopes = [
          GLOBAL_TENANT,
          COMPANY_SCOPE,
          OTHER_COMPANY_SCOPE,
          OTHER_SCHOOL_SCOPE,
        ] as const;
        for (const [index, tenant] of outsideScopes.entries()) {
          await expect(
            firstPort.claim(
              claimRequest(`worker-outside-school-${index}`, tenant),
            ),
          ).resolves.toEqual({ outcome: "empty" });
        }

        const schoolJob = claimedJob(
          await firstPort.claim(
            claimRequest("worker-school-owner", SCHOOL_SCOPE),
          ),
        );
        expect(schoolJob.id).toBe(schoolJobId);

        for (const tenant of outsideScopes) {
          expectLeaseRejected(
            await secondPort.heartbeat({
              jobId: schoolJobId,
              tenant,
              leaseToken: schoolJob.lease.token,
              now: BASE_TIME,
              extendBySeconds: 60,
            }),
            "A different tenant cannot extend the school lease.",
          );
          expectLeaseRejected(
            await secondPort.settle({
              jobId: schoolJobId,
              tenant,
              leaseToken: schoolJob.lease.token,
              now: BASE_TIME,
              result: { wrongTenant: true },
            }),
            "A different tenant cannot settle the school job.",
          );
          expectLeaseRejected(
            await secondPort.fail({
              jobId: schoolJobId,
              tenant,
              leaseToken: schoolJob.lease.token,
              now: BASE_TIME,
              error: {
                code: "WRONG_TENANT_FAILURE",
                safeSummary: "Wrong tenant must not mutate the school job",
              },
            }),
            "A different tenant cannot fail the school job.",
          );
        }

        await expect(
          firstPort.settle({
            jobId: schoolJobId,
            tenant: SCHOOL_SCOPE,
            leaseToken: schoolJob.lease.token,
            now: BASE_TIME,
            result: { completedBy: "school-owner" },
          }),
        ).resolves.toEqual({ outcome: "settled", state: "succeeded" });

        const companyJobId = jobIdFromEnqueue(
          await firstPort.enqueue(
            enqueueRequest("task8-company-reclaim-isolation", COMPANY_SCOPE),
          ),
        );
        const companyOutsideScopes = [
          GLOBAL_TENANT,
          SCHOOL_SCOPE,
          OTHER_COMPANY_SCOPE,
          OTHER_SCHOOL_SCOPE,
        ] as const;
        for (const [index, tenant] of companyOutsideScopes.entries()) {
          await expect(
            firstPort.claim(
              claimRequest(`worker-outside-company-${index}`, tenant),
            ),
          ).resolves.toEqual({ outcome: "empty" });
        }
        const companyJob = claimedJob(
          await firstPort.claim({
            ...claimRequest("worker-company-owner", COMPANY_SCOPE),
            leaseSeconds: 1,
          }),
        );
        expect(companyJob.id).toBe(companyJobId);
        for (const tenant of companyOutsideScopes) {
          expectLeaseRejected(
            await secondPort.heartbeat({
              jobId: companyJobId,
              tenant,
              leaseToken: companyJob.lease.token,
              now: BASE_TIME,
              extendBySeconds: 60,
            }),
            "A different tenant cannot extend the company lease.",
          );
          expectLeaseRejected(
            await secondPort.settle({
              jobId: companyJobId,
              tenant,
              leaseToken: companyJob.lease.token,
              now: BASE_TIME,
              result: { wrongTenant: true },
            }),
            "A different tenant cannot settle the company job.",
          );
          expectLeaseRejected(
            await secondPort.fail({
              jobId: companyJobId,
              tenant,
              leaseToken: companyJob.lease.token,
              now: BASE_TIME,
              error: {
                code: "WRONG_COMPANY_FAILURE",
                safeSummary: "Wrong tenant must not mutate the company job",
              },
            }),
            "A different tenant cannot fail the company job.",
          );
        }
        const outsideReclaims = await Promise.all(
          companyOutsideScopes.map((tenant) =>
            secondPort.reclaimExpired(reclaimRequest(tenant)),
          ),
        );
        expect(outsideReclaims).toEqual(
          companyOutsideScopes.map(() => ({ outcome: "no-op" })),
        );
        await expect(
          firstPort.reclaimExpired(reclaimRequest(COMPANY_SCOPE)),
        ).resolves.toEqual({ outcome: "reclaimed", count: 1 });
      });
    });

    it("preserves durable progress across a fresh adapter and session restart", async () => {
      await withTask8Harness(async (context, firstPort) => {
        const jobId = jobIdFromEnqueue(
          await firstPort.enqueue(
            enqueueRequest("task8-restart-progress", TENANT_SCOPE),
          ),
        );
        const firstJob = claimedJob(
          await firstPort.claim(
            claimRequest("worker-before-restart", TENANT_SCOPE),
          ),
        );
        expect(firstJob.id).toBe(jobId);

        const retry = await firstPort.fail({
          jobId,
          tenant: TENANT_SCOPE,
          leaseToken: firstJob.lease.token,
          now: BASE_TIME,
          error: { code: "RETRYABLE_TEST_FAILURE", safeSummary: "Safe retry" },
        });
        expect(retry.outcome).toBe("retry-scheduled");
        if (retry.outcome !== "retry-scheduled") {
          throw new Error("The adapter did not persist the retry transition.");
        }

        await withFreshQueuePort(context, async (restartedPort) => {
          const restartedJob = claimedJob(
            await restartedPort.claim(
              claimRequest(
                "worker-after-restart",
                TENANT_SCOPE,
                retry.availableAt,
              ),
            ),
          );
          expect(restartedJob.id).toBe(jobId);
          await expect(
            restartedPort.settle({
              jobId,
              tenant: TENANT_SCOPE,
              leaseToken: restartedJob.lease.token,
              now: retry.availableAt,
              result: { completed: true },
            }),
          ).resolves.toEqual({ outcome: "settled", state: "succeeded" });
        });

        await expect(
          firstPort.claim(
            claimRequest(
              "worker-after-final-settle",
              TENANT_SCOPE,
              retry.availableAt,
            ),
          ),
        ).resolves.toEqual({ outcome: "empty" });
      });
    });
  },
);
