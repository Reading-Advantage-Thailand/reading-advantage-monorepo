import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

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
const SCRATCH_DATABASE_PREFIX = "durable_job_pg16_test_";
const TASK8_MIGRATION_NAMES = [
  "0000_wide_vengeance.sql",
  "0005_codecamp_schema.sql",
  "0007_codecamp_repos_reviews.sql",
  "0025_review_jobs.sql",
  "0052_durable_jobs.sql",
] as const;
const TEST_OWNED_ROLE_NAMES = [
  "durable_job_audit_owner",
  "durable_job_queue_runtime",
] as const;
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

type TestOwnedRoleName = (typeof TEST_OWNED_ROLE_NAMES)[number];

const TEST_OWNED_ROLE_DROP_SQL: Record<TestOwnedRoleName, string> = {
  durable_job_audit_owner: 'DROP ROLE IF EXISTS "durable_job_audit_owner"',
  durable_job_queue_runtime: 'DROP ROLE IF EXISTS "durable_job_queue_runtime"',
};

type HeldLockOperationOutcome<T> =
  | { readonly kind: "resolved"; readonly value: T }
  | { readonly kind: "rejected"; readonly error: unknown }
  | { readonly kind: "timeout" };

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

async function readTestOwnedRoles(
  sql: DurableJobTestSql | postgres.TransactionSql,
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

  const remainingRoles = await readTestOwnedRoles(adminSql);
  expect(
    remainingRoles,
    "PostgreSQL cleanup must leave pre-existing roles and remove every role created by this fixture.",
  ).toEqual(preexistingRoles);
}

async function applyOptionalDurableMigrations(
  migrationConnection: DurableJobTestSql,
): Promise<void> {
  for (const migrationPath of task8MigrationPaths()) {
    await applySqlFile(migrationConnection, migrationPath);
  }
}

function task8MigrationPaths(): readonly string[] {
  const migrationPaths = TASK8_MIGRATION_NAMES.map((name) =>
    resolve(DRIZZLE_ROOT, name),
  );
  const sourceByName = new Map(
    migrationPaths.map((path) => [basename(path), readFileSync(path, "utf8")]),
  );

  expect(migrationPaths.map((path) => basename(path))).toEqual([
    "0000_wide_vengeance.sql",
    "0005_codecamp_schema.sql",
    "0007_codecamp_repos_reviews.sql",
    "0025_review_jobs.sql",
    "0052_durable_jobs.sql",
  ]);
  expect(sourceByName.get("0000_wide_vengeance.sql")).toContain(
    'CREATE TABLE "users"',
  );
  expect(sourceByName.get("0005_codecamp_schema.sql")).toContain(
    'CREATE TABLE IF NOT EXISTS "codecamp_modules"',
  );
  expect(sourceByName.get("0007_codecamp_repos_reviews.sql")).toContain(
    'REFERENCES "public"."codecamp_modules"',
  );
  expect(sourceByName.get("0007_codecamp_repos_reviews.sql")).toContain(
    'REFERENCES "public"."users"',
  );
  expect(sourceByName.get("0025_review_jobs.sql")).toContain(
    'REFERENCES "codecamp_pr_reviews"',
  );
  expect(sourceByName.get("0052_durable_jobs.sql")).toContain(
    'REFERENCES "review_jobs"',
  );

  for (const migrationPath of migrationPaths) {
    expect(existsSync(migrationPath)).toBe(true);
  }
  return migrationPaths;
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

async function withHeldJobRowLock<T>(
  context: DurableJobPostgres16HarnessContext,
  lockRow: (transaction: postgres.TransactionSql) => Promise<string>,
  operation: () => Promise<T>,
  operationName: string,
): Promise<{ readonly lockedJobId: string; readonly result: T }> {
  let resolveLockReady!: (jobId: string) => void;
  let rejectLockReady!: (error: unknown) => void;
  const lockReady = new Promise<string>((resolve, reject) => {
    resolveLockReady = resolve;
    rejectLockReady = reject;
  });
  let resolveRelease!: () => void;
  const release = new Promise<void>((resolve) => {
    resolveRelease = resolve;
  });
  const lockPromise = context.connectionOne.begin(async (transaction) => {
    try {
      const lockedJobId = await lockRow(transaction);
      resolveLockReady(lockedJobId);
      await release;
      return lockedJobId;
    } catch (error) {
      rejectLockReady(error);
      throw error;
    }
  });

  let operationPromise: Promise<T> | undefined;
  let outcome: HeldLockOperationOutcome<T> | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const lockedJobId = await lockReady;
    operationPromise = operation();
    const operationOutcome = operationPromise.then(
      (value): HeldLockOperationOutcome<T> => ({ kind: "resolved", value }),
      (error): HeldLockOperationOutcome<T> => ({ kind: "rejected", error }),
    );
    const timeoutOutcome = new Promise<HeldLockOperationOutcome<T>>(
      (resolve) => {
        timeoutId = setTimeout(() => resolve({ kind: "timeout" }), 2_000);
      },
    );
    outcome = await Promise.race([operationOutcome, timeoutOutcome]);
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    resolveRelease();
    await lockPromise.catch(() => undefined);
    await operationPromise.catch(() => undefined);

    if (outcome.kind === "timeout") {
      throw new Error(
        `${operationName} did not complete while another session held one eligible row; the adapter must use FOR UPDATE SKIP LOCKED.`,
      );
    }
    if (outcome.kind === "rejected") {
      throw outcome.error;
    }
    return { lockedJobId, result: outcome.value };
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    resolveRelease();
    await lockPromise.catch(() => undefined);
    await operationPromise?.catch(() => undefined);
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
            await applyOptionalDurableMigrations(migrationConnection);
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
        await expectNoScratchDatabases();
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
      "Task 8 execution and test-owned role cleanup both failed.",
    );
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      cleanupErrors,
      "Task 8 test-owned role cleanup failed; operator inspection is required.",
    );
  }
  if (executionError !== undefined) {
    throw executionError;
  }
  return result as T;
}

