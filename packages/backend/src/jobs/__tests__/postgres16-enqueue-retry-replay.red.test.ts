import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import postgres from "postgres";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  DurableJobQueuePort,
  EnqueueJobRequest,
  JobTenant,
  ReclaimExpiredJobsRequest,
  ReplayAuthorizationEvidence,
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
const FOLLOW_UP_TIME = "2026-08-15T10:05:00.000Z";
const SECOND_FOLLOW_UP_TIME = "2026-08-15T10:06:00.000Z";
const STALE_AUTHORIZED_AT = "2026-08-14T10:00:00.000Z";
const QUEUE_NAME = "task9-red";
const JOB_NAME = "codecamp.review.enqueue-retry-replay";
const SHARED_IDEMPOTENCY_KEY = "task9-shared-idempotency";
const GLOBAL_TENANT = { mode: "global" } as const;
const TENANT_ONE_SCOPE = {
  mode: "tenant",
  tenantId: "task9-school-one",
} as const;
const TENANT_TWO_SCOPE = {
  mode: "tenant",
  tenantId: "task9-school-two",
} as const;
const JSONB_POISON_TIME = "2026-08-15T10:00:01.000Z";
const REPLAY_AUTHORIZATION_MAX_AGE_MS = 5 * 60 * 1_000;
const MISSING_ADAPTER_MESSAGE =
  "Intentional Red: PostgreSQL durable-job adapter behavior is missing under the approved adapter root.";

function hashLeaseToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

type TestOwnedRoleName = (typeof TEST_OWNED_ROLE_NAMES)[number];
type EnqueueResult = Awaited<ReturnType<DurableJobQueuePort["enqueue"]>>;
type ClaimResult = Awaited<ReturnType<DurableJobQueuePort["claim"]>>;
type ClaimedJob = Extract<
  ClaimResult,
  { readonly outcome: "claimed" }
>["jobs"][number];
type ReplayRequest = Parameters<DurableJobQueuePort["replay"]>[0];

interface ReplayAuthorizationVerificationInput {
  readonly jobId: string;
  readonly tenant: JobTenant;
  readonly authorization: unknown;
  readonly correlationId: string;
  readonly now: string;
}

interface ReplayAuthorizationVerifier {
  readonly verify: (
    input: Readonly<ReplayAuthorizationVerificationInput>,
  ) => Promise<ReplayAuthorizationEvidence>;
}

interface ReplayAuthorizationReceiptInput {
  readonly jobId: string;
  readonly tenant: JobTenant;
  readonly correlationId: string;
  readonly authorizedAt?: string;
}

interface ReplayAuthorizationFixture {
  readonly verifier: ReplayAuthorizationVerifier;
  readonly issue: (
    input: Readonly<ReplayAuthorizationReceiptInput>,
  ) => ReplayAuthorizationEvidence;
  readonly calls: readonly ReplayAuthorizationVerificationInput[];
}

