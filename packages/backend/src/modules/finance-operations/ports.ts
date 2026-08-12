import { z } from "zod";

import type {
  FinanceAuthorizationEvidence,
  FinanceOperationAuthorizationInput,
  FinanceOperationScope,
} from "./contracts.js";
import {
  nonBlankStringSchema,
  privateEvidenceReferenceSchema,
} from "./contracts.js";
import type { HistoricalPrivateEvidenceBindingPort } from "./contracts.js";

/** Provider-neutral decision returned by Company Identity for a finance operation. */
export interface FinanceAuthorizationDecision {
  /** Whether the requested operation is allowed. */
  readonly decision: "allow" | "deny";
}

/** Internal Company Identity boundary used to authorize Finance Operations actions. */
export interface CompanyIdentityAuthorizationPort {
  /**
   * Evaluates a validated operation against Company Identity claims and scope.
   * @param input Validated operation authorization request.
   * @returns Company Identity's authorization decision.
   */
  authorizeFinanceOperation(
    input: FinanceOperationAuthorizationInput,
  ): Promise<FinanceAuthorizationDecision>;
}

/** Internal request for a versioned CRM billing-catalog snapshot. */
export interface CustomerBillingCatalogInput {
  /** CRM customer identity to read. */
  readonly customerId: string;
  /** Version of the CRM contract requested by the caller. */
  readonly sourceVersion: string;
  /** Explicit company and optional school scope for the read. */
  readonly scope: FinanceOperationScope;
  /** Company Identity evidence authorizing the read. */
  readonly authorizationEvidence: FinanceAuthorizationEvidence;
}

/** Versioned billing-catalog snapshot returned by the CRM boundary. */
export interface CustomerBillingCatalogSnapshot {
  /** CRM customer identity represented by the snapshot. */
  readonly customerId: string;
  /** Source contract version used to produce the snapshot. */
  readonly sourceVersion: string;
  /** Digest binding the snapshot payload. */
  readonly payloadDigest: string;
}

/** Internal CRM boundary used to read an authorized customer billing catalog. */
export interface CustomerBillingCatalogPort {
  /**
   * Reads one immutable, versioned customer billing-catalog snapshot.
   * @param input Versioned customer and authorization request.
   * @returns Immutable CRM billing-catalog snapshot.
   */
  readCustomerBillingCatalog(
    input: CustomerBillingCatalogInput,
  ): Promise<CustomerBillingCatalogSnapshot>;
}

/** Internal request for one versioned Tutor financial export. */
export interface TutorFinancialExportInput {
  /** Tutor export record identity to read. */
  readonly sourceRecordId: string;
  /** Version of the Tutor export contract requested by the caller. */
  readonly sourceVersion: string;
  /** Explicit company and optional school scope for the read. */
  readonly scope: FinanceOperationScope;
  /** Company Identity evidence authorizing the read. */
  readonly authorizationEvidence: FinanceAuthorizationEvidence;
}

/** Immutable financial export snapshot returned by the Tutor boundary. */
export interface TutorFinancialExportSnapshot {
  /** Tutor export record identity represented by the snapshot. */
  readonly sourceRecordId: string;
  /** Source contract version used to produce the snapshot. */
  readonly sourceVersion: string;
  /** Digest binding the export payload. */
  readonly payloadDigest: string;
  /** Private evidence reference for the export payload. */
  readonly evidenceReference: string;
}

/** Internal Tutor boundary used to read an authorized financial export. */
export interface TutorFinancialExportPort {
  /**
   * Reads one immutable, versioned Tutor financial export snapshot.
   * @param input Versioned Tutor export and authorization request.
   * @returns Immutable Tutor financial export snapshot.
   */
  readFinancialExport(
    input: TutorFinancialExportInput,
  ): Promise<TutorFinancialExportSnapshot>;
}

