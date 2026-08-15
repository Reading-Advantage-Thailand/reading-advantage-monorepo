import { createHash, randomBytes, randomInt } from "node:crypto";

import type postgres from "postgres";

import {
  claimJobsRequestSchema,
  enqueueJobRequestSchema,
  failJobRequestSchema,
  heartbeatJobRequestSchema,
  jobIdSchema,
  jobTimestampSchema,
  reclaimExpiredJobsRequestSchema,
  replayJobRequestSchema,
  settleJobRequestSchema,
  type ClaimJobsRequest,
  type DurableJobQueuePort,
  type EnqueueJobRequest,
  type JobState,
  type JobTenant,
} from "../../index.js";
import {
  listDeadJobsRequestSchema,
  type ListDeadJobsRequest,
} from "../../dead-letter-contracts.js";

type DurableJobSql = postgres.Sql;
type DurableJobTransaction = postgres.TransactionSql;
type DurableRunningJob = Extract<
  Awaited<ReturnType<DurableJobQueuePort["claim"]>>,
  { readonly outcome: "claimed" }
>["jobs"][number];

interface DurableJobRow {
  readonly id: string;
  readonly job_name: string;
  readonly queue_name: string;
  readonly tenant_mode: "global" | "tenant";
  readonly tenant_id: string | null;
  readonly idempotency_key: string;
  readonly payload_json: unknown;
  readonly payload_fingerprint: string;
  readonly state: JobState;
  readonly attempt: number;
  readonly max_attempts: number;
  readonly available_at: Date | string;
  readonly lease_token_hash: string | null;
  readonly lease_owner: string | null;
  readonly lease_expires_at: Date | string | null;
  readonly redeliver_current_attempt: boolean;
  readonly rerun_requested: boolean;
  readonly rerun_queue_name: string | null;
  readonly rerun_payload_json: unknown | null;
  readonly rerun_payload_fingerprint: string | null;
  readonly rerun_max_attempts: number | null;
  readonly rerun_available_at: Date | string | null;
  readonly result_json: unknown | null;
  readonly last_error_code: string | null;
  readonly last_error_summary: string | null;
  readonly completed_at: Date | string | null;
  readonly generation: number;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
}

interface LeaseExpiryRow {
  readonly lease_expires_at: Date | string | null;
}

interface DeadJobRow {
  readonly id: string;
  readonly job_name: string;
  readonly queue_name: string;
  readonly tenant_mode: "global" | "tenant";
  readonly tenant_id: string | null;
  readonly attempt: number;
  readonly max_attempts: number;
  readonly last_error_code: string;
  readonly last_error_summary: string;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
  readonly completed_at: Date | string;
}

interface DeadLetterCursor {
  readonly updatedAt: string;
  readonly id: string;
}

const RETRY_BASE_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 60_000;
const RETRY_JITTER_MS = 250;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function opaqueLeaseToken(): string {
  return randomBytes(24).toString("base64url");
}

function jsonText(value: unknown): string {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) {
    throw new TypeError("Durable job JSON values cannot be undefined.");
  }
  return encoded;
}

function payloadFingerprint(payload: unknown): string {
  return digest(jsonText(payload));
}

function retryDelayMs(attempt: number): number {
  const exponent = Math.min(Math.max(attempt - 1, 0), 10);
  const exponential = Math.min(
    RETRY_MAX_DELAY_MS,
    RETRY_BASE_DELAY_MS * 2 ** exponent,
  );
  const jitterLimit = Math.min(
    RETRY_JITTER_MS,
    RETRY_MAX_DELAY_MS - exponential,
  );
  return exponential + randomInt(0, jitterLimit + 1);
}

