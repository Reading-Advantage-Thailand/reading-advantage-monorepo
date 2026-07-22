import { z } from "zod";

/** Runtime contract for a durable job identifier. */
export const jobIdSchema = z.string().uuid();

/** Runtime contract for a stable namespaced durable job name. */
export const jobNameSchema = z
  .string()
  .min(3)
  .max(160)
  .regex(
    /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/,
    "Job names must be lowercase, stable, and namespaced.",
  );

/** Runtime contract for a portable queue name. */
export const jobQueueNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/);

/** Runtime contract for an opaque lease token. */
export const jobLeaseTokenSchema = z.string().min(16).max(500);

/** Runtime contract for an offset-aware durable timestamp. */
export const jobTimestampSchema = z.string().datetime({ offset: true });

/** Runtime contract for global or trusted tenant-scoped job ownership. */
export const jobTenantSchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("global") }),
  z.strictObject({
    mode: z.literal("tenant"),
    tenantId: z.string().min(1).max(200),
  }),
]);

/** Trusted tenant scope attached to a durable job. */
export type JobTenant = z.infer<typeof jobTenantSchema>;

/** Runtime contract for persisted generic and legacy-compatible job states. */
export const jobStateSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "dead",
  "legacy-failed",
]);

/** Persisted generic or legacy-compatible durable job state. */
export type JobState = z.infer<typeof jobStateSchema>;

/** Runtime contract for a secret-safe persisted failure summary. */
export const safeJobErrorSchema = z.strictObject({
  code: z.string().regex(/^[A-Z][A-Z0-9_]+$/),
  safeSummary: z.string().min(1).max(1_000),
});

/** Secret-safe failure metadata permitted in persistence and operations views. */
export type SafeJobError = z.infer<typeof safeJobErrorSchema>;

/** Runtime contract for active lease ownership. */
export const jobLeaseSchema = z.strictObject({
  token: jobLeaseTokenSchema,
  workerId: z.string().min(1).max(200),
  expiresAt: jobTimestampSchema,
});

/** Opaque, expiring ownership proof for one running attempt. */
export type JobLease = z.infer<typeof jobLeaseSchema>;

const requiredUnknownSchema = z.unknown().refine(
  (value) => value !== undefined,
  "A durable value is required.",
);

const envelopeFields = {
  id: jobIdSchema,
  jobName: jobNameSchema,
  queueName: jobQueueNameSchema,
  tenant: jobTenantSchema,
  idempotencyKey: z.string().min(1).max(500),
  attempt: z.number().int().min(0).max(1_000),
  maxAttempts: z.number().int().min(1).max(1_000),
  availableAt: jobTimestampSchema,
  createdAt: jobTimestampSchema,
  updatedAt: jobTimestampSchema,
};

/**
 * Creates a state-safe durable envelope contract for one handler.
 * @param payloadSchema Runtime payload contract owned by the handler.
 * @param resultSchema Runtime successful-result contract owned by the handler.
 * @returns A discriminated envelope schema that enforces state-specific fields.
 */
export function createJobEnvelopeSchema<
  TPayloadSchema extends z.ZodType,
  TResultSchema extends z.ZodType,
>(payloadSchema: TPayloadSchema, resultSchema: TResultSchema) {
  const common = {
    ...envelopeFields,
    payload: payloadSchema,
  };

  return z.discriminatedUnion("state", [
    z.strictObject({
      ...common,
      state: z.literal("pending"),
      lastError: safeJobErrorSchema.optional(),
    }),
    z.strictObject({
      ...common,
      state: z.literal("running"),
      attempt: z.number().int().min(1).max(1_000),
      lease: jobLeaseSchema,
      lastError: safeJobErrorSchema.optional(),
    }),
    z.strictObject({
      ...common,
      state: z.literal("succeeded"),
      result: resultSchema,
      completedAt: jobTimestampSchema,
    }),
    z.strictObject({
      ...common,
      state: z.literal("dead"),
      lastError: safeJobErrorSchema,
      completedAt: jobTimestampSchema,
    }),
    z.strictObject({
      ...common,
      state: z.literal("legacy-failed"),
      lastError: safeJobErrorSchema,
      completedAt: jobTimestampSchema,
    }),
  ]).superRefine((envelope, context) => {
    if (envelope.attempt > envelope.maxAttempts) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attempt"],
        message: "A job attempt cannot exceed its declared maximum.",
      });
    }
  });
}

