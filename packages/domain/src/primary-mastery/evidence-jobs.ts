/**
 * The durable job of the evidence pipeline (track primary_mastery_evidence_20261006, FR-5): the
 * request paths enqueue one job per source row; the worker runs it. The shapes match the
 * `@reading-advantage/backend` job contracts structurally, so the domain stays free of that
 * dependency and a test needs no queue.
 */
import type { DB } from "@reading-advantage/db";
import type { z } from "zod";
import type { MasteryPersistencePort } from "../mastery/persistence-ports.js";
import {
  PRIMARY_EVIDENCE_JOB_NAME,
  PRIMARY_EVIDENCE_QUEUE_NAME,
  primaryEvidenceJobKey,
  primaryEvidenceJobPayloadSchema,
  primaryEvidenceJobResultSchema,
  type PrimaryEvidenceJobPayload,
  type PrimaryEvidenceJobResult,
} from "./evidence-contracts.js";
import { loadPrimaryEvidenceEvent, type LoadedEvidenceEvent } from "./evidence-sources.js";
import { recordPrimaryEvidence, type EvidenceResolver } from "./record-evidence.js";

/** How often the queue retries a failed job before it dead-letters. */
export const PRIMARY_EVIDENCE_MAX_ATTEMPTS = 5;

/** The enqueue request, in the shape of the backend `enqueueJobRequestSchema`. */
export interface PrimaryEvidenceEnqueueRequest {
  jobName: string;
  queueName: string;
  tenant: { mode: "tenant"; tenantId: string };
  idempotencyKey: string;
  payload: PrimaryEvidenceJobPayload;
  maxAttempts: number;
  availableAt: string;
}

/** The slice of the backend enqueue port the request paths use. */
export interface PrimaryEvidenceEnqueuePort<TResult = unknown> {
  enqueue(request: PrimaryEvidenceEnqueueRequest): Promise<TResult>;
}

/**
 * Builds the enqueue request of one source row: one row, one job, one idempotency key.
 * @param params The payload, the school, and the time the job may run.
 * @returns The request for the backend enqueue port.
 */
export function primaryEvidenceEnqueueRequest(params: { payload: PrimaryEvidenceJobPayload; schoolId: string; now?: string }): PrimaryEvidenceEnqueueRequest {
  const payload = primaryEvidenceJobPayloadSchema.parse(params.payload);
  return {
    jobName: PRIMARY_EVIDENCE_JOB_NAME,
    queueName: PRIMARY_EVIDENCE_QUEUE_NAME,
    tenant: { mode: "tenant", tenantId: params.schoolId },
    idempotencyKey: primaryEvidenceJobKey(payload),
    payload,
    maxAttempts: PRIMARY_EVIDENCE_MAX_ATTEMPTS,
    availableAt: params.now ?? new Date().toISOString(),
  };
}

/**
 * Enqueues the evidence job of one source row through the given port.
 * @param params The port, the payload, the school, and an optional clock.
 * @returns What the port returned.
 */
export async function enqueuePrimaryEvidence<TResult>(params: { port: PrimaryEvidenceEnqueuePort<TResult>; payload: PrimaryEvidenceJobPayload; schoolId: string; now?: string }): Promise<TResult> {
  return params.port.enqueue(primaryEvidenceEnqueueRequest(params));
}

/**
 * The dependencies of one job run; tests inject the loader, the persistence, and the resolver.
 * The database only passes through here: `loadPrimaryEvidenceEvent` reads the source row by id
 * through `unscoped(reason)` and returns its school, this runner refuses a school that differs
 * from the job's tenant, and `recordPrimaryEvidence` scopes every write by that tenant through
 * the mastery persistence (`createTenantDB` inside the Drizzle adapter).
 */
export interface RunPrimaryEvidenceJobOptions {
  db: DB;
  payload: PrimaryEvidenceJobPayload;
  /** The job's trusted tenant; a row of another school is refused. */
  tenant: { schoolId: string };
  persistence?: MasteryPersistencePort;
  resolver?: EvidenceResolver;
  load?: (params: { db: DB; payload: PrimaryEvidenceJobPayload }) => Promise<LoadedEvidenceEvent | null>;
  now?: string;
}

/**
 * Runs one evidence job: loads the row, checks its school, records the evidence.
 * @param options The database, the payload, the tenant, and optional test seams.
 * @returns The counts the worker settles with.
 */
export async function runPrimaryEvidenceJob(options: RunPrimaryEvidenceJobOptions): Promise<PrimaryEvidenceJobResult> {
  const payload = primaryEvidenceJobPayloadSchema.parse(options.payload);
  const loaded = await (options.load ?? loadPrimaryEvidenceEvent)({ db: options.db, payload });
  if (!loaded) return { status: "row-missing", committed: 0, skipped: 0 };
  if (loaded.schoolId !== options.tenant.schoolId) return { status: "tenant-mismatch", committed: 0, skipped: 0 };
  const result = await recordPrimaryEvidence({ db: options.db, tenant: options.tenant, event: loaded.event, persistence: options.persistence, resolver: options.resolver, now: options.now });
  return { status: "recorded", committed: result.committed.length, skipped: result.skipped.length + (loaded.legacyUnmatched ?? 0) };
}

/** The execution context the backend worker passes to a handler (structural copy). */
export interface PrimaryEvidenceJobContext {
  jobId: string;
  attempt: number;
  maxAttempts: number;
  tenant: { mode: "global" } | { mode: "tenant"; tenantId: string };
  signal: AbortSignal;
}

/** A durable job handler in the shape of the backend `DurableJobHandler`. */
export interface PrimaryEvidenceJobHandler {
  jobName: string;
  tenantMode: "tenant";
  payload: z.ZodType<PrimaryEvidenceJobPayload>;
  result: z.ZodType<PrimaryEvidenceJobResult>;
  handle(context: PrimaryEvidenceJobContext, payload: PrimaryEvidenceJobPayload): Promise<PrimaryEvidenceJobResult>;
}

/**
 * Defines the handler the worker registers for `primary.mastery.evidence`.
 * @param deps The database and optional seams: a persistence per school and actor, a resolver, a loader, a clock.
 * @returns The handler definition; pass it to the backend `defineDurableJobHandler` at the composition root.
 */
export function definePrimaryEvidenceJobHandler(deps: {
  db: DB;
  persistenceFor?: (schoolId: string) => MasteryPersistencePort;
  resolver?: EvidenceResolver;
  load?: RunPrimaryEvidenceJobOptions["load"];
  now?: () => string;
}): PrimaryEvidenceJobHandler {
  return {
    jobName: PRIMARY_EVIDENCE_JOB_NAME,
    tenantMode: "tenant",
    payload: primaryEvidenceJobPayloadSchema,
    result: primaryEvidenceJobResultSchema,
    async handle(context, payload) {
      if (context.tenant.mode !== "tenant") throw new Error(`${PRIMARY_EVIDENCE_JOB_NAME} runs in a tenant scope only`);
      const schoolId = context.tenant.tenantId;
      return runPrimaryEvidenceJob({ db: deps.db, payload, tenant: { schoolId }, persistence: deps.persistenceFor?.(schoolId), resolver: deps.resolver, load: deps.load, now: deps.now?.() });
    },
  };
}