function encodeDeadLetterCursor(
  row: Pick<DeadJobRow, "id" | "updated_at">,
): string {
  const cursor: DeadLetterCursor = {
    id: row.id,
    updatedAt: isoTimestamp(row.updated_at),
  };
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeDeadLetterCursor(value: string): DeadLetterCursor {
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("id" in decoded) ||
      !("updatedAt" in decoded) ||
      typeof decoded.id !== "string" ||
      typeof decoded.updatedAt !== "string" ||
      !jobIdSchema.safeParse(decoded.id).success ||
      !jobTimestampSchema.safeParse(decoded.updatedAt).success
    ) {
      throw new TypeError("The dead-letter cursor is invalid.");
    }
    return { id: decoded.id, updatedAt: decoded.updatedAt };
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message === "The dead-letter cursor is invalid."
    ) {
      throw error;
    }
    throw new TypeError("The dead-letter cursor is invalid.");
  }
}

function isoTimestamp(value: Date | string): string {
  return new Date(value).toISOString();
}

function tenantId(tenant: JobTenant): string | null {
  return tenant.mode === "tenant" ? tenant.tenantId : null;
}

function tenantFromRow(row: DurableJobRow): JobTenant {
  if (row.tenant_mode === "global") {
    return { mode: "global" };
  }
  if (row.tenant_id === null) {
    throw new Error("A tenant durable job row must contain tenant_id.");
  }
  return { mode: "tenant", tenantId: row.tenant_id };
}

function runningEnvelope(row: DurableJobRow): DurableRunningJob {
  if (row.lease_owner === null || row.lease_expires_at === null) {
    throw new Error("A running durable job row must contain an active lease.");
  }
  const envelope = {
    id: row.id,
    jobName: row.job_name,
    queueName: row.queue_name,
    tenant: tenantFromRow(row),
    idempotencyKey: row.idempotency_key,
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    availableAt: isoTimestamp(row.available_at),
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
    payload: row.payload_json,
    state: "running" as const,
    lease: {
      token: "",
      workerId: row.lease_owner,
      expiresAt: isoTimestamp(row.lease_expires_at),
    },
    ...(row.last_error_code === null || row.last_error_summary === null
      ? {}
      : {
          lastError: {
            code: row.last_error_code,
            safeSummary: row.last_error_summary,
          },
        }),
  };
  return envelope as DurableRunningJob;
}

async function leaseMismatch(
  transaction: DurableJobTransaction,
  jobId: string,
  tenant: JobTenant,
): Promise<{ readonly outcome: "stale-lease" | "not-running" | "missing" }> {
  const rows = await transaction<readonly Pick<DurableJobRow, "state">[]>`
    SELECT "state"
    FROM "durable_jobs"
    WHERE "id" = ${jobId}
      AND "tenant_mode" = ${tenant.mode}
      AND "tenant_id" IS NOT DISTINCT FROM ${tenantId(tenant)}
  `;
  const row = rows[0];
  if (row === undefined) {
    return { outcome: "missing" };
  }
  return row.state === "running"
    ? { outcome: "stale-lease" }
    : { outcome: "not-running" };
}

function deadSummary(row: DeadJobRow) {
  return {
    id: row.id,
    jobName: row.job_name,
    queueName: row.queue_name,
    tenant:
      row.tenant_mode === "global"
        ? ({ mode: "global" } as const)
        : ({ mode: "tenant", tenantId: row.tenant_id ?? "" } as const),
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    lastError: {
      code: row.last_error_code,
      safeSummary: row.last_error_summary,
    },
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
    completedAt: isoTimestamp(row.completed_at),
  };
}

/**
 * Creates the PostgreSQL durable-job port behind the provider-neutral jobs contract.
 * @param input PostgreSQL client used for transaction-scoped queue operations.
 * @returns A frozen durable-job queue port with tenant and lease enforcement.
 */