/** Runtime contract for an envelope before handler-specific decoding. */
export const jobEnvelopeSchema = createJobEnvelopeSchema(
  requiredUnknownSchema,
  requiredUnknownSchema,
);

/** Durable envelope decoded before dispatch to a registered handler. */
export type JobEnvelope = z.infer<typeof jobEnvelopeSchema>;

/** Runtime contract for an atomic idempotent enqueue request. */
export const enqueueJobRequestSchema = z.strictObject({
  jobName: jobNameSchema,
  queueName: jobQueueNameSchema,
  tenant: jobTenantSchema,
  idempotencyKey: z.string().min(1).max(500),
  payload: requiredUnknownSchema,
  maxAttempts: z.number().int().min(1).max(1_000),
  availableAt: jobTimestampSchema,
});

/** Validated request to durably enqueue or refresh one identity. */
export type EnqueueJobRequest<TPayload = unknown> = Omit<
  z.infer<typeof enqueueJobRequestSchema>,
  "payload"
> & {
  readonly payload: TPayload;
};

/** Runtime contract for enqueue identity and active-lease-safe outcomes. */
export const enqueueJobResultSchema = z.discriminatedUnion("outcome", [
  z.strictObject({ outcome: z.literal("enqueued"), jobId: jobIdSchema }),
  z.strictObject({
    outcome: z.literal("refreshed"),
    jobId: jobIdSchema,
    priorState: z.enum([
      "pending",
      "succeeded",
      "dead",
      "legacy-failed",
    ]),
  }),
  z.strictObject({
    outcome: z.literal("active-lease-retained"),
    jobId: jobIdSchema,
    followUpScheduled: z.boolean(),
  }),
]);

/** Atomic enqueue result that never silently revokes a valid active lease. */
export type EnqueueJobResult = z.infer<typeof enqueueJobResultSchema>;

/** Runtime contract for bounded, due-only queue claiming. */
export const claimJobsRequestSchema = z.strictObject({
  queueName: jobQueueNameSchema,
  tenant: jobTenantSchema,
  workerId: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(100),
  leaseSeconds: z.number().int().min(1).max(3_600),
  now: jobTimestampSchema,
});

/** Request for a bounded batch of due jobs with fresh lease ownership. */
export type ClaimJobsRequest = z.infer<typeof claimJobsRequestSchema>;

const runningJobEnvelopeSchema = z.strictObject({
  ...envelopeFields,
  attempt: z.number().int().min(1).max(1_000),
  payload: requiredUnknownSchema,
  state: z.literal("running"),
  lease: jobLeaseSchema,
  lastError: safeJobErrorSchema.optional(),
}).superRefine((envelope, context) => {
  if (envelope.attempt > envelope.maxAttempts) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["attempt"],
      message: "A claimed attempt cannot exceed its declared maximum.",
    });
  }
});

/** Runtime contract for explicit empty or non-empty claim outcomes. */
export const claimJobsResultSchema = z.discriminatedUnion("outcome", [
  z.strictObject({ outcome: z.literal("empty") }),
  z.strictObject({
    outcome: z.literal("claimed"),
    jobs: z.array(runningJobEnvelopeSchema).min(1).max(100),
  }),
]);

/** Empty poll or non-empty batch of running jobs with fresh lease tokens. */
export type ClaimJobsResult = z.infer<typeof claimJobsResultSchema>;

