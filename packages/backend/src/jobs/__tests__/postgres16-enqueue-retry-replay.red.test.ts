import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import postgres from "postgres";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  DurableJobQueuePort,
  EnqueueJobRequest,
  JobTenant,
} from "../index.js";
import {
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
const TASK9_MIGRATION_NAMES = [
  "0000_wide_vengeance.sql",
  "0005_codecamp_schema.sql",
  "0007_codecamp_repos_reviews.sql",
  "0025_review_jobs.sql",
  "0052_durable_jobs.sql",
] as const;
const SCRATCH_DATABASE_PREFIX = "durable_job_pg16_test_";
const TEST_OWNED_ROLE_NAMES = [
  "durable_job_audit_owner",
  "durable_job_queue_runtime",
] as const;
const TEST_OWNED_ROLE_DROP_SQL = {
  durable_job_audit_owner: 'DROP ROLE IF EXISTS "durable_job_audit_owner"',
  durable_job_queue_runtime: 'DROP ROLE IF EXISTS "durable_job_queue_runtime"',
} as const;
const BASE_TIME = "2026-08-15T10:00:00.000Z";
const QUEUE_NAME = "task9-red";
const JOB_NAME = "codecamp.review.enqueue-retry-replay";
const GLOBAL_TENANT = { mode: "global" } as const;
const TENANT_SCOPE = { mode: "tenant", tenantId: "task9-school" } as const;
const MISSING_ADAPTER_MESSAGE =
  "Intentional Red: PostgreSQL durable-job adapter behavior is missing under the approved adapter root.";

type TestOwnedRoleName = (typeof TEST_OWNED_ROLE_NAMES)[number];
type EnqueueResult = Awaited<ReturnType<DurableJobQueuePort["enqueue"]>>;
type ClaimResult = Awaited<ReturnType<DurableJobQueuePort["claim"]>>;
type ClaimedJob = Extract<
  ClaimResult,
  { readonly outcome: "claimed" }
>["jobs"][number];
type ReplayRequest = Parameters<DurableJobQueuePort["replay"]>[0];

interface DurableJobPostgresAdapterModule {
  readonly createDurableJobQueuePort?: (input: {
    readonly sql: DurableJobTestSql;
  }) => DurableJobQueuePort;
}

interface ReplayAuditRow {
  readonly action: string;
  readonly outcome: string;
  readonly priorState: string | null;
  readonly actor: string;
  readonly authorizationDecisionId: string;
  readonly authorizationDecidedAt: string;
  readonly reason: string;
  readonly correlationId: string;
}

interface JobSnapshot {
  readonly state: string;
  readonly leaseOwner: string | null;
  readonly leaseTokenHash: string | null;
  readonly leaseExpiresAt: string | null;
  readonly payloadJson: unknown;
}

function enqueueRequest(
  idempotencyKey: string,
  tenant: JobTenant = GLOBAL_TENANT,
  overrides: Partial<EnqueueJobRequest> = {},
): EnqueueJobRequest {
  return {
    jobName: JOB_NAME,
    queueName: QUEUE_NAME,
    tenant,
    idempotencyKey,
    payload: { version: 1, idempotencyKey },
    maxAttempts: 3,
    availableAt: BASE_TIME,
    ...overrides,
  };
}

function claimRequest(
  workerId: string,
  tenant: JobTenant = GLOBAL_TENANT,
  now = BASE_TIME,
): Parameters<DurableJobQueuePort["claim"]>[0] {
  return {
    queueName: QUEUE_NAME,
    tenant,
    workerId,
    limit: 1,
    leaseSeconds: 60,
    now,
  };
}

function replayRequest(
  jobId: string,
  tenant: JobTenant = GLOBAL_TENANT,
  now = BASE_TIME,
  correlationId = "task9-replay-correlation",
): ReplayRequest {
  return {
    jobId,
    tenant,
    authorization: {
      subjectId: "task9-admin",
      permission: "admin:dashboard",
      decisionId: "task9-decision-1",
      authorizedAt: BASE_TIME,
    },
    reason: "Manual replay for a safe deterministic test.",
    correlationId,
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

function claimedJob(result: ClaimResult): ClaimedJob {
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
  return job;
}

function task9MigrationPaths(): readonly string[] {
  const paths = TASK9_MIGRATION_NAMES.map((name) =>
    resolve(DRIZZLE_ROOT, name),
  );
  expect(paths.map((path) => basename(path))).toEqual([
    "0000_wide_vengeance.sql",
    "0005_codecamp_schema.sql",
    "0007_codecamp_repos_reviews.sql",
    "0025_review_jobs.sql",
    "0052_durable_jobs.sql",
  ]);
  for (const path of paths) {
    expect(existsSync(path)).toBe(true);
  }
  return paths;
}

async function applyTask9Migrations(
  migrationConnection: DurableJobTestSql,
): Promise<void> {
  for (const path of task9MigrationPaths()) {
    const source = readFileSync(path, "utf8");
    for (const statement of source.split("--> statement-breakpoint")) {
      if (statement.trim().length > 0) {
        await migrationConnection.unsafe(statement);
      }
    }
  }
}

async function loadQueuePort(
  sql: DurableJobTestSql,
): Promise<DurableJobQueuePort> {
  expect(
    existsSync(ADAPTER_ROOT) && existsSync(ADAPTER_SOURCE),
    MISSING_ADAPTER_MESSAGE,
  ).toBe(true);
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

async function readTestOwnedRoles(
  sql: DurableJobTestSql,
): Promise<readonly TestOwnedRoleName[]> {
  const rows = await sql.unsafe<{ readonly rolname: string }[]>(
    "SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[]) ORDER BY rolname",
    [Array.from(TEST_OWNED_ROLE_NAMES)],
  );
  return TEST_OWNED_ROLE_NAMES.filter((roleName) =>
    rows.some((row) => row.rolname === roleName),
  );
}

async function cleanupTestOwnedRoles(
  adminSql: DurableJobTestSql,
  preexistingRoles: readonly TestOwnedRoleName[],
  createdRoles: readonly TestOwnedRoleName[],
): Promise<void> {
  const rolesBeforeCleanup = await readTestOwnedRoles(adminSql);
  const preexistingRoleSet = new Set(preexistingRoles);
  const createdRoleSet = new Set(createdRoles);
  const missingPreexistingRoles = preexistingRoles.filter(
    (roleName) => !rolesBeforeCleanup.includes(roleName),
  );
  const unexpectedRoles = rolesBeforeCleanup.filter(
    (roleName) =>
      !preexistingRoleSet.has(roleName) && !createdRoleSet.has(roleName),
  );
  if (missingPreexistingRoles.length > 0 || unexpectedRoles.length > 0) {
    throw new Error(
      `Refusing test-role cleanup because role ownership changed unexpectedly: missing=${missingPreexistingRoles.join(",") || "none"}; unexpected=${unexpectedRoles.join(",") || "none"}.`,
    );
  }

  for (const roleName of createdRoles) {
    if (rolesBeforeCleanup.includes(roleName)) {
      await adminSql.unsafe(TEST_OWNED_ROLE_DROP_SQL[roleName]);
    }
  }
  expect(await readTestOwnedRoles(adminSql)).toEqual(preexistingRoles);
}

async function expectNoScratchDatabases(
  adminSql: DurableJobTestSql,
): Promise<void> {
  const rows = await adminSql.unsafe<{ readonly database_name: string }[]>(
    "SELECT datname AS database_name FROM pg_database WHERE left(datname, " +
      String(SCRATCH_DATABASE_PREFIX.length) +
      ") = $1 ORDER BY datname",
    [SCRATCH_DATABASE_PREFIX],
  );
  expect(
    rows,
    "The Task 9 harness must remove every scratch database.",
  ).toEqual([]);
}

async function withTask9Harness<T>(
  testBody: (
    context: DurableJobPostgres16HarnessContext,
    firstPort: DurableJobQueuePort,
    secondPort: DurableJobQueuePort,
  ) => Promise<T>,
): Promise<T> {
  const adminUrl = resolveDurableJobPostgres16AdminUrl(process.env);
  const adminSql = postgres(adminUrl.toString(), { max: 1, prepare: false });
  let preexistingRoles: readonly TestOwnedRoleName[] = [];
  let createdRoles: readonly TestOwnedRoleName[] = [];
  let roleSnapshotRead = false;
  let result: T | undefined;
  let executionError: unknown;
  const cleanupErrors: unknown[] = [];

  try {
    preexistingRoles = await readTestOwnedRoles(adminSql);
    roleSnapshotRead = true;
    result = await withDurableJobPostgres16Harness(
      {
        migrate: async ({ migrationConnection }) => {
          try {
            await applyTask9Migrations(migrationConnection);
          } finally {
            const rolesAfterMigration =
              await readTestOwnedRoles(migrationConnection);
            createdRoles = rolesAfterMigration.filter(
              (roleName) => !preexistingRoles.includes(roleName),
            );
          }
        },
      },
      async (context) => {
        const firstPort = await loadQueuePort(context.connectionOne);
        const secondPort = await loadQueuePort(context.connectionTwo);
        return testBody(context, firstPort, secondPort);
      },
    );
  } catch (error) {
    executionError = error;
  } finally {
    if (!roleSnapshotRead) {
      cleanupErrors.push(
        new Error(
          "Refusing test-role cleanup because the pre-existing role snapshot failed.",
        ),
      );
    } else {
      try {
        await expectNoScratchDatabases(adminSql);
      } catch (error) {
        cleanupErrors.push(error);
      }
      if (cleanupErrors.length === 0) {
        try {
          await cleanupTestOwnedRoles(adminSql, preexistingRoles, createdRoles);
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
    }
    try {
      await adminSql.end({ timeout: 5 });
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  if (executionError !== undefined && cleanupErrors.length > 0) {
    throw new AggregateError(
      [executionError, ...cleanupErrors],
      "Task 9 execution and test-owned role cleanup both failed.",
    );
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      cleanupErrors,
      "Task 9 test-owned role cleanup failed; operator inspection is required.",
    );
  }
  if (executionError !== undefined) {
    throw executionError;
  }
  return result as T;
}

async function readReplayAudit(
  context: DurableJobPostgres16HarnessContext,
  jobId: string,
): Promise<readonly ReplayAuditRow[]> {
  return context.connectionTwo<ReplayAuditRow[]>`
    SELECT
      "action",
      "outcome",
      "prior_state" AS "priorState",
      "actor",
      "authorization_decision_id" AS "authorizationDecisionId",
      "authorization_decided_at"::text AS "authorizationDecidedAt",
      "reason",
      "correlation_id" AS "correlationId"
    FROM "durable_job_audit_events"
    WHERE "requested_job_id" = ${jobId}
    ORDER BY "created_at", "id"
  `;
}

async function readJobSnapshot(
  context: DurableJobPostgres16HarnessContext,
  jobId: string,
): Promise<JobSnapshot> {
  const [row] = await context.connectionTwo<JobSnapshot[]>`
    SELECT
      "state",
      "lease_owner" AS "leaseOwner",
      "lease_token_hash" AS "leaseTokenHash",
      "lease_expires_at"::text AS "leaseExpiresAt",
      "payload_json" AS "payloadJson"
    FROM "durable_jobs"
    WHERE "id" = ${jobId}
  `;
  expect(
    row,
    "The independent verifier must find the durable job row.",
  ).toBeDefined();
  if (row === undefined) {
    throw new Error("The independent verifier returned no durable job row.");
  }
  return row;
}

const integrationEnabled = isDurableJobPostgres16IntegrationEnabled(
  process.env,
);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Task 9 durable-job PostgreSQL adapter Red contract", () => {
  it("requires the exact PostgreSQL adapter root and factory", async () => {
    expect(
      existsSync(ADAPTER_ROOT) && existsSync(ADAPTER_SOURCE),
      MISSING_ADAPTER_MESSAGE,
    ).toBe(true);
    if (existsSync(ADAPTER_SOURCE)) {
      const loaded = (await import(
        ADAPTER_SOURCE
      )) as DurableJobPostgresAdapterModule;
      expect(loaded.createDurableJobQueuePort).toBeTypeOf("function");
    }
  });
});

describe.skipIf(!integrationEnabled)(
  "Task 9 isolated PostgreSQL 16 enqueue, retry, DLQ, and replay behavior",
  { timeout: 60_000 },
  () => {
    it("returns one identity for equal enqueue replay within each tenant scope", async () => {
      await withTask9Harness(async (_context, firstPort, secondPort) => {
        const [first, second] = await Promise.all([
          firstPort.enqueue(enqueueRequest("task9-equal-global")),
          secondPort.enqueue(enqueueRequest("task9-equal-global")),
        ]);
        const globalIds = [jobIdFromEnqueue(first), jobIdFromEnqueue(second)];
        expect(new Set(globalIds).size).toBe(1);

        const tenantFirst = await firstPort.enqueue(
          enqueueRequest("task9-equal-tenant", TENANT_SCOPE),
        );
        const tenantSecond = await secondPort.enqueue(
          enqueueRequest("task9-equal-tenant", TENANT_SCOPE),
        );
        const tenantIds = [
          jobIdFromEnqueue(tenantFirst),
          jobIdFromEnqueue(tenantSecond),
        ];
        expect(new Set(tenantIds).size).toBe(1);
        expect(tenantIds[0]).not.toBe(globalIds[0]);
      });
    });

    it("rejects a conflicting payload for one scoped idempotency key without replacement", async () => {
      await withTask9Harness(async (_context, firstPort) => {
        const original = enqueueRequest("task9-conflict", GLOBAL_TENANT, {
          payload: { version: 1, source: "original" },
        });
        const jobId = jobIdFromEnqueue(await firstPort.enqueue(original));
        const conflict = (await firstPort.enqueue({
          ...original,
          payload: { version: 2, source: "conflict" },
        })) as unknown as { readonly outcome: string; readonly jobId?: string };

        expect(conflict).toMatchObject({ outcome: "conflict", jobId });
        const claimed = claimedJob(
          await firstPort.claim(claimRequest("task9-conflict-worker")),
        );
        expect(claimed.id).toBe(jobId);
        expect(claimed.payload).toEqual(original.payload);
      });
    });

    it("uses a deterministic bounded retry delay for equal attempts and timestamps", async () => {
      await withTask9Harness(async (_context, firstPort) => {
        const delays: number[] = [];
        for (let index = 0; index < 8; index += 1) {
          await firstPort.enqueue(enqueueRequest(`task9-retry-${index}`));
          const claimed = claimedJob(
            await firstPort.claim(claimRequest(`task9-retry-worker-${index}`)),
          );
          const retry = await firstPort.fail({
            jobId: claimed.id,
            tenant: GLOBAL_TENANT,
            leaseToken: claimed.lease.token,
            now: BASE_TIME,
            error: {
              code: "RETRYABLE_TEST_FAILURE",
              safeSummary: "A safe retry summary.",
            },
          });
          expect(retry.outcome).toBe("retry-scheduled");
          if (retry.outcome !== "retry-scheduled") {
            throw new Error("The adapter did not schedule the retry.");
          }
          delays.push(Date.parse(retry.availableAt) - Date.parse(BASE_TIME));
        }

        expect(delays.every((delay) => delay >= 1_000 && delay <= 1_250)).toBe(
          true,
        );
        expect(new Set(delays).size).toBe(1);
      });
    });

    it("dead-letters an exhausted job with only bounded safe error metadata", async () => {
      await withTask9Harness(async (_context, firstPort) => {
        const jobId = jobIdFromEnqueue(
          await firstPort.enqueue(
            enqueueRequest("task9-exhaustion", GLOBAL_TENANT, {
              maxAttempts: 2,
            }),
          ),
        );
        const firstJob = claimedJob(
          await firstPort.claim(claimRequest("task9-exhaustion-worker-1")),
        );
        const retry = await firstPort.fail({
          jobId,
          tenant: GLOBAL_TENANT,
          leaseToken: firstJob.lease.token,
          now: BASE_TIME,
          error: {
            code: "EXHAUSTION_TEST_FAILURE",
            safeSummary: "The retry budget was exhausted.",
          },
        });
        expect(retry.outcome).toBe("retry-scheduled");
        if (retry.outcome !== "retry-scheduled") {
          throw new Error("The first failure did not schedule a retry.");
        }

        const secondJob = claimedJob(
          await firstPort.claim(
            claimRequest(
              "task9-exhaustion-worker-2",
              GLOBAL_TENANT,
              retry.availableAt,
            ),
          ),
        );
        const exhausted = await firstPort.fail({
          jobId,
          tenant: GLOBAL_TENANT,
          leaseToken: secondJob.lease.token,
          now: retry.availableAt,
          error: {
            code: "EXHAUSTION_TEST_FAILURE",
            safeSummary: "The retry budget was exhausted.",
          },
        });
        expect(exhausted).toEqual({ outcome: "dead" });

        const dead = await firstPort.listDead({
          queueName: QUEUE_NAME,
          tenant: GLOBAL_TENANT,
          limit: 10,
        });
        expect(dead.jobs).toHaveLength(1);
        expect(dead.jobs[0]).toMatchObject({
          id: jobId,
          attempt: 2,
          maxAttempts: 2,
          lastError: {
            code: "EXHAUSTION_TEST_FAILURE",
            safeSummary: "The retry budget was exhausted.",
          },
        });
        expect(dead.jobs[0]).not.toHaveProperty("payload");
        expect(dead.jobs[0]).not.toHaveProperty("rawError");
      });
    });

    it("accepts equal terminal replay once and records one safe authorized audit event", async () => {
      await withTask9Harness(async (context, firstPort) => {
        const jobId = jobIdFromEnqueue(
          await firstPort.enqueue(enqueueRequest("task9-equal-replay")),
        );
        const claimed = claimedJob(
          await firstPort.claim(claimRequest("task9-replay-worker")),
        );
        await expect(
          firstPort.settle({
            jobId,
            tenant: GLOBAL_TENANT,
            leaseToken: claimed.lease.token,
            now: BASE_TIME,
            result: { replayable: true },
          }),
        ).resolves.toEqual({ outcome: "settled", state: "succeeded" });

        const validRequest = replayRequest(jobId);
        const invalidRequest = {
          ...validRequest,
          authorization: {
            ...validRequest.authorization,
            permission: "jobs:replay",
          },
        } as unknown as ReplayRequest;
        await expect(firstPort.replay(invalidRequest)).rejects.toThrow();
        expect(await readReplayAudit(context, jobId)).toEqual([]);

        await expect(firstPort.replay(validRequest)).resolves.toEqual({
          outcome: "replayed",
          priorState: "succeeded",
        });
        await expect(firstPort.replay(validRequest)).resolves.toEqual({
          outcome: "already-pending",
        });

        await expect(readReplayAudit(context, jobId)).resolves.toEqual([
          {
            action: "replay",
            outcome: "replayed",
            priorState: "succeeded",
            actor: "task9-admin",
            authorizationDecisionId: "task9-decision-1",
            authorizationDecidedAt: "2026-08-15 10:00:00+00",
            reason: "Manual replay for a safe deterministic test.",
            correlationId: "task9-replay-correlation",
          },
        ]);
      });
    });

    it("rejects replay of a valid active lease without changing the lease or audit", async () => {
      await withTask9Harness(async (context, firstPort) => {
        const jobId = jobIdFromEnqueue(
          await firstPort.enqueue(enqueueRequest("task9-active-replay")),
        );
        claimedJob(
          await firstPort.claim({
            ...claimRequest("task9-active-replay-worker"),
            leaseSeconds: 60,
          }),
        );
        const before = await readJobSnapshot(context, jobId);

        await expect(firstPort.replay(replayRequest(jobId))).resolves.toEqual({
          outcome: "active-lease-rejected",
        });

        await expect(readJobSnapshot(context, jobId)).resolves.toEqual(before);
        await expect(readReplayAudit(context, jobId)).resolves.toEqual([]);
      });
    });
  },
);