export function createDurableJobQueuePort(input: {
  readonly sql: DurableJobSql;
}): DurableJobQueuePort {
  const enqueue = async (
    request: Readonly<EnqueueJobRequest>,
  ): Promise<Awaited<ReturnType<DurableJobQueuePort["enqueue"]>>> => {
    const parsed = enqueueJobRequestSchema.parse(request);
    const payload = jsonText(parsed.payload);
    const fingerprint = payloadFingerprint(parsed.payload);
    const scopeId = tenantId(parsed.tenant);

    return input.sql.begin(async (transaction) => {
      const inserted = await transaction<readonly { readonly id: string }[]>`
        INSERT INTO "durable_jobs" (
          "job_name", "queue_name", "tenant_mode", "tenant_id",
          "idempotency_key", "payload_json", "payload_fingerprint",
          "state", "attempt", "max_attempts", "available_at",
          "redeliver_current_attempt", "rerun_requested", "generation",
          "created_at", "updated_at"
        ) VALUES (
          ${parsed.jobName}, ${parsed.queueName}, ${parsed.tenant.mode}, ${scopeId},
          ${parsed.idempotencyKey}, ${payload}::jsonb, ${fingerprint},
          'pending', 0, ${parsed.maxAttempts}, ${parsed.availableAt},
          false, false, 1, ${parsed.availableAt}, ${parsed.availableAt}
        )
        ON CONFLICT DO NOTHING
        RETURNING "id"
      `;
      const insertedRow = inserted[0];
      if (insertedRow !== undefined) {
        return { outcome: "enqueued", jobId: insertedRow.id };
      }

      const existingRows = await transaction<readonly DurableJobRow[]>`
        SELECT *
        FROM "durable_jobs"
        WHERE "job_name" = ${parsed.jobName}
          AND "tenant_mode" = ${parsed.tenant.mode}
          AND "tenant_id" IS NOT DISTINCT FROM ${scopeId}
          AND "idempotency_key" = ${parsed.idempotencyKey}
        FOR UPDATE
      `;
      const existing = existingRows[0];
      if (existing === undefined) {
        throw new Error("Durable job identity conflict returned no row.");
      }

      if (existing.state === "running") {
        await transaction`
          UPDATE "durable_jobs"
          SET "rerun_requested" = true,
              "rerun_queue_name" = ${parsed.queueName},
              "rerun_payload_json" = ${payload}::jsonb,
              "rerun_payload_fingerprint" = ${fingerprint},
              "rerun_max_attempts" = ${parsed.maxAttempts},
              "rerun_available_at" = ${parsed.availableAt},
              "updated_at" = ${parsed.availableAt}
          WHERE "id" = ${existing.id}
        `;
        return {
          outcome: "active-lease-retained",
          jobId: existing.id,
          followUpScheduled: true,
        };
      }

      const nextGeneration =
        existing.state === "pending"
          ? existing.generation
          : existing.generation + 1;
      await transaction`
        UPDATE "durable_jobs"
        SET "job_name" = ${parsed.jobName},
            "queue_name" = ${parsed.queueName},
            "tenant_mode" = ${parsed.tenant.mode},
            "tenant_id" = ${scopeId},
            "payload_json" = ${payload}::jsonb,
            "payload_fingerprint" = ${fingerprint},
            "state" = 'pending',
            "attempt" = 0,
            "max_attempts" = ${parsed.maxAttempts},
            "available_at" = ${parsed.availableAt},
            "lease_token_hash" = NULL,
            "lease_owner" = NULL,
            "lease_expires_at" = NULL,
            "redeliver_current_attempt" = false,
            "rerun_requested" = false,
            "rerun_queue_name" = NULL,
            "rerun_payload_json" = NULL,
            "rerun_payload_fingerprint" = NULL,
            "rerun_max_attempts" = NULL,
            "rerun_available_at" = NULL,
            "result_json" = NULL,
            "last_error_code" = NULL,
            "last_error_summary" = NULL,
            "completed_at" = NULL,
            "generation" = ${nextGeneration},
            "updated_at" = ${parsed.availableAt}
        WHERE "id" = ${existing.id}
      `;
      return {
        outcome: "refreshed",
        jobId: existing.id,
        priorState: existing.state,
      };
    });
  };

  const claim = async (
    request: Readonly<ClaimJobsRequest>,
  ): Promise<Awaited<ReturnType<DurableJobQueuePort["claim"]>>> => {
    const parsed = claimJobsRequestSchema.parse(request);
    const scopeId = tenantId(parsed.tenant);
    return input.sql.begin(async (transaction) => {
      const candidates = await transaction<readonly DurableJobRow[]>`
        SELECT *
        FROM "durable_jobs"
        WHERE "queue_name" = ${parsed.queueName}
          AND "tenant_mode" = ${parsed.tenant.mode}
          AND "tenant_id" IS NOT DISTINCT FROM ${scopeId}
          AND "state" = 'pending'
          AND "available_at" <= ${parsed.now}
          AND ("redeliver_current_attempt" = true OR "attempt" < "max_attempts")
        ORDER BY "available_at", "id"
        LIMIT ${parsed.limit}
        FOR UPDATE SKIP LOCKED
      `;
      if (candidates.length === 0) {
        return { outcome: "empty" };
      }

      const claimed: DurableRunningJob[] = [];
      for (const candidate of candidates) {
        const leaseToken = opaqueLeaseToken();
        const leaseExpiresAt = new Date(
          Date.parse(parsed.now) + parsed.leaseSeconds * 1_000,
        ).toISOString();
        const nextAttempt = candidate.redeliver_current_attempt
          ? candidate.attempt
          : candidate.attempt + 1;
        const rows = await transaction<readonly DurableJobRow[]>`
          UPDATE "durable_jobs"
          SET "state" = 'running',
              "attempt" = ${nextAttempt},
              "lease_token_hash" = ${digest(leaseToken)},
              "lease_owner" = ${parsed.workerId},
              "lease_expires_at" = ${leaseExpiresAt},
              "redeliver_current_attempt" = false,
              "updated_at" = ${parsed.now}
          WHERE "id" = ${candidate.id}
          RETURNING *
        `;
        const row = rows[0];
        if (row === undefined) {
          throw new Error("Durable job claim returned no updated row.");
        }
        const envelope = runningEnvelope(row);
        claimed.push({
          ...envelope,
          lease: {
            ...envelope.lease,
            token: leaseToken,
          },
        });
      }
      return { outcome: "claimed", jobs: claimed };
    });
  };

  const heartbeat = async (
    request: Parameters<DurableJobQueuePort["heartbeat"]>[0],
  ): Promise<Awaited<ReturnType<DurableJobQueuePort["heartbeat"]>>> => {
    const parsed = heartbeatJobRequestSchema.parse(request);
    const scopeId = tenantId(parsed.tenant);
    const expiresAt = new Date(
      Date.parse(parsed.now) + parsed.extendBySeconds * 1_000,
    ).toISOString();
    return input.sql.begin(async (transaction) => {
      const rows = await transaction<readonly LeaseExpiryRow[]>`
        UPDATE "durable_jobs"
        SET "lease_expires_at" = ${expiresAt}, "updated_at" = ${parsed.now}
        WHERE "id" = ${parsed.jobId}
          AND "tenant_mode" = ${parsed.tenant.mode}
          AND "tenant_id" IS NOT DISTINCT FROM ${scopeId}
          AND "state" = 'running'
          AND "lease_token_hash" = ${digest(parsed.leaseToken)}
          AND "lease_expires_at" > ${parsed.now}
        RETURNING "lease_expires_at"
      `;
      const row = rows[0];
      if (row !== undefined && row.lease_expires_at !== null) {
        return {
          outcome: "extended",
          expiresAt: isoTimestamp(row.lease_expires_at),
        };
      }
      return leaseMismatch(transaction, parsed.jobId, parsed.tenant);
    });
  };

  const settle = async (
    request: Parameters<DurableJobQueuePort["settle"]>[0],
  ): Promise<Awaited<ReturnType<DurableJobQueuePort["settle"]>>> => {
    const parsed = settleJobRequestSchema.parse(request);
    const scopeId = tenantId(parsed.tenant);
    const result = jsonText(parsed.result);
    return input.sql.begin(async (transaction) => {
      const rows = await transaction<
        readonly { readonly state: "pending" | "succeeded" }[]
      >`
        UPDATE "durable_jobs"
        SET "queue_name" = CASE
              WHEN "rerun_requested" THEN "rerun_queue_name"
              ELSE "queue_name"
            END,
            "payload_json" = CASE
              WHEN "rerun_requested" THEN "rerun_payload_json"
              ELSE "payload_json"
            END,
            "payload_fingerprint" = CASE
              WHEN "rerun_requested" THEN "rerun_payload_fingerprint"
              ELSE "payload_fingerprint"
            END,
            "state" = CASE
              WHEN "rerun_requested" THEN CAST('pending' AS "durable_job_state")
              ELSE CAST('succeeded' AS "durable_job_state")
            END,
            "attempt" = CASE WHEN "rerun_requested" THEN 0 ELSE "attempt" END,
            "max_attempts" = CASE
              WHEN "rerun_requested" THEN "rerun_max_attempts"
              ELSE "max_attempts"
            END,
            "available_at" = CASE
              WHEN "rerun_requested" THEN "rerun_available_at"
              ELSE "available_at"
            END,
            "lease_token_hash" = NULL,
            "lease_owner" = NULL,
            "lease_expires_at" = NULL,
            "redeliver_current_attempt" = false,
            "rerun_requested" = false,
            "rerun_queue_name" = NULL,
            "rerun_payload_json" = NULL,
            "rerun_payload_fingerprint" = NULL,
            "rerun_max_attempts" = NULL,
            "rerun_available_at" = NULL,
            "result_json" = CASE
              WHEN "rerun_requested" THEN NULL
              ELSE ${result}::jsonb
            END,
            "last_error_code" = NULL,
            "last_error_summary" = NULL,
            "completed_at" = CASE
              WHEN "rerun_requested" THEN NULL
              ELSE ${parsed.now}::timestamptz
            END,
            "generation" = CASE
              WHEN "rerun_requested" THEN "generation" + 1
              ELSE "generation"
            END,
            "updated_at" = ${parsed.now}
        WHERE "id" = ${parsed.jobId}
          AND "tenant_mode" = ${parsed.tenant.mode}
          AND "tenant_id" IS NOT DISTINCT FROM ${scopeId}
          AND "state" = 'running'
          AND "lease_token_hash" = ${digest(parsed.leaseToken)}
          AND "lease_expires_at" > ${parsed.now}
        RETURNING "state"
      `;
      if (rows[0] !== undefined) {
        return { outcome: "settled", state: "succeeded" };
      }
      return leaseMismatch(transaction, parsed.jobId, parsed.tenant);
    });
  };

  const fail = async (
    request: Parameters<DurableJobQueuePort["fail"]>[0],
  ): Promise<Awaited<ReturnType<DurableJobQueuePort["fail"]>>> => {
    const parsed = failJobRequestSchema.parse(request);
    const scopeId = tenantId(parsed.tenant);
    return input.sql.begin(async (transaction) => {
      const currentRows = await transaction<
        readonly Pick<DurableJobRow, "attempt" | "state" | "lease_expires_at">[]
      >`
        SELECT "attempt", "state", "lease_expires_at"
        FROM "durable_jobs"
        WHERE "id" = ${parsed.jobId}
          AND "tenant_mode" = ${parsed.tenant.mode}
          AND "tenant_id" IS NOT DISTINCT FROM ${scopeId}
        FOR UPDATE
      `;
      const current = currentRows[0];
      if (
        current === undefined ||
        current.state !== "running" ||
        current.lease_expires_at === null ||
        new Date(current.lease_expires_at) <= new Date(parsed.now)
      ) {
        return leaseMismatch(transaction, parsed.jobId, parsed.tenant);
      }
      const retryAt = new Date(
        Date.parse(parsed.now) + retryDelayMs(current.attempt),
      ).toISOString();
      const rows = await transaction<
        readonly {
          readonly state: "pending" | "dead";
          readonly available_at: Date | string;
        }[]
      >`
        UPDATE "durable_jobs"
        SET "queue_name" = CASE
              WHEN "rerun_requested" THEN "rerun_queue_name"
              ELSE "queue_name"
            END,
            "payload_json" = CASE
              WHEN "rerun_requested" THEN "rerun_payload_json"
              ELSE "payload_json"
            END,
            "payload_fingerprint" = CASE
              WHEN "rerun_requested" THEN "rerun_payload_fingerprint"
              ELSE "payload_fingerprint"
            END,
            "state" = CASE
              WHEN "rerun_requested" THEN CAST('pending' AS "durable_job_state")
              WHEN "attempt" >= "max_attempts" THEN CAST('dead' AS "durable_job_state")
              ELSE CAST('pending' AS "durable_job_state")
            END,
            "attempt" = CASE WHEN "rerun_requested" THEN 0 ELSE "attempt" END,
            "max_attempts" = CASE
              WHEN "rerun_requested" THEN "rerun_max_attempts"
              ELSE "max_attempts"
            END,
            "available_at" = CASE
              WHEN "rerun_requested" THEN "rerun_available_at"
              WHEN "attempt" >= "max_attempts" THEN "available_at"
              ELSE ${retryAt}
            END,
            "lease_token_hash" = NULL,
            "lease_owner" = NULL,
            "lease_expires_at" = NULL,
            "redeliver_current_attempt" = false,
            "rerun_requested" = false,
            "rerun_queue_name" = NULL,
            "rerun_payload_json" = NULL,
            "rerun_payload_fingerprint" = NULL,
            "rerun_max_attempts" = NULL,
            "rerun_available_at" = NULL,
            "result_json" = NULL,
            "last_error_code" = CASE
              WHEN "rerun_requested" THEN NULL
              ELSE ${parsed.error.code}
            END,
            "last_error_summary" = CASE
              WHEN "rerun_requested" THEN NULL
              ELSE ${parsed.error.safeSummary}
            END,
            "completed_at" = CASE
              WHEN "rerun_requested" THEN NULL
              WHEN "attempt" >= "max_attempts" THEN ${parsed.now}::timestamptz
              ELSE NULL
            END,
            "generation" = CASE
              WHEN "rerun_requested" THEN "generation" + 1
              ELSE "generation"
            END,
            "updated_at" = ${parsed.now}
        WHERE "id" = ${parsed.jobId}
          AND "tenant_mode" = ${parsed.tenant.mode}
          AND "tenant_id" IS NOT DISTINCT FROM ${scopeId}
          AND "state" = 'running'
          AND "lease_token_hash" = ${digest(parsed.leaseToken)}
          AND "lease_expires_at" > ${parsed.now}
        RETURNING "state", "available_at"
      `;
      const row = rows[0];
      if (row === undefined) {
        return leaseMismatch(transaction, parsed.jobId, parsed.tenant);
      }
      if (row.state === "dead") {
        return { outcome: "dead" };
      }
      return {
        outcome: "retry-scheduled",
        availableAt: isoTimestamp(row.available_at),
      };
    });
  };

  const reclaimExpired = async (
    request: Parameters<DurableJobQueuePort["reclaimExpired"]>[0],
  ): Promise<Awaited<ReturnType<DurableJobQueuePort["reclaimExpired"]>>> => {
    const parsed = reclaimExpiredJobsRequestSchema.parse(request);
    const scopeId = tenantId(parsed.tenant);
    return input.sql.begin(async (transaction) => {
      const candidates =
        parsed.queueName === undefined
          ? await transaction<readonly DurableJobRow[]>`
            SELECT *
            FROM "durable_jobs"
            WHERE "tenant_mode" = ${parsed.tenant.mode}
              AND "tenant_id" IS NOT DISTINCT FROM ${scopeId}
              AND "state" = 'running'
              AND "lease_expires_at" <= ${parsed.now}
            ORDER BY "lease_expires_at", "id"
            LIMIT ${parsed.limit}
            FOR UPDATE SKIP LOCKED
          `
          : await transaction<readonly DurableJobRow[]>`
            SELECT *
            FROM "durable_jobs"
            WHERE "queue_name" = ${parsed.queueName}
              AND "tenant_mode" = ${parsed.tenant.mode}
              AND "tenant_id" IS NOT DISTINCT FROM ${scopeId}
              AND "state" = 'running'
              AND "lease_expires_at" <= ${parsed.now}
            ORDER BY "lease_expires_at", "id"
            LIMIT ${parsed.limit}
            FOR UPDATE SKIP LOCKED
          `;
      if (candidates.length === 0) {
        return { outcome: "no-op" };
      }
      for (const candidate of candidates) {
        if (candidate.rerun_requested) {
          await transaction`
            UPDATE "durable_jobs"
            SET "queue_name" = "rerun_queue_name",
                "payload_json" = "rerun_payload_json",
                "payload_fingerprint" = "rerun_payload_fingerprint",
                "state" = 'pending',
                "attempt" = 0,
                "max_attempts" = "rerun_max_attempts",
                "available_at" = "rerun_available_at",
                "lease_token_hash" = NULL,
                "lease_owner" = NULL,
                "lease_expires_at" = NULL,
                "redeliver_current_attempt" = false,
                "rerun_requested" = false,
                "rerun_queue_name" = NULL,
                "rerun_payload_json" = NULL,
                "rerun_payload_fingerprint" = NULL,
                "rerun_max_attempts" = NULL,
                "rerun_available_at" = NULL,
                "result_json" = NULL,
                "last_error_code" = NULL,
                "last_error_summary" = NULL,
                "completed_at" = NULL,
                "generation" = "generation" + 1,
                "updated_at" = ${parsed.now}
            WHERE "id" = ${candidate.id}
          `;
        } else {
          await transaction`
            UPDATE "durable_jobs"
            SET "state" = 'pending',
                "lease_token_hash" = NULL,
                "lease_owner" = NULL,
                "lease_expires_at" = NULL,
                "redeliver_current_attempt" = true,
                "updated_at" = ${parsed.now}
            WHERE "id" = ${candidate.id}
          `;
        }
      }
      return { outcome: "reclaimed", count: candidates.length };
    });
  };

  const listDead = async (
    request: Readonly<ListDeadJobsRequest>,
  ): Promise<Awaited<ReturnType<DurableJobQueuePort["listDead"]>>> => {
    const parsed = listDeadJobsRequestSchema.parse(request);
    const scopeId = tenantId(parsed.tenant);
    const cursor =
      parsed.cursor === undefined
        ? undefined
        : decodeDeadLetterCursor(parsed.cursor);
    const rows =
      cursor === undefined
        ? await input.sql<readonly DeadJobRow[]>`
            SELECT "id", "job_name", "queue_name", "tenant_mode", "tenant_id",
                   "attempt", "max_attempts", "last_error_code", "last_error_summary",
                   "created_at", "updated_at", "completed_at"
            FROM "durable_jobs"
            WHERE "queue_name" = ${parsed.queueName}
              AND "tenant_mode" = ${parsed.tenant.mode}
              AND "tenant_id" IS NOT DISTINCT FROM ${scopeId}
              AND "state" = 'dead'
            ORDER BY "updated_at", "id"
            LIMIT ${parsed.limit + 1}
          `
        : await input.sql<readonly DeadJobRow[]>`
            SELECT "id", "job_name", "queue_name", "tenant_mode", "tenant_id",
                   "attempt", "max_attempts", "last_error_code", "last_error_summary",
                   "created_at", "updated_at", "completed_at"
            FROM "durable_jobs"
            WHERE "queue_name" = ${parsed.queueName}
              AND "tenant_mode" = ${parsed.tenant.mode}
              AND "tenant_id" IS NOT DISTINCT FROM ${scopeId}
              AND "state" = 'dead'
              AND ("updated_at", "id") > (${cursor.updatedAt}, ${cursor.id})
            ORDER BY "updated_at", "id"
            LIMIT ${parsed.limit + 1}
          `;
    const page = rows.slice(0, parsed.limit);
    return {
      jobs: page.map(deadSummary),
      ...(rows.length > parsed.limit && page.length > 0
        ? { nextCursor: encodeDeadLetterCursor(page[page.length - 1]) }
        : {}),
    };
  };

  const replay = async (
    request: Parameters<DurableJobQueuePort["replay"]>[0],
  ): Promise<Awaited<ReturnType<DurableJobQueuePort["replay"]>>> => {
    const parsed = replayJobRequestSchema.parse(request);
    const scopeId = tenantId(parsed.tenant);
    return input.sql.begin(async (transaction) => {
      const rows = await transaction<readonly DurableJobRow[]>`
        SELECT *
        FROM "durable_jobs"
        WHERE "id" = ${parsed.jobId}
          AND "tenant_mode" = ${parsed.tenant.mode}
          AND "tenant_id" IS NOT DISTINCT FROM ${scopeId}
        FOR UPDATE
      `;
      const row = rows[0];
      if (row === undefined) {
        return { outcome: "missing" };
      }
      if (row.state === "pending") {
        return { outcome: "already-pending" };
      }
      if (
        row.state === "running" &&
        row.lease_expires_at !== null &&
        new Date(row.lease_expires_at) > new Date(parsed.now)
      ) {
        return { outcome: "active-lease-rejected" };
      }
      const priorState =
        row.state === "running" ? "expired-running" : row.state;
      await transaction`
        UPDATE "durable_jobs"
        SET "state" = 'pending',
            "attempt" = 0,
            "available_at" = ${parsed.now},
            "lease_token_hash" = NULL,
            "lease_owner" = NULL,
            "lease_expires_at" = NULL,
            "redeliver_current_attempt" = false,
            "rerun_requested" = false,
            "rerun_queue_name" = NULL,
            "rerun_payload_json" = NULL,
            "rerun_payload_fingerprint" = NULL,
            "rerun_max_attempts" = NULL,
            "rerun_available_at" = NULL,
            "result_json" = NULL,
            "last_error_code" = NULL,
            "last_error_summary" = NULL,
            "completed_at" = NULL,
            "generation" = "generation" + 1,
            "updated_at" = ${parsed.now}
        WHERE "id" = ${row.id}
      `;
      await transaction`
        INSERT INTO "durable_job_audit_events" (
          "requested_job_id", "tenant_mode", "tenant_id", "action", "outcome",
          "prior_state", "actor", "authorization_decision_id",
          "authorization_decided_at", "reason", "correlation_id"
        ) VALUES (
          ${row.id}, ${parsed.tenant.mode}, ${scopeId}, 'replay', 'replayed',
          ${row.state}, ${parsed.authorization.subjectId},
          ${parsed.authorization.decisionId}, ${parsed.authorization.authorizedAt},
          ${parsed.reason}, ${parsed.correlationId}
        )
      `;
      return { outcome: "replayed", priorState };
    });
  };

  const adapter: DurableJobQueuePort = {
    enqueue,
    claim,
    heartbeat,
    settle,
    fail,
    reclaimExpired,
    listDead,
    replay,
  };
  return Object.freeze(adapter);
}