/** Internal request for an authorized private evidence read. */
export interface PrivateEvidenceStorageInput {
  /** Immutable reference to the evidence object. */
  readonly evidenceReference: string;
  /** Explicit company and optional school scope for the read. */
  readonly scope: FinanceOperationScope;
  /** Company Identity evidence authorizing the read. */
  readonly authorizationEvidence: FinanceAuthorizationEvidence;
}

/** Immutable evidence metadata returned by private storage. */
export interface PrivateEvidenceSnapshot {
  /** Immutable reference of the evidence object read. */
  readonly evidenceReference: string;
  /** Digest binding the evidence payload. */
  readonly payloadDigest: string;
}

/** Internal private-storage boundary used for authorized evidence reads. */
export interface PrivateEvidenceStoragePort {
  /**
   * Reads evidence metadata without exposing a storage-provider SDK.
   * @param input Evidence reference and authorization request.
   * @returns Immutable evidence metadata.
   */
  readAuthorizedEvidence(
    input: PrivateEvidenceStorageInput,
  ): Promise<PrivateEvidenceSnapshot>;
}

/** Internal request for one durable, idempotent finance job. */
export interface DurableJobInput {
  /** Logical operation the worker must execute. */
  readonly operation: string;
  /** Stable replay key for the requested job. */
  readonly idempotencyKey: string;
  /** Digest binding the job payload. */
  readonly payloadDigest: string;
  /** Explicit company and optional school scope for the job. */
  readonly scope: FinanceOperationScope;
  /** Company Identity evidence authorizing the job. */
  readonly authorizationEvidence: FinanceAuthorizationEvidence;
}

/** Durable-job identity returned after enqueueing a finance operation. */
export interface DurableJobReceipt {
  /** Durable job identity assigned by the job adapter. */
  readonly jobId: string;
  /** Idempotency key accepted by the job adapter. */
  readonly idempotencyKey: string;
}

/** Provider-neutral durable-job acceptance, replay, or conflict result. */
export type DurableJobResult =
  | {
      readonly status: "accepted" | "replay";
      readonly receipt: DurableJobReceipt;
    }
  | {
      readonly status: "conflict";
      readonly receipt: DurableJobReceipt;
      readonly reason:
        | "operation-mismatch"
        | "payload-digest-mismatch"
        | "scope-mismatch";
    };

/** Internal durable-job boundary for asynchronous Finance Operations work. */
export interface DurableJobPort {
  /**
   * Enqueues one authenticated, versioned, idempotent finance operation.
   * @param input Authenticated operation and idempotency request.
   * @returns Durable job acceptance, replay, or conflict result.
   */
  enqueue(input: DurableJobInput): Promise<DurableJobResult>;
}
const historicalJobNameSchema = z
  .string()
  .min(3)
  .max(160)
  .regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u);
const historicalJobQueueNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u);
const historicalRequiredUnknownSchema = z
  .unknown()
  .refine((value) => value !== undefined, "A durable value is required.");
const historicalEnqueueJobRequestSchema = z.strictObject({
  jobName: historicalJobNameSchema,
  queueName: historicalJobQueueNameSchema,
  tenant: z.strictObject({
    mode: z.literal("tenant"),
    tenantId: z.string().min(1).max(200),
  }),
  idempotencyKey: z.string().min(1).max(500),
  payload: historicalRequiredUnknownSchema,
  maxAttempts: z.number().int().min(1).max(1_000),
  availableAt: z.string().datetime({ offset: true }),
});
const historicalEnqueueJobResultSchema = z.discriminatedUnion("outcome", [
  z.strictObject({ outcome: z.literal("enqueued"), jobId: z.string().uuid() }),
  z.strictObject({
    outcome: z.literal("refreshed"),
    jobId: z.string().uuid(),
    priorState: z.enum(["pending", "succeeded", "dead", "legacy-failed"]),
  }),
  z.strictObject({
    outcome: z.literal("active-lease-retained"),
    jobId: z.string().uuid(),
    followUpScheduled: z.boolean(),
  }),
]);