const integrationEnabled = isDurableJobPostgres16IntegrationEnabled(
  process.env,
);
const LIVE_TEST_TIMEOUT_MS = 30_000;

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

  it("binds settle and fail state CASE expressions to the repository enum", () => {
    const adapterSource = readFileSync(ADAPTER_SOURCE, "utf8");
    const settleFailSource = adapterSource.slice(
      adapterSource.indexOf("const settle ="),
      adapterSource.indexOf("const reclaimExpired ="),
    );
    const stateAssignments = [
      ...settleFailSource.matchAll(/"state" = CASE[\s\S]*?END/g),
    ].map((match) => match[0]);

    expect(stateAssignments).toHaveLength(2);
    for (const assignment of stateAssignments) {
      expect(assignment).toMatch(
        /CAST\('(pending|succeeded|dead)' AS "durable_job_state"\)/,
      );
      expect(assignment).not.toMatch(/THEN\s+'(pending|succeeded|dead)'/);
    }
  });
});

describe("Task 8 PostgreSQL 16 environment guard", () => {
  it("declares the ordered migration predecessors for the live fixture", () => {
    expect(TASK8_MIGRATION_NAMES).toEqual([
      "0000_wide_vengeance.sql",
      "0005_codecamp_schema.sql",
      "0007_codecamp_repos_reviews.sql",
      "0025_review_jobs.sql",
      "0052_durable_jobs.sql",
    ]);
    expect(task8MigrationPaths()).toHaveLength(5);
  });

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
  { timeout: LIVE_TEST_TIMEOUT_MS },
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

    it("proves ready claim skips one held row lock with the declared limit", async () => {
      await withTask8Harness(async (context, firstPort, secondPort) => {
        const jobIds = [
          jobIdFromEnqueue(
            await firstPort.enqueue(enqueueRequest("task8-skip-locked-one")),
          ),
          jobIdFromEnqueue(
            await firstPort.enqueue(enqueueRequest("task8-skip-locked-two")),
          ),
        ];

        const { lockedJobId, result } = await withHeldJobRowLock(
          context,
          async (transaction) => {
            const [row] = await transaction<{ readonly id: string }[]>`
              SELECT "id"
              FROM "durable_jobs"
              WHERE "queue_name" = ${QUEUE_NAME}
                AND "tenant_mode" = 'global'
                AND "tenant_id" IS NULL
                AND "state" = 'pending'
                AND "available_at" <= ${BASE_TIME}
              ORDER BY "available_at", "id"
              LIMIT 1
              FOR UPDATE
            `;
            if (row === undefined) {
              throw new Error("The claim lock barrier found no eligible job.");
            }
            return row.id;
          },
          () =>
            secondPort.claim({
              ...claimRequest("worker-skip-locked"),
              limit: 1,
            }),
          "Ready claim",
        );

        const unlockedJobId = jobIds.find((jobId) => jobId !== lockedJobId);
        expect(unlockedJobId).toBeDefined();
        expect(result.outcome).toBe("claimed");
        if (result.outcome !== "claimed") {
          throw new Error("The lock-barrier claim did not claim a job.");
        }
        expect(result.jobs).toHaveLength(1);
        expect(result.jobs[0]?.id).toBe(unlockedJobId);
      });
    });

    it("proves expired reclaim skips one held row lock with the declared limit", async () => {
      await withTask8Harness(async (context, firstPort, secondPort) => {
        await firstPort.enqueue(enqueueRequest("task8-expired-lock-one"));
        await firstPort.enqueue(enqueueRequest("task8-expired-lock-two"));
        const firstJob = claimedJob(
          await firstPort.claim({
            ...claimRequest("worker-expired-lock-one"),
            leaseSeconds: 1,
          }),
        );
        const secondJob = claimedJob(
          await firstPort.claim({
            ...claimRequest("worker-expired-lock-two"),
            leaseSeconds: 1,
          }),
        );
        const expiredJobs = [firstJob.id, secondJob.id];

        const { lockedJobId, result } = await withHeldJobRowLock(
          context,
          async (transaction) => {
            const [row] = await transaction<{ readonly id: string }[]>`
              SELECT "id"
              FROM "durable_jobs"
              WHERE "queue_name" = ${QUEUE_NAME}
                AND "tenant_mode" = 'global'
                AND "tenant_id" IS NULL
                AND "state" = 'running'
                AND "lease_expires_at" <= ${NEXT_TIME}
              ORDER BY "lease_expires_at", "id"
              LIMIT 1
              FOR UPDATE
            `;
            if (row === undefined) {
              throw new Error("The reclaim lock barrier found no expired job.");
            }
            return row.id;
          },
          async () => {
            const reclaim = await secondPort.reclaimExpired({
              ...reclaimRequest(GLOBAL_TENANT, NEXT_TIME),
              limit: 1,
            });
            const claim = await secondPort.claim({
              ...claimRequest(
                "worker-after-expired-skip-locked",
                GLOBAL_TENANT,
                NEXT_TIME,
              ),
              limit: 1,
            });
            return { claim, reclaim };
          },
          "Expired reclaim",
        );

        const unlockedJobId = expiredJobs.find(
          (jobId) => jobId !== lockedJobId,
        );
        expect(unlockedJobId).toBeDefined();
        expect(result.reclaim).toEqual({ outcome: "reclaimed", count: 1 });
        expect(result.claim.outcome).toBe("claimed");
        if (result.claim.outcome !== "claimed") {
          throw new Error(
            "The lock-barrier reclaim did not expose the unlocked job to claim.",
          );
        }
        expect(result.claim.jobs).toHaveLength(1);
        expect(result.claim.jobs[0]?.id).toBe(unlockedJobId);
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

    it("extends a current lease and proves persisted expiry before settlement", async () => {
      await withTask8Harness(async (context, firstPort, secondPort) => {
        const jobId = jobIdFromEnqueue(
          await firstPort.enqueue(enqueueRequest("task8-positive-heartbeat")),
        );
        const claimed = claimedJob(
          await firstPort.claim({
            ...claimRequest("worker-positive-heartbeat"),
            leaseSeconds: 1,
          }),
        );
        expect(claimed.id).toBe(jobId);

        await expect(
          secondPort.heartbeat({
            jobId,
            tenant: GLOBAL_TENANT,
            leaseToken: claimed.lease.token,
            now: BASE_TIME,
            extendBySeconds: 60,
          }),
        ).resolves.toEqual({
          outcome: "extended",
          expiresAt: expectedExpiry(BASE_TIME, 60),
        });

        const persistedAfterHeartbeat = await readPersistedLeaseRow(
          context,
          jobId,
        );
        expect(
          normalizePersistedTimestamp(persistedAfterHeartbeat.leaseExpiresAt),
        ).toBe(expectedExpiry(BASE_TIME, 60));
        expect(persistedAfterHeartbeat.state).toBe("running");

        await expect(
          secondPort.settle({
            jobId,
            tenant: GLOBAL_TENANT,
            leaseToken: claimed.lease.token,
            now: NEXT_TIME,
            result: { completedAfterHeartbeat: true },
          }),
        ).resolves.toEqual({ outcome: "settled", state: "succeeded" });

        const persistedAfterSettlement = await readPersistedLeaseRow(
          context,
          jobId,
        );
        expect(persistedAfterSettlement.state).toBe("succeeded");
        expect(persistedAfterSettlement.leaseTokenHash).toBeNull();
        expect(persistedAfterSettlement.leaseExpiresAt).toBeNull();
        expect(persistedAfterSettlement.resultJson).toEqual({
          completedAfterHeartbeat: true,
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
          error: {
            code: "RETRYABLE_TEST_FAILURE",
            safeSummary: "Safe retry",
          },
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