const leaseMutationFields = {
  jobId: jobIdSchema,
  tenant: jobTenantSchema,
  leaseToken: jobLeaseTokenSchema,
  now: jobTimestampSchema,
};

/** Runtime contract for extending a matching live lease. */
export const heartbeatJobRequestSchema = z.strictObject({
  ...leaseMutationFields,
  extendBySeconds: z.number().int().min(1).max(3_600),
});

/** Request to extend only the caller's matching live lease. */
export type HeartbeatJobRequest = z.infer<typeof heartbeatJobRequestSchema>;

const leaseMismatchOutcomes = [
  z.strictObject({ outcome: z.literal("stale-lease") }),
  z.strictObject({ outcome: z.literal("not-running") }),
  z.strictObject({ outcome: z.literal("missing") }),
] as const;

/** Runtime contract for heartbeat ownership outcomes. */
export const heartbeatJobResultSchema = z.discriminatedUnion("outcome", [
  z.strictObject({
    outcome: z.literal("extended"),
    expiresAt: jobTimestampSchema,
  }),
  ...leaseMismatchOutcomes,
]);

/** Lease extension or explicit zero-row ownership outcome. */
export type HeartbeatJobResult = z.infer<typeof heartbeatJobResultSchema>;

/** Runtime contract for successful lease-token settlement. */
export const settleJobRequestSchema = z.strictObject({
  ...leaseMutationFields,
  result: requiredUnknownSchema,
});

/** Request to settle one matching live lease with a validated result. */
export type SettleJobRequest<TResult = unknown> = Omit<
  z.infer<typeof settleJobRequestSchema>,
  "result"
> & {
  readonly result: TResult;
};

/** Runtime contract for successful settlement ownership outcomes. */
export const settleJobResultSchema = z.discriminatedUnion("outcome", [
  z.strictObject({
    outcome: z.literal("settled"),
    state: z.literal("succeeded"),
  }),
  ...leaseMismatchOutcomes,
]);

/** Successful settlement or explicit zero-row ownership outcome. */
export type SettleJobResult = z.infer<typeof settleJobResultSchema>;

/** Runtime contract for failure handling behind the retry policy. */
export const failJobRequestSchema = z.strictObject({
  ...leaseMutationFields,
  error: safeJobErrorSchema,
});

/** Request to apply retry or dead-letter policy to one matching live lease. */
export type FailJobRequest = z.infer<typeof failJobRequestSchema>;

/** Runtime contract for retry, dead-letter, and ownership outcomes. */
export const failJobResultSchema = z.discriminatedUnion("outcome", [
  z.strictObject({
    outcome: z.literal("retry-scheduled"),
    availableAt: jobTimestampSchema,
  }),
  z.strictObject({ outcome: z.literal("dead") }),
  ...leaseMismatchOutcomes,
]);

/** Retry, terminal failure, or explicit zero-row ownership outcome. */
export type FailJobResult = z.infer<typeof failJobResultSchema>;

/** Runtime contract for bounded expired-lease reclamation. */
export const reclaimExpiredJobsRequestSchema = z.strictObject({
  queueName: jobQueueNameSchema.optional(),
  tenant: jobTenantSchema,
  limit: z.number().int().min(1).max(1_000),
  now: jobTimestampSchema,
});

/** Request to return a bounded set of expired leases to pending. */
export type ReclaimExpiredJobsRequest = z.infer<
  typeof reclaimExpiredJobsRequestSchema
>;

/** Runtime contract for explicit reclamation outcomes. */
export const reclaimExpiredJobsResultSchema = z.discriminatedUnion("outcome", [
  z.strictObject({ outcome: z.literal("no-op") }),
  z.strictObject({
    outcome: z.literal("reclaimed"),
    count: z.number().int().positive().max(1_000),
  }),
]);

/** No-op or positive count of expired leases returned to pending. */
export type ReclaimExpiredJobsResult = z.infer<
  typeof reclaimExpiredJobsResultSchema
>;