/** Provider-neutral generic enqueue request accepted by the Finance projector. */
export interface HistoricalPrivateEvidenceDurableJobRequest {
  /** Stable provider-neutral job name. */
  readonly jobName: string;
  /** Stable provider-neutral queue name. */
  readonly queueName: string;
  /** Tenant ownership attached to the durable identity. */
  readonly tenant: { readonly mode: "tenant"; readonly tenantId: string };
  /** Collision-free durable idempotency identity. */
  readonly idempotencyKey: string;
  /** Minimal immutable projector payload. */
  readonly payload: unknown;
  /** Maximum retry attempts. */
  readonly maxAttempts: number;
  /** Earliest execution instant. */
  readonly availableAt: string;
}

/** Provider-neutral generic enqueue outcome consumed by the Finance projector. */
export type HistoricalPrivateEvidenceDurableJobResult =
  | { readonly outcome: "enqueued"; readonly jobId: string }
  | {
      readonly outcome: "refreshed";
      readonly jobId: string;
      readonly priorState: "pending" | "succeeded" | "dead" | "legacy-failed";
    }
  | {
      readonly outcome: "active-lease-retained";
      readonly jobId: string;
      readonly followUpScheduled: boolean;
    };

/** Generic durable enqueue port accepted by the Finance projector. */
export interface HistoricalPrivateEvidenceDurableJobEnqueuePort {
  /** Enqueues one validated provider-neutral durable job. */
  enqueue(
    request: Readonly<HistoricalPrivateEvidenceDurableJobRequest>,
  ): Promise<Readonly<HistoricalPrivateEvidenceDurableJobResult>>;
}

const historicalOutboxDigestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
function hasNoControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1f || codePoint === 0x7f) {
      return false;
    }
  }
  return true;
}

const boundedIdentitySchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/\S/u)
  .refine(hasNoControlCharacters, "Control characters are not allowed");
const scopeSchema = z.strictObject({
  companyId: nonBlankStringSchema,
  schoolId: nonBlankStringSchema.optional(),
});
const sourceSchema = z.strictObject({
  sourceSystem: boundedIdentitySchema,
  sourceVersion: boundedIdentitySchema,
  sourceIdentity: boundedIdentitySchema,
});
const payloadSchema = z.strictObject({
  packetVersion: z.literal("historical-private-evidence-packet.v1"),
  evidenceReference: privateEvidenceReferenceSchema,
});

function evidenceCompanyId(reference: string): string {
  return reference
    .slice("private-evidence://".length)
    .split("/", 1)[0] as string;
}

/** Runtime contract for an atomically persisted historical private-evidence outbox intent. */
export const historicalPrivateEvidenceOutboxIntentSchema = z
  .strictObject({
    outboxEventId: boundedIdentitySchema,
    auditEventId: boundedIdentitySchema,
    auditReceiptId: boundedIdentitySchema,
    operation: z.literal("historical-private-evidence:import"),
    scope: scopeSchema,
    source: sourceSchema,
    payload: payloadSchema,
    payloadDigest: historicalOutboxDigestSchema,
  })
  .superRefine((intent, context) => {
    if (
      evidenceCompanyId(intent.payload.evidenceReference) !==
      intent.scope.companyId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payload", "evidenceReference"],
        message: "Evidence reference company must match the outbox scope",
      });
    }
  });

/** Immutable persisted intent produced by Finance's record/audit outbox boundary. */
export type HistoricalPrivateEvidenceOutboxIntent = z.infer<
  typeof historicalPrivateEvidenceOutboxIntentSchema
>;

/** Runtime contract for a durable receipt bound to a Finance outbox event. */
export const historicalPrivateEvidenceProjectorReceiptSchema = z.strictObject({
  outboxEventId: boundedIdentitySchema,
  auditEventId: boundedIdentitySchema,
  auditReceiptId: boundedIdentitySchema,
  idempotencyKey: z.string().min(1).max(500),
  jobId: z.string().uuid(),
});

/** Immutable durable receipt bound to one Finance outbox event and succeeded audit. */
export type HistoricalPrivateEvidenceProjectorReceipt = z.infer<
  typeof historicalPrivateEvidenceProjectorReceiptSchema