interface DurableJobPostgresAdapterModule {
  readonly createDurableJobQueuePort?: (input: {
    readonly sql: DurableJobTestSql;
    readonly replayAuthorizationVerifier: ReplayAuthorizationVerifier;
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
  readonly queueName: string;
  readonly state: string;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly availableAt: string;
  readonly generation: number;
  readonly leaseOwner: string | null;
  readonly leaseTokenHash: string | null;
  readonly leaseExpiresAt: string | null;
  readonly rerunRequested: boolean;
  readonly rerunQueueName: string | null;
  readonly rerunPayloadJson: unknown | null;
  readonly rerunMaxAttempts: number | null;
  readonly rerunAvailableAt: string | null;
  readonly payloadJson: unknown;
  readonly resultJson: unknown | null;
}

const JSONB_ROUND_TRIP_CASES = [
  { name: "plain string", value: "task9-plain-string" },
  {
    name: "object-like string",
    value: '{"looks":"like-json","but":"must-stay-a-string"}',
  },
  { name: "number", value: 42 },
  { name: "array", value: ["task9", 7, false] },
  {
    name: "object",
    value: { kind: "task9-object", nested: { stable: true } },
  },
] as const;

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

function reclaimRequest(
  tenant: JobTenant = GLOBAL_TENANT,
  now = FOLLOW_UP_TIME,
): ReclaimExpiredJobsRequest {
  return {
    tenant,
    limit: 10,
    now,
  };
}

function replayRequest(
  jobId: string,
  tenant: JobTenant = GLOBAL_TENANT,
  now = BASE_TIME,
  correlationId = "task9-replay-correlation",
  authorization: ReplayAuthorizationEvidence,
): ReplayRequest {
  return {
    jobId,
    tenant,
    authorization,
    reason: "Manual replay for a safe deterministic test.",
    correlationId,
    now,
  };
}

function tenantKey(tenant: JobTenant): string {
  return tenant.mode === "global" ? "global" : `tenant:${tenant.tenantId}`;
}

function replayAuthorizationKey(input: {
  readonly jobId: string;
  readonly tenant: JobTenant;
  readonly correlationId: string;
  readonly authorization: unknown;
}): string {
  return JSON.stringify([
    input.jobId,
    tenantKey(input.tenant),
    input.correlationId,
    input.authorization,
  ]);
}

function createReplayAuthorizationFixture(): ReplayAuthorizationFixture {
  const receipts = new Map<string, ReplayAuthorizationEvidence>();
  const calls: ReplayAuthorizationVerificationInput[] = [];
  let receiptNumber = 0;

  const issue = (
    input: Readonly<ReplayAuthorizationReceiptInput>,
  ): ReplayAuthorizationEvidence => {
    receiptNumber += 1;
    const receipt: ReplayAuthorizationEvidence = {
      subjectId: "task9-verified-admin",
      permission: "admin:dashboard",
      decisionId: `task9-signed-receipt-${receiptNumber}`,
      authorizedAt: input.authorizedAt ?? BASE_TIME,
    };
    receipts.set(
      replayAuthorizationKey({
        jobId: input.jobId,
        tenant: input.tenant,
        correlationId: input.correlationId,
        authorization: receipt,
      }),
      receipt,
    );
    return receipt;
  };

  const verifier: ReplayAuthorizationVerifier = {
    verify: async (input) => {
      calls.push(input);
      const expected = receipts.get(
        replayAuthorizationKey({
          jobId: input.jobId,
          tenant: input.tenant,
          correlationId: input.correlationId,
          authorization: input.authorization,
        }),
      );
      if (expected === undefined) {
        throw new Error(
          "Replay authorization verifier rejected the signed receipt.",
        );
      }
      if (
        Date.parse(expected.authorizedAt) <
        Date.parse(input.now) - REPLAY_AUTHORIZATION_MAX_AGE_MS
      ) {
        throw new Error("Replay authorization receipt is stale.");
      }
      return expected;
    },
  };

  return { verifier, issue, calls };
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
  replayAuthorizationVerifier: ReplayAuthorizationVerifier,
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
  return loaded.createDurableJobQueuePort({
    sql,
    replayAuthorizationVerifier,
  });
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
    replayAuthorization: ReplayAuthorizationFixture,
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
  const replayAuthorization = createReplayAuthorizationFixture();

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
        const firstPort = await loadQueuePort(
          context.connectionOne,
          replayAuthorization.verifier,
        );
        const secondPort = await loadQueuePort(
          context.connectionTwo,
          replayAuthorization.verifier,
        );
        return testBody(context, firstPort, secondPort, replayAuthorization);
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
      "queue_name" AS "queueName",
      "state",
      "attempt",
      "max_attempts" AS "maxAttempts",
      "available_at"::text AS "availableAt",
      "generation",
      "lease_owner" AS "leaseOwner",
      "lease_token_hash" AS "leaseTokenHash",
      "lease_expires_at"::text AS "leaseExpiresAt",
      "rerun_requested" AS "rerunRequested",
      "rerun_queue_name" AS "rerunQueueName",
      "rerun_payload_json" AS "rerunPayloadJson",
      "rerun_max_attempts" AS "rerunMaxAttempts",
      "rerun_available_at"::text AS "rerunAvailableAt",
      "payload_json" AS "payloadJson",
      "result_json" AS "resultJson"
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

type TransitionEnqueueRaceOrder = "transition-first" | "enqueue-first";

async function runTransitionEnqueueRace<TTransition, TEnqueue>(
  order: TransitionEnqueueRaceOrder,
  transition: () => Promise<TTransition>,
  enqueue: () => Promise<TEnqueue>,
): Promise<{
  readonly transitionResult: TTransition;
  readonly enqueueResult: TEnqueue;
}> {
  if (order === "enqueue-first") {
    const enqueueResult = await enqueue();
    const transitionResult = await transition();
    return { transitionResult, enqueueResult };
  }

  const transitionPromise = transition();
  await new Promise<void>((resolve) => setImmediate(resolve));
  const enqueuePromise = enqueue();
  const [transitionResult, enqueueResult] = await Promise.all([
    transitionPromise,
    enqueuePromise,
  ]);
  return { transitionResult, enqueueResult };
}

function snapshotTimestamp(value: string): string {
  return new Date(value).toISOString();
}

function expectPromotedFollowUp(
  snapshot: JobSnapshot,
  followUp: EnqueueJobRequest,
): void {
  expect(snapshot.state).toBe("pending");
  expect(snapshot.queueName).toBe(followUp.queueName);
  expect(snapshot.attempt).toBe(0);
  expect(snapshot.maxAttempts).toBe(followUp.maxAttempts);
  expect(snapshotTimestamp(snapshot.availableAt)).toBe(
    new Date(followUp.availableAt).toISOString(),
  );
  expect(snapshot.generation).toBe(2);
  expect(snapshot.leaseOwner).toBeNull();
  expect(snapshot.leaseTokenHash).toBeNull();
  expect(snapshot.leaseExpiresAt).toBeNull();
  expect(snapshot.rerunRequested).toBe(false);
  expect(snapshot.rerunQueueName).toBeNull();
  expect(snapshot.rerunPayloadJson).toBeNull();
  expect(snapshot.rerunMaxAttempts).toBeNull();
  expect(snapshot.rerunAvailableAt).toBeNull();
  expect(snapshot.payloadJson).toEqual(followUp.payload);
  expect(snapshot.resultJson).toBeNull();
}

function retryDelayFrom(
  result: Awaited<ReturnType<DurableJobQueuePort["fail"]>>,
  now: string,
): number {
  expect(result.outcome).toBe("retry-scheduled");
  if (result.outcome !== "retry-scheduled") {
    throw new Error("The adapter did not schedule the retry.");
  }
  return Date.parse(result.availableAt) - Date.parse(now);
}

async function createSucceededJob(
  port: DurableJobQueuePort,
  idempotencyKey: string,
  tenant: JobTenant = GLOBAL_TENANT,
): Promise<string> {
  const jobId = jobIdFromEnqueue(
    await port.enqueue(enqueueRequest(idempotencyKey, tenant)),
  );
  const claimed = claimedJob(
    await port.claim(claimRequest(`${idempotencyKey}-worker`, tenant)),
  );
  expect(claimed.id).toBe(jobId);
  await expect(
    port.settle({
      jobId,
      tenant,
      leaseToken: claimed.lease.token,
      now: BASE_TIME,
      result: { replayable: true },
    }),
  ).resolves.toEqual({ outcome: "settled", state: "succeeded" });
  return jobId;
}

async function expectReplayDeniedBeforeWriteOrAudit(
  context: DurableJobPostgres16HarnessContext,
  port: DurableJobQueuePort,
  replayAuthorization: ReplayAuthorizationFixture,
  jobId: string,
  request: ReplayRequest,
  label: string,
): Promise<void> {
  const before = await readJobSnapshot(context, jobId);
  const auditBefore = await readReplayAudit(context, jobId);
  const callsBefore = replayAuthorization.calls.length;
  let replayResult:
    | Awaited<ReturnType<DurableJobQueuePort["replay"]>>
    | undefined;
  let replayError: unknown;

  try {
    replayResult = await port.replay(request);
  } catch (error) {
    replayError = error;
  }

  expect(replayError, `${label} must be denied`).toBeDefined();
  expect(
    replayResult,
    `${label} must not return a replay outcome`,
  ).toBeUndefined();
  expect(
    replayAuthorization.calls.length,
    `${label} must cross the injected verifier boundary`,
  ).toBe(callsBefore + 1);
  await expect(readJobSnapshot(context, jobId)).resolves.toEqual(before);
  await expect(readReplayAudit(context, jobId)).resolves.toEqual(auditBefore);
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
    it("persists every active-enqueue field and promotes the complete snapshot on settle", async () => {
      await withTask9Harness(async (context, firstPort, secondPort) => {
        const original = enqueueRequest(
          "task9-t5h3-complete-snapshot",
          GLOBAL_TENANT,
          {
            queueName: "task9-current-queue",
            payload: { generation: "current", version: 1 },
            maxAttempts: 5,
          },
        );
        const jobId = jobIdFromEnqueue(await firstPort.enqueue(original));
        const claimed = claimedJob(
          await firstPort.claim({
            ...claimRequest(
              "task9-t5h3-snapshot-worker",
              GLOBAL_TENANT,
              BASE_TIME,
            ),
            queueName: original.queueName,
          }),
        );
        expect(claimed.id).toBe(jobId);

        const followUp = enqueueRequest(
          "task9-t5h3-complete-snapshot",
          GLOBAL_TENANT,
          {
            queueName: "task9-follow-up-queue",
            payload: { generation: "follow-up", version: 2, moved: true },
            maxAttempts: 1,
            availableAt: FOLLOW_UP_TIME,
          },
        );
        await expect(secondPort.enqueue(followUp)).resolves.toEqual({
          outcome: "active-lease-retained",
          jobId,
          followUpScheduled: true,
        });

        const activeSnapshot = await readJobSnapshot(context, jobId);
        expect(activeSnapshot).toMatchObject({
          queueName: original.queueName,
          state: "running",
          attempt: 1,
          maxAttempts: original.maxAttempts,
          leaseOwner: claimed.lease.workerId,
          leaseTokenHash: expect.any(String),
          rerunRequested: true,
          rerunQueueName: followUp.queueName,
          rerunPayloadJson: followUp.payload,
          rerunMaxAttempts: followUp.maxAttempts,
          payloadJson: original.payload,
          resultJson: null,
        });
        expect(snapshotTimestamp(activeSnapshot.rerunAvailableAt ?? "")).toBe(
          FOLLOW_UP_TIME,
        );
        expect(snapshotTimestamp(activeSnapshot.availableAt)).toBe(BASE_TIME);
        expect(activeSnapshot.leaseTokenHash).toBe(
          hashLeaseToken(claimed.lease.token),
        );

        await expect(
          firstPort.settle({
            jobId,
            tenant: GLOBAL_TENANT,
            leaseToken: claimed.lease.token,
            now: BASE_TIME,
            result: { ignoredByPromotedRerun: true },
          }),
        ).resolves.toEqual({ outcome: "settled", state: "succeeded" });

        const promotedSnapshot = await readJobSnapshot(context, jobId);
        expectPromotedFollowUp(promotedSnapshot, followUp);
        const promotedClaim = claimedJob(
          await secondPort.claim({
            ...claimRequest(
              "task9-t5h3-follow-up-worker",
              GLOBAL_TENANT,
              FOLLOW_UP_TIME,
            ),
            queueName: followUp.queueName,
          }),
        );
        expect(promotedClaim.id).toBe(jobId);
        expect(promotedClaim.payload).toEqual(followUp.payload);
        expect(promotedClaim.maxAttempts).toBe(followUp.maxAttempts);
      });
    });

    it("keeps concurrent active-enqueue snapshots complete and last-commit-wins", async () => {
      await withTask9Harness(async (context, firstPort, secondPort) => {
        const identity = "task9-t5h3-last-commit-wins";
        const jobId = jobIdFromEnqueue(
          await firstPort.enqueue(
            enqueueRequest(identity, GLOBAL_TENANT, {
              queueName: "task9-current-queue",
              payload: { generation: "current" },
              maxAttempts: 4,
            }),
          ),
        );
        const claimed = claimedJob(
          await firstPort.claim({
            ...claimRequest(
              "task9-t5h3-last-commit-worker",
              GLOBAL_TENANT,
              BASE_TIME,
            ),
            queueName: "task9-current-queue",
          }),
        );

        const firstFollowUp = enqueueRequest(identity, GLOBAL_TENANT, {
          queueName: "task9-follow-up-first",
          payload: { generation: "first", fields: ["queue", "payload"] },
          maxAttempts: 1,
          availableAt: FOLLOW_UP_TIME,
        });
        const secondFollowUp = enqueueRequest(identity, GLOBAL_TENANT, {
          queueName: "task9-follow-up-second",
          payload: { generation: "second", fields: ["max", "schedule"] },
          maxAttempts: 9,
          availableAt: SECOND_FOLLOW_UP_TIME,
        });
        const [firstResult, secondResult] = await Promise.all([
          firstPort.enqueue(firstFollowUp),
          secondPort.enqueue(secondFollowUp),
        ]);
        expect(firstResult).toMatchObject({
          outcome: "active-lease-retained",
          jobId,
        });
        expect(secondResult).toMatchObject({
          outcome: "active-lease-retained",
          jobId,
        });

        const activeSnapshot = await readJobSnapshot(context, jobId);
        const actualSnapshot = {
          queueName: activeSnapshot.rerunQueueName,
          payloadJson: activeSnapshot.rerunPayloadJson,
          maxAttempts: activeSnapshot.rerunMaxAttempts,
          availableAt: snapshotTimestamp(activeSnapshot.rerunAvailableAt ?? ""),
        };
        const expectedSnapshots = [firstFollowUp, secondFollowUp].map(
          (request) => ({
            queueName: request.queueName,
            payloadJson: request.payload,
            maxAttempts: request.maxAttempts,
            availableAt: new Date(request.availableAt).toISOString(),
          }),
        );
        expect(activeSnapshot.rerunRequested).toBe(true);
        expect(expectedSnapshots).toContainEqual(actualSnapshot);
        expect(activeSnapshot.queueName).toBe("task9-current-queue");
        expect(activeSnapshot.payloadJson).toEqual({ generation: "current" });
        expect(activeSnapshot.maxAttempts).toBe(4);
        expect(activeSnapshot.attempt).toBe(claimed.attempt);
        expect(activeSnapshot.leaseTokenHash).toBe(
          hashLeaseToken(claimed.lease.token),
        );

        const committedFollowUp =
          expectedSnapshots[0]?.queueName === actualSnapshot.queueName
            ? firstFollowUp
            : secondFollowUp;
        await expect(
          firstPort.settle({
            jobId,
            tenant: GLOBAL_TENANT,
            leaseToken: claimed.lease.token,
            now: BASE_TIME,
            result: { promoted: true },
          }),
        ).resolves.toEqual({ outcome: "settled", state: "succeeded" });
        expectPromotedFollowUp(
          await readJobSnapshot(context, jobId),
          committedFollowUp,
        );
      });
    });

    it("covers both settle and active-enqueue lock orders", async () => {
      await withTask9Harness(async (context, firstPort, secondPort) => {
        for (const order of ["transition-first", "enqueue-first"] as const) {
          const identity = `task9-t5h3-settle-${order}`;
          const jobId = jobIdFromEnqueue(
            await firstPort.enqueue(enqueueRequest(identity)),
          );
          const claimed = claimedJob(
            await firstPort.claim(claimRequest(`${identity}-worker`)),
          );
          const followUp = enqueueRequest(identity, GLOBAL_TENANT, {
            queueName: `task9-settle-follow-${order}`,
            maxAttempts: 2,
            availableAt: FOLLOW_UP_TIME,
          });
          const race = await runTransitionEnqueueRace(
            order,
            () =>
              firstPort.settle({
                jobId,
                tenant: GLOBAL_TENANT,
                leaseToken: claimed.lease.token,
                now: BASE_TIME,
                result: { order },
              }),
            () => secondPort.enqueue(followUp),
          );
          expect(race.transitionResult).toEqual({
            outcome: "settled",
            state: "succeeded",
          });
          expect(["active-lease-retained", "refreshed"]).toContain(
            race.enqueueResult.outcome,
          );
          expectPromotedFollowUp(
            await readJobSnapshot(context, jobId),
            followUp,
          );
        }
      });
    });

    it("covers both fail and active-enqueue lock orders", async () => {
      await withTask9Harness(async (context, firstPort, secondPort) => {
        for (const order of ["transition-first", "enqueue-first"] as const) {
          const identity = `task9-t5h3-fail-${order}`;
          const jobId = jobIdFromEnqueue(
            await firstPort.enqueue(
              enqueueRequest(identity, GLOBAL_TENANT, { maxAttempts: 4 }),
            ),
          );
          const claimed = claimedJob(
            await firstPort.claim(claimRequest(`${identity}-worker`)),
          );
          const followUp = enqueueRequest(identity, GLOBAL_TENANT, {
            queueName: `task9-fail-follow-${order}`,
            maxAttempts: 1,
            availableAt: FOLLOW_UP_TIME,
          });
          const race = await runTransitionEnqueueRace(
            order,
            () =>
              firstPort.fail({
                jobId,
                tenant: GLOBAL_TENANT,
                leaseToken: claimed.lease.token,
                now: BASE_TIME,
                error: {
                  code: "T5H3_LOCK_ORDER_FAILURE",
                  safeSummary: "The lock-order failure is safe.",
                },
              }),
            () => secondPort.enqueue(followUp),
          );
          expect(race.transitionResult.outcome).toBe("retry-scheduled");
          expect(["active-lease-retained", "refreshed"]).toContain(
            race.enqueueResult.outcome,
          );
          expectPromotedFollowUp(
            await readJobSnapshot(context, jobId),
            followUp,
          );
        }
      });
    });

    it("covers both reclaim and active-enqueue lock orders", async () => {
      await withTask9Harness(async (context, firstPort, secondPort) => {
        for (const order of ["transition-first", "enqueue-first"] as const) {
          const identity = `task9-t5h3-reclaim-${order}`;
          const jobId = jobIdFromEnqueue(
            await firstPort.enqueue(enqueueRequest(identity)),
          );
          const claimed = claimedJob(
            await firstPort.claim({
              ...claimRequest(`${identity}-worker`),
              leaseSeconds: 1,
            }),
          );
          expect(claimed.id).toBe(jobId);
          const followUp = enqueueRequest(identity, GLOBAL_TENANT, {
            queueName: `task9-reclaim-follow-${order}`,
            maxAttempts: 3,
            availableAt: FOLLOW_UP_TIME,
          });
          const race = await runTransitionEnqueueRace(
            order,
            () => firstPort.reclaimExpired(reclaimRequest()),
            () => secondPort.enqueue(followUp),
          );
          expect(race.transitionResult).toEqual({
            outcome: "reclaimed",
            count: 1,
          });
          expect(["active-lease-retained", "refreshed"]).toContain(
            race.enqueueResult.outcome,
          );
          expectPromotedFollowUp(
            await readJobSnapshot(context, jobId),
            followUp,
          );
        }
      });
    });

    it("scopes one shared job name and idempotency key globally and by tenant", async () => {
      await withTask9Harness(async (_context, firstPort, secondPort) => {
        const scopes = [
          GLOBAL_TENANT,
          TENANT_ONE_SCOPE,
          TENANT_TWO_SCOPE,
        ] as const;
        const ids = [] as string[];

        for (const [index, tenant] of scopes.entries()) {
          const [first, second] = await Promise.all([
            firstPort.enqueue(enqueueRequest(SHARED_IDEMPOTENCY_KEY, tenant)),
            secondPort.enqueue(enqueueRequest(SHARED_IDEMPOTENCY_KEY, tenant)),
          ]);
          const firstId = jobIdFromEnqueue(first);
          const secondId = jobIdFromEnqueue(second);
          expect(secondId, `scope ${index} must return one identity`).toBe(
            firstId,
          );
          ids.push(firstId);
        }

        expect(new Set(ids).size).toBe(scopes.length);
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

    for (const [index, testCase] of JSONB_ROUND_TRIP_CASES.entries()) {
      it(`round-trips JSONB ${testCase.name} values exactly`, async () => {
        await withTask9Harness(async (context, firstPort) => {
          const jobId = jobIdFromEnqueue(
            await firstPort.enqueue(
              enqueueRequest(`task9-jsonb-${index}`, GLOBAL_TENANT, {
                payload: testCase.value,
              }),
            ),
          );
          const enqueued = await readJobSnapshot(context, jobId);
          expect(enqueued.payloadJson).toEqual(testCase.value);
          expect(enqueued.resultJson).toBeNull();

          const claimed = claimedJob(
            await firstPort.claim(claimRequest(`task9-jsonb-worker-${index}`)),
          );
          expect(claimed.payload).toEqual(testCase.value);
          await expect(
            firstPort.settle({
              jobId,
              tenant: GLOBAL_TENANT,
              leaseToken: claimed.lease.token,
              now: BASE_TIME,
              result: testCase.value,
            }),
          ).resolves.toEqual({ outcome: "settled", state: "succeeded" });

          const settled = await readJobSnapshot(context, jobId);
          expect(settled.payloadJson).toEqual(testCase.value);
          expect(settled.resultJson).toEqual(testCase.value);
        });
      });
    }

    it("isolates an object-like JSONB poison row from a neighboring row", async () => {
      await withTask9Harness(async (_context, firstPort) => {
        const poisonPayload = '{"poison":true}';
        const healthyPayload = { healthy: true };
        const poisonJobId = jobIdFromEnqueue(
          await firstPort.enqueue(
            enqueueRequest("task9-jsonb-poison", GLOBAL_TENANT, {
              payload: poisonPayload,
              availableAt: BASE_TIME,
            }),
          ),
        );
        const healthyJobId = jobIdFromEnqueue(
          await firstPort.enqueue(
            enqueueRequest("task9-jsonb-healthy", GLOBAL_TENANT, {
              payload: healthyPayload,
              availableAt: JSONB_POISON_TIME,
            }),
          ),
        );

        const result = await firstPort.claim({
          ...claimRequest(
            "task9-jsonb-poison-isolation-worker",
            GLOBAL_TENANT,
            JSONB_POISON_TIME,
          ),
          limit: 2,
        });
        expect(result.outcome).toBe("claimed");
        if (result.outcome !== "claimed") {
          throw new Error(
            "The poison-row isolation claim did not return jobs.",
          );
        }
        expect(result.jobs).toHaveLength(2);
        const jobsById = new Map(result.jobs.map((job) => [job.id, job]));
        expect(jobsById.get(poisonJobId)?.payload).toEqual(poisonPayload);
        expect(jobsById.get(healthyJobId)?.payload).toEqual(healthyPayload);
      });
    });

    it("repeats jitter per job and attempt, bounds delay, and disperses job IDs", async () => {
      await withTask9Harness(async (_context, firstPort) => {
        const repeatedRequest = enqueueRequest(
          "task9-repeated-jitter",
          GLOBAL_TENANT,
          {
            maxAttempts: 2,
          },
        );
        const jobId = jobIdFromEnqueue(
          await firstPort.enqueue(repeatedRequest),
        );
        const firstJob = claimedJob(
          await firstPort.claim(claimRequest("task9-repeated-jitter-worker-1")),
        );
        const firstRetry = await firstPort.fail({
          jobId,
          tenant: GLOBAL_TENANT,
          leaseToken: firstJob.lease.token,
          now: BASE_TIME,
          error: {
            code: "RETRYABLE_TEST_FAILURE",
            safeSummary: "A safe retry summary.",
          },
        });
        const firstDelay = retryDelayFrom(firstRetry, BASE_TIME);
        expect(firstDelay).toBeGreaterThanOrEqual(1_000);
        expect(firstDelay).toBeLessThanOrEqual(1_250);

        const secondJob = claimedJob(
          await firstPort.claim(
            claimRequest(
              "task9-repeated-jitter-worker-2",
              GLOBAL_TENANT,
              firstRetry.outcome === "retry-scheduled"
                ? firstRetry.availableAt
                : BASE_TIME,
            ),
          ),
        );
        const exhausted = await firstPort.fail({
          jobId,
          tenant: GLOBAL_TENANT,
          leaseToken: secondJob.lease.token,
          now:
            firstRetry.outcome === "retry-scheduled"
              ? firstRetry.availableAt
              : BASE_TIME,
          error: {
            code: "RETRYABLE_TEST_FAILURE",
            safeSummary: "A safe retry summary.",
          },
        });
        expect(exhausted).toEqual({ outcome: "dead" });

        await expect(firstPort.enqueue(repeatedRequest)).resolves.toEqual({
          outcome: "refreshed",
          jobId,
          priorState: "dead",
        });
        const repeatedJob = claimedJob(
          await firstPort.claim(
            claimRequest("task9-repeated-jitter-worker-repeat"),
          ),
        );
        expect(repeatedJob.id).toBe(jobId);
        expect(repeatedJob.attempt).toBe(1);
        const repeatedRetry = await firstPort.fail({
          jobId,
          tenant: GLOBAL_TENANT,
          leaseToken: repeatedJob.lease.token,
          now: BASE_TIME,
          error: {
            code: "RETRYABLE_TEST_FAILURE",
            safeSummary: "A safe retry summary.",
          },
        });
        expect(retryDelayFrom(repeatedRetry, BASE_TIME)).toBe(firstDelay);
        if (repeatedRetry.outcome !== "retry-scheduled") {
          throw new Error("The repeated retry did not schedule a retry.");
        }
        const repeatedFinalJob = claimedJob(
          await firstPort.claim(
            claimRequest(
              "task9-repeated-jitter-worker-final",
              GLOBAL_TENANT,
              repeatedRetry.availableAt,
            ),
          ),
        );
        await expect(
          firstPort.fail({
            jobId,
            tenant: GLOBAL_TENANT,
            leaseToken: repeatedFinalJob.lease.token,
            now: repeatedRetry.availableAt,
            error: {
              code: "RETRYABLE_TEST_FAILURE",
              safeSummary: "A safe retry summary.",
            },
          }),
        ).resolves.toEqual({ outcome: "dead" });

        const unrelatedDelays: number[] = [];
        for (let index = 0; index < 16; index += 1) {
          await firstPort.enqueue(
            enqueueRequest(`task9-unrelated-jitter-${index}`),
          );
          const unrelatedJob = claimedJob(
            await firstPort.claim(
              claimRequest(`task9-unrelated-jitter-worker-${index}`),
            ),
          );
          const unrelatedRetry = await firstPort.fail({
            jobId: unrelatedJob.id,
            tenant: GLOBAL_TENANT,
            leaseToken: unrelatedJob.lease.token,
            now: BASE_TIME,
            error: {
              code: "RETRYABLE_TEST_FAILURE",
              safeSummary: "A safe retry summary.",
            },
          });
          const delay = retryDelayFrom(unrelatedRetry, BASE_TIME);
          expect(delay).toBeGreaterThanOrEqual(1_000);
          expect(delay).toBeLessThanOrEqual(1_250);
          unrelatedDelays.push(delay);
        }
        expect(new Set(unrelatedDelays).size).toBeGreaterThan(1);
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

    it("accepts one verified terminal replay and records one safe audit event", async () => {
      await withTask9Harness(
        async (context, firstPort, _secondPort, replayAuthorization) => {
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

          const validAuthorization = replayAuthorization.issue({
            jobId,
            tenant: GLOBAL_TENANT,
            correlationId: "task9-replay-correlation",
          });
          const validRequest = replayRequest(
            jobId,
            GLOBAL_TENANT,
            BASE_TIME,
            "task9-replay-correlation",
            validAuthorization,
          );
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
              actor: validAuthorization.subjectId,
              authorizationDecisionId: validAuthorization.decisionId,
              authorizationDecidedAt: "2026-08-15 10:00:00+00",
              reason: "Manual replay for a safe deterministic test.",
              correlationId: "task9-replay-correlation",
            },
          ]);
        },
      );
    });

    it("rejects replay of a valid active lease without changing the lease or audit", async () => {
      await withTask9Harness(
        async (context, firstPort, _secondPort, replayAuthorization) => {
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

          const authorization = replayAuthorization.issue({
            jobId,
            tenant: GLOBAL_TENANT,
            correlationId: "task9-replay-correlation",
          });
          await expect(
            firstPort.replay(
              replayRequest(
                jobId,
                GLOBAL_TENANT,
                BASE_TIME,
                "task9-replay-correlation",
                authorization,
              ),
            ),
          ).resolves.toEqual({ outcome: "active-lease-rejected" });

          await expect(readJobSnapshot(context, jobId)).resolves.toEqual(
            before,
          );
          await expect(readReplayAudit(context, jobId)).resolves.toEqual([]);
        },
      );
    });

    it("denies a forged replay receipt before writing or auditing", async () => {
      await withTask9Harness(
        async (context, firstPort, _secondPort, replayAuthorization) => {
          const jobId = await createSucceededJob(
            firstPort,
            "task9-forged-replay",
          );
          const correlationId = "task9-forged-correlation";
          const trusted = replayAuthorization.issue({
            jobId,
            tenant: GLOBAL_TENANT,
            correlationId,
          });
          await expectReplayDeniedBeforeWriteOrAudit(
            context,
            firstPort,
            replayAuthorization,
            jobId,
            replayRequest(jobId, GLOBAL_TENANT, BASE_TIME, correlationId, {
              ...trusted,
              subjectId: "task9-forged-subject",
            }),
            "forged replay receipt",
          );
        },
      );
    });

    it("denies a stale replay receipt before writing or auditing", async () => {
      await withTask9Harness(
        async (context, firstPort, _secondPort, replayAuthorization) => {
          const jobId = await createSucceededJob(
            firstPort,
            "task9-stale-replay",
          );
          const correlationId = "task9-stale-correlation";
          const stale = replayAuthorization.issue({
            jobId,
            tenant: GLOBAL_TENANT,
            correlationId,
            authorizedAt: STALE_AUTHORIZED_AT,
          });
          await expectReplayDeniedBeforeWriteOrAudit(
            context,
            firstPort,
            replayAuthorization,
            jobId,
            replayRequest(
              jobId,
              GLOBAL_TENANT,
              BASE_TIME,
              correlationId,
              stale,
            ),
            "stale replay receipt",
          );
        },
      );
    });

    it("denies a receipt signed for another job before writing or auditing", async () => {
      await withTask9Harness(
        async (context, firstPort, _secondPort, replayAuthorization) => {
          const signedJobId = await createSucceededJob(
            firstPort,
            "task9-wrong-job-signed",
          );
          const targetJobId = await createSucceededJob(
            firstPort,
            "task9-wrong-job-target",
          );
          const correlationId = "task9-wrong-job-correlation";
          const signedForOtherJob = replayAuthorization.issue({
            jobId: signedJobId,
            tenant: GLOBAL_TENANT,
            correlationId,
          });
          await expectReplayDeniedBeforeWriteOrAudit(
            context,
            firstPort,
            replayAuthorization,
            targetJobId,
            replayRequest(
              targetJobId,
              GLOBAL_TENANT,
              BASE_TIME,
              correlationId,
              signedForOtherJob,
            ),
            "wrong-job replay receipt",
          );
        },
      );
    });

    it("denies a receipt signed for another tenant before writing or auditing", async () => {
      await withTask9Harness(
        async (context, firstPort, _secondPort, replayAuthorization) => {
          const signedJobId = await createSucceededJob(
            firstPort,
            "task9-wrong-tenant-signed",
            GLOBAL_TENANT,
          );
          const targetJobId = await createSucceededJob(
            firstPort,
            "task9-wrong-tenant-target",
            TENANT_ONE_SCOPE,
          );
          const correlationId = "task9-wrong-tenant-correlation";
          const signedForOtherTenant = replayAuthorization.issue({
            jobId: signedJobId,
            tenant: GLOBAL_TENANT,
            correlationId,
          });
          await expectReplayDeniedBeforeWriteOrAudit(
            context,
            firstPort,
            replayAuthorization,
            targetJobId,
            replayRequest(
              targetJobId,
              TENANT_ONE_SCOPE,
              BASE_TIME,
              correlationId,
              signedForOtherTenant,
            ),
            "wrong-tenant replay receipt",
          );
        },
      );
    });

    it("denies a malformed replay receipt before writing or auditing", async () => {
      await withTask9Harness(
        async (context, firstPort, _secondPort, replayAuthorization) => {
          const jobId = await createSucceededJob(
            firstPort,
            "task9-malformed-replay",
          );
          const correlationId = "task9-malformed-correlation";
          const trusted = replayAuthorization.issue({
            jobId,
            tenant: GLOBAL_TENANT,
            correlationId,
          });
          await expectReplayDeniedBeforeWriteOrAudit(
            context,
            firstPort,
            replayAuthorization,
            jobId,
            replayRequest(jobId, GLOBAL_TENANT, BASE_TIME, correlationId, {
              ...trusted,
              decisionId: "%%%malformed-receipt%%%",
            }),
            "malformed replay receipt",
          );
        },
      );
    });

    it("denies a correlation-mismatched receipt before writing or auditing", async () => {
      await withTask9Harness(
        async (context, firstPort, _secondPort, replayAuthorization) => {
          const jobId = await createSucceededJob(
            firstPort,
            "task9-correlation-mismatch",
          );
          const signedCorrelationId = "task9-signed-correlation";
          const signed = replayAuthorization.issue({
            jobId,
            tenant: GLOBAL_TENANT,
            correlationId: signedCorrelationId,
          });
          await expectReplayDeniedBeforeWriteOrAudit(
            context,
            firstPort,
            replayAuthorization,
            jobId,
            replayRequest(
              jobId,
              GLOBAL_TENANT,
              BASE_TIME,
              "task9-request-correlation",
              signed,
            ),
            "correlation-mismatched replay receipt",
          );
        },
      );
    });
  },
);