/** Runtime contract for trusted replay authorization evidence. */
export const replayAuthorizationEvidenceSchema = z.strictObject({
  subjectId: z.string().min(1).max(200),
  permission: z.literal("admin:dashboard"),
  decisionId: z.string().min(1).max(200),
  authorizedAt: jobTimestampSchema,
});

/** Trusted evidence emitted by a backend policy before replay. */
export type ReplayAuthorizationEvidence = z.infer<
  typeof replayAuthorizationEvidenceSchema
>;

/** Runtime contract for an authorized, auditable replay request. */
export const replayJobRequestSchema = z.strictObject({
  jobId: jobIdSchema,
  tenant: jobTenantSchema,
  authorization: replayAuthorizationEvidenceSchema,
  reason: z.string().min(1).max(500),
  correlationId: z.string().min(1).max(200),
  now: jobTimestampSchema,
});

/** Authorized replay request carrying safe immutable-audit metadata. */
export type ReplayJobRequest = z.infer<typeof replayJobRequestSchema>;

/** Runtime contract for pending, terminal, expired, and active replay outcomes. */
export const replayJobResultSchema = z.discriminatedUnion("outcome", [
  z.strictObject({
    outcome: z.literal("replayed"),
    priorState: z.enum([
      "succeeded",
      "dead",
      "legacy-failed",
      "expired-running",
    ]),
  }),
  z.strictObject({ outcome: z.literal("already-pending") }),
  z.strictObject({ outcome: z.literal("active-lease-rejected") }),
  z.strictObject({ outcome: z.literal("missing") }),
]);

/** Replay result that rejects valid active leases without ambiguity. */
export type ReplayJobResult = z.infer<typeof replayJobResultSchema>;

/** Context exposed to business handlers without persistence capabilities. */
export interface DurableJobExecutionContext {
  /** Durable identity of the running job. */
  readonly jobId: string;
  /** One-based execution attempt currently running. */
  readonly attempt: number;
  /** Maximum attempts declared when the job was enqueued. */
  readonly maxAttempts: number;
  /** Trusted global or tenant execution scope. */
  readonly tenant: Readonly<JobTenant>;
  /** Cancellation signal owned by worker composition. */
  readonly signal: AbortSignal;
}

/** Typed, provider-neutral business handler contract. */
export interface DurableJobHandler<TPayload, TResult> {
  /** Stable name used for registry dispatch. */
  readonly jobName: string;
  /** Declared global or tenant-scoped execution mode. */
  readonly tenantMode: JobTenant["mode"];
  /** Runtime source of truth for persisted payload decoding. */
  readonly payload: z.ZodType<TPayload>;
  /** Runtime source of truth for successful result validation. */
  readonly result: z.ZodType<TResult>;
  /**
   * Executes transport-independent business behavior.
   * @param context Attempt metadata and cancellation without persistence access.
   * @param payload Payload already decoded by the declared runtime schema.
   * @returns Candidate result that composition validates before settlement.
   */
  handle(
    context: Readonly<DurableJobExecutionContext>,
    payload: TPayload,
  ): Promise<TResult>;
}

/**
 * Defines and freezes a typed durable job handler.
 * @param definition Stable name, tenant mode, runtime schemas, and handler.
 * @returns Frozen provider-neutral handler definition.
 */
export function defineDurableJobHandler<TPayload, TResult>(
  definition: DurableJobHandler<TPayload, TResult>,
): Readonly<DurableJobHandler<TPayload, TResult>> {
  jobNameSchema.parse(definition.jobName);
  z.enum(["global", "tenant"]).parse(definition.tenantMode);
  if (!(definition.payload instanceof z.ZodType)) {
    throw new TypeError("A genuine Zod payload schema is required.");
  }
  if (!(definition.result instanceof z.ZodType)) {
    throw new TypeError("A genuine Zod result schema is required.");
  }
  if (typeof definition.handle !== "function") {
    throw new TypeError("A durable job handler function is required.");
  }
  return Object.freeze({ ...definition });
}