>;

/** Result of projecting a persisted Finance intent into the durable-job boundary. */
export type HistoricalPrivateEvidenceProjectorResult =
  | {
      readonly status: "accepted";
      readonly receipt: Readonly<HistoricalPrivateEvidenceProjectorReceipt>;
    }
  | {
      readonly status: "replay";
      readonly receipt: Readonly<HistoricalPrivateEvidenceProjectorReceipt>;
    }
  | {
      readonly status: "conflict";
      readonly receipt: Readonly<HistoricalPrivateEvidenceProjectorReceipt>;
      readonly reason: "outbox-identity-mismatch";
    };

/** Minimal Finance-owned ledger needed to bind durable receipts to outbox identities. */
export interface HistoricalPrivateEvidenceProjectionStore {
  /** Finds a receipt only under the exact persisted outbox event identity. */
  findByOutboxEventId(
    outboxEventId: string,
  ): Promise<Readonly<HistoricalPrivateEvidenceProjectorReceipt> | undefined>;
  /** Atomically claims a missing receipt binding or returns the first accepted receipt. */
  claimReceipt?(input: Readonly<{
    /** Persisted outbox event identity. */
    readonly outboxEventId: string;
    /** Canonical durable idempotency identity. */
    readonly idempotencyKey: string;
  }>): Promise<
    | { readonly status: "claimed" }
    | {
        readonly status: "replay";
        readonly receipt: Readonly<HistoricalPrivateEvidenceProjectorReceipt>;
      }
  >;
  /** Persists the immutable provider-neutral durable receipt binding. */
  bindReceipt(
    input: Readonly<HistoricalPrivateEvidenceProjectorReceipt>,
  ): Promise<void>;
}

/** Job configuration used by the Finance-owned historical packet projector. */
export interface HistoricalPrivateEvidenceProjectorJob {
  /** Provider-neutral handler name. */
  readonly jobName: string;
  /** Provider-neutral queue name. */
  readonly queueName: string;
  /** Maximum retry attempts declared for the durable job. */
  readonly maxAttempts: number;
}

/** Dependencies required to create a historical private-evidence outbox projector. */
export interface HistoricalPrivateEvidenceProjectorInput {
  /** Generic durable enqueue boundary; no provider SDK is accepted here. */
  readonly durableJobs: HistoricalPrivateEvidenceDurableJobEnqueuePort;
  /** Finance-owned receipt ledger. */
  readonly projectionStore: HistoricalPrivateEvidenceProjectionStore;
  /** Stable job identity and retry configuration. */
  readonly job: Readonly<HistoricalPrivateEvidenceProjectorJob>;
}

/** Durable projector for one Finance historical private-evidence outbox intent. */
export interface HistoricalPrivateEvidenceOutboxProjector {
  /** Projects one already-persisted intent exactly once or returns immutable replay/conflict state. */
  project(
    intent: Readonly<HistoricalPrivateEvidenceOutboxIntent>,
  ): Promise<HistoricalPrivateEvidenceProjectorResult>;
}

/** Storage reader shape consumed by the Finance private-evidence binding adapter. */
export interface AuthorizedPrivateEvidenceReader {
  /** Reads one authorized private-evidence snapshot. */
  readAuthorizedEvidence(input: Readonly<{
    /** Exact immutable evidence reference. */
    readonly evidenceReference: string;
    /** Company-first and optional-school scope. */
    readonly scope: { readonly companyId: string; readonly schoolId?: string };
    /** Attestation evidence used for authorization. */
    readonly authorization: Readonly<Record<string, unknown>>;
    /** Expected payload digest. */
    readonly expectedPayloadDigest: string;
    /** Owner-controlled read limit. */
    readonly maxBytes: number;
  }>): Promise<Readonly<{
    /** Verified immutable evidence reference. */
    readonly evidenceReference: string;
    /** Verified payload digest. */
    readonly payloadDigest: string;
  }>>;
}

/** Dependencies for the Finance adapter that binds an authorized storage read. */
export interface HistoricalPrivateEvidenceBindingAdapterInput {
  /** Authorized provider-neutral private-evidence reader. */
  readonly reader: AuthorizedPrivateEvidenceReader;
  /** Owner-controlled maximum packet size. */
  readonly maxBytes: number;
}

/** Creates the Finance binding port over an authorized private-storage reader. */
export function createHistoricalPrivateEvidenceBindingAdapter(
  input: HistoricalPrivateEvidenceBindingAdapterInput,
): HistoricalPrivateEvidenceBindingPort {
  return Object.freeze({
    async verify(
      request: Parameters<HistoricalPrivateEvidenceBindingPort["verify"]>[0],
    ) {
      const result = await input.reader.readAuthorizedEvidence({
        evidenceReference: request.evidenceReference,
        scope: request.scope,
        authorization: request.authorization,
        expectedPayloadDigest: request.expectedPayloadDigest,
        maxBytes: input.maxBytes,
      });
      return Object.freeze({
        evidenceReference: result.evidenceReference,
        scope: request.scope,
        payloadDigest: result.payloadDigest,
      });
    },
  });
}

const projectorJobSchema = z.strictObject({
  jobName: historicalJobNameSchema,
  queueName: historicalJobQueueNameSchema,
  maxAttempts: z.number().int().min(1).max(1_000),
});

function projectorError(code: string): Error {
  return new Error(code);
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      freezeDeep(nested);
    }
    Object.freeze(value);
  }
  return value;
}

function encodeIdentity(value: string): string {
  return `${value.length}:${value}`;
}

function createIdempotencyKey(
  intent: Readonly<HistoricalPrivateEvidenceOutboxIntent>,
): string {
  return [
    "historical-private-evidence-outbox-v1",
    `operation=${encodeIdentity(intent.operation)}`,
    `company=${encodeIdentity(intent.scope.companyId)}`,
    intent.scope.schoolId === undefined
      ? "school=none"
      : `school=some:${encodeIdentity(intent.scope.schoolId)}`,
    `source-system=${encodeIdentity(intent.source.sourceSystem)}`,
    `source-version=${encodeIdentity(intent.source.sourceVersion)}`,
    `source-identity=${encodeIdentity(intent.source.sourceIdentity)}`,
    `payload-digest=${encodeIdentity(intent.payloadDigest)}`,
  ].join("|");
}

/** Creates a bounded digest for oversized durable idempotency identities. */
async function createBoundedIdempotencyKey(
  intent: Readonly<HistoricalPrivateEvidenceOutboxIntent>,
): Promise<string> {
  const identity = createIdempotencyKey(intent);
  if (identity.length <= 500) return identity;
  const bytes = new TextEncoder().encode(identity);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hexadecimal = Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  return `historical-private-evidence-outbox-v1|sha256=${hexadecimal}`;
}

function receiptMatchesIntent(
  receipt: Readonly<HistoricalPrivateEvidenceProjectorReceipt>,
  intent: Readonly<HistoricalPrivateEvidenceOutboxIntent>,
  idempotencyKey: string,
): boolean {
  return (
    receipt.outboxEventId === intent.outboxEventId &&
    receipt.auditEventId === intent.auditEventId &&
    receipt.auditReceiptId === intent.auditReceiptId &&
    receipt.idempotencyKey === idempotencyKey
  );
}

function createEnqueueRequest(
  intent: Readonly<HistoricalPrivateEvidenceOutboxIntent>,
  idempotencyKey: string,
  job: Readonly<HistoricalPrivateEvidenceProjectorJob>,
): Readonly<HistoricalPrivateEvidenceDurableJobRequest> {
  const request = {
    jobName: job.jobName,
    queueName: job.queueName,
    tenant: { mode: "tenant" as const, tenantId: intent.scope.companyId },
    idempotencyKey,
    payload: {
      outboxEventId: intent.outboxEventId,
      auditEventId: intent.auditEventId,
    },
    maxAttempts: job.maxAttempts,
    availableAt: new Date().toISOString(),
  };
  const parsed = historicalEnqueueJobRequestSchema.safeParse(request);
  if (!parsed.success) {
    throw projectorError("FINANCE_DURABLE_REQUEST_INVALID");
  }
  return freezeDeep(request);
}

/** Creates the Finance projector that maps persisted outbox intents to the generic durable-job port. */
export function createHistoricalPrivateEvidenceOutboxProjector(
  input: HistoricalPrivateEvidenceProjectorInput,
): HistoricalPrivateEvidenceOutboxProjector {
  const jobResult = projectorJobSchema.safeParse(input?.job);
  if (
    !jobResult.success ||
    typeof input?.durableJobs?.enqueue !== "function" ||
    typeof input?.projectionStore?.findByOutboxEventId !== "function" ||
    typeof input?.projectionStore?.bindReceipt !== "function"
  ) {
    throw projectorError("FINANCE_PROJECTOR_DEPENDENCY_INVALID");
  }
  const job = freezeDeep(jobResult.data);

  return {
    async project(
      rawIntent: Readonly<HistoricalPrivateEvidenceOutboxIntent>,
    ): Promise<HistoricalPrivateEvidenceProjectorResult> {
      const intentResult =
        historicalPrivateEvidenceOutboxIntentSchema.safeParse(rawIntent);
      if (!intentResult.success) {
        throw projectorError("FINANCE_OUTBOX_INTENT_INVALID");
      }
      const intent = freezeDeep(intentResult.data);
      const idempotencyKey = await createBoundedIdempotencyKey(intent);
      const storedReceipt = await input.projectionStore.findByOutboxEventId(
        intent.outboxEventId,
      );

      if (storedReceipt !== undefined) {
        const receiptResult =
          historicalPrivateEvidenceProjectorReceiptSchema.safeParse(
            storedReceipt,
          );
        if (!receiptResult.success) {
          throw projectorError("FINANCE_OUTBOX_RECEIPT_INVALID");
        }
        const receipt = freezeDeep(receiptResult.data);
        if (receiptMatchesIntent(receipt, intent, idempotencyKey)) {
          return freezeDeep({ status: "replay" as const, receipt });
        }
        return freezeDeep({
          status: "conflict" as const,
          receipt,
          reason: "outbox-identity-mismatch" as const,
        });
      }

      if (typeof input.projectionStore.claimReceipt === "function") {
        const claim = await input.projectionStore.claimReceipt({
          outboxEventId: intent.outboxEventId,
          idempotencyKey,
        });
        if (claim.status === "replay") {
          const receipt = freezeDeep(
            historicalPrivateEvidenceProjectorReceiptSchema.parse(claim.receipt),
          );
          if (receiptMatchesIntent(receipt, intent, idempotencyKey)) {
            return freezeDeep({ status: "replay" as const, receipt });
          }
          return freezeDeep({
            status: "conflict" as const,
            receipt,
            reason: "outbox-identity-mismatch" as const,
          });
        }
      }

      const enqueueRequest = createEnqueueRequest(intent, idempotencyKey, job);
      const durableResult = historicalEnqueueJobResultSchema.safeParse(
        await input.durableJobs.enqueue(enqueueRequest),
      );
      if (!durableResult.success) {
        throw projectorError("FINANCE_DURABLE_OUTCOME_INVALID");
      }
      if (durableResult.data.outcome !== "enqueued") {
        throw projectorError("FINANCE_DURABLE_OUTCOME_UNSUPPORTED");
      }

      const receipt = freezeDeep(
        historicalPrivateEvidenceProjectorReceiptSchema.parse({
          outboxEventId: intent.outboxEventId,
          auditEventId: intent.auditEventId,
          auditReceiptId: intent.auditReceiptId,
          idempotencyKey,
          jobId: durableResult.data.jobId,
        }),
      );
      await input.projectionStore.bindReceipt(receipt);
      return freezeDeep({ status: "accepted" as const, receipt });
    },
  };
}
