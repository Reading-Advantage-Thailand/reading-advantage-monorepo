import { z } from "zod";

import {
  enqueueJobRequestSchema,
  enqueueJobResultSchema,
  jobNameSchema,
  jobQueueNameSchema,
  type EnqueueJobRequest,
  type EnqueueJobResult,
} from "../../jobs/contracts.js";
import type { DurableJobEnqueuePort } from "../../jobs/ports.js";

import type {
  FinanceAuthorizationEvidence,
  FinanceOperationAuthorizationInput,
  FinanceOperationScope,
} from "./contracts.js";
import {
  nonBlankStringSchema,
  financeOperationScopeSchema,
  privateEvidenceReferenceSchema,
  historicalPrivateEvidenceAuthorizationEvidenceSchema,
  historicalPrivateEvidenceObjectIdSchema,
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
/** Finance's projector request is the shared provider-neutral enqueue contract. */
export type HistoricalPrivateEvidenceDurableJobRequest = EnqueueJobRequest;

/** Finance's projector result is the shared provider-neutral enqueue result. */
export type HistoricalPrivateEvidenceDurableJobResult = EnqueueJobResult;

/** Finance's projector consumes the shared provider-neutral enqueue capability. */
export type HistoricalPrivateEvidenceDurableJobEnqueuePort =
  DurableJobEnqueuePort;

const historicalOutboxDigestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const HISTORICAL_PRIVATE_EVIDENCE_OUTBOX_KEY_PREFIX =
  "historical-private-evidence-outbox-v1";
const historicalPrivateEvidenceIdempotencyKeySchema = z
  .string()
  .min(1)
  .max(500)
  .refine((value) => {
    const prefix = `${HISTORICAL_PRIVATE_EVIDENCE_OUTBOX_KEY_PREFIX}|`;
    if (!value.startsWith(prefix)) return false;
    const suffix = value.slice(prefix.length);
    return (
      suffix.startsWith("operation=") || /^sha256=[a-f0-9]{64}$/u.test(suffix)
    );
  });
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
    objectId: historicalPrivateEvidenceObjectIdSchema,
    operation: z.literal("historical-private-evidence:import"),
    scope: scopeSchema,
    source: sourceSchema,
    payload: payloadSchema,
    authorizationEvidence: historicalPrivateEvidenceAuthorizationEvidenceSchema,
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
    if (
      intent.authorizationEvidence.organizationId !== intent.scope.companyId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authorizationEvidence", "organizationId"],
        message: "Authorization evidence company must match the outbox scope",
      });
    }
    if (
      intent.scope.schoolId !== undefined &&
      !intent.authorizationEvidence.schoolIds?.includes(intent.scope.schoolId)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authorizationEvidence", "schoolIds"],
        message: "Authorization evidence must attest the outbox school scope",
      });
    }
  });

/** Immutable persisted intent produced by Finance's record/audit outbox boundary. */
export type HistoricalPrivateEvidenceOutboxIntent = z.infer<
  typeof historicalPrivateEvidenceOutboxIntentSchema
>;

/** Runtime contract for a durable receipt bound to a Finance outbox event. */
export const historicalPrivateEvidenceProjectorReceiptSchema = z
  .strictObject({
    outboxEventId: boundedIdentitySchema,
    auditEventId: boundedIdentitySchema,
    auditReceiptId: boundedIdentitySchema,
    objectId: historicalPrivateEvidenceObjectIdSchema,
    scope: scopeSchema,
    authorizationEvidence: historicalPrivateEvidenceAuthorizationEvidenceSchema,
    policyVersion: boundedIdentitySchema,
    idempotencyKey: historicalPrivateEvidenceIdempotencyKeySchema,
    jobId: z.string().uuid(),
  })
  .superRefine((receipt, context) => {
    if (receipt.policyVersion !== receipt.authorizationEvidence.policyVersion) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["policyVersion"],
        message: "Receipt policy version must match authorization evidence",
      });
    }
    if (
      receipt.authorizationEvidence.organizationId !== receipt.scope.companyId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authorizationEvidence", "organizationId"],
        message: "Receipt authorization evidence company must match scope",
      });
    }
    if (
      receipt.scope.schoolId !== undefined &&
      !receipt.authorizationEvidence.schoolIds?.includes(receipt.scope.schoolId)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authorizationEvidence", "schoolIds"],
        message: "Receipt authorization evidence must attest the school scope",
      });
    }
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

/** Runtime contract for a claimed Finance projection and its reconciliation state. */
export const historicalPrivateEvidenceProjectorClaimSchema =
  z.discriminatedUnion("status", [
    z.strictObject({
      status: z.literal("claimed"),
      claimToken: boundedIdentitySchema,
    }),
    z.strictObject({
      status: z.literal("replay"),
      receipt: historicalPrivateEvidenceProjectorReceiptSchema,
    }),
    z.strictObject({
      status: z.literal("reconcile"),
      claimToken: boundedIdentitySchema,
      receipt: historicalPrivateEvidenceProjectorReceiptSchema,
    }),
  ]);

/** Claimed, replayed, or reconciliation-required projection state. */
export type HistoricalPrivateEvidenceProjectorClaim = z.infer<
  typeof historicalPrivateEvidenceProjectorClaimSchema
>;

/** Minimal Finance-owned ledger needed to bind durable receipts to outbox identities. */
export interface HistoricalPrivateEvidenceProjectionStore {
  /** Finds a receipt only under the exact persisted outbox event identity. */
  findByOutboxEventId(
    outboxEventId: string,
  ): Promise<Readonly<HistoricalPrivateEvidenceProjectorReceipt> | undefined>;
  /** Atomically claims a missing receipt binding or returns the first accepted receipt. */
  claimReceipt(
    input: Readonly<{
      /** Persisted outbox event identity. */
      readonly outboxEventId: string;
      /** Canonical durable idempotency identity. */
      readonly idempotencyKey: string;
      /** Complete immutable intent that must be retained by the pending claim. */
      readonly intent: Readonly<HistoricalPrivateEvidenceOutboxIntent>;
    }>,
  ): Promise<
    | { readonly status: "claimed"; readonly claimToken: string }
    | {
        readonly status: "replay";
        readonly receipt: Readonly<HistoricalPrivateEvidenceProjectorReceipt>;
      }
    | {
        readonly status: "reconcile";
        readonly claimToken: string;
        /** Original receipt retained when the first bind could not finalize. */
        readonly receipt: Readonly<HistoricalPrivateEvidenceProjectorReceipt>;
      }
  >;
  /** Returns a failed claim to pending or records a durable reconciliation lease. */
  releaseClaim(
    input: Readonly<
      | {
          /** Persisted outbox event identity. */
          readonly outboxEventId: string;
          /** Canonical durable idempotency identity. */
          readonly idempotencyKey: string;
          /** Opaque claim lease returned by the store. */
          readonly claimToken: string;
          /** Complete immutable intent retained by the pending state. */
          readonly intent: Readonly<HistoricalPrivateEvidenceOutboxIntent>;
          /** Failed enqueue returns the claim to pending. */
          readonly state: "pending";
          /** Failure class retained for operator/retry behavior. */
          readonly reason: "enqueue-failed";
        }
      | {
          /** Persisted outbox event identity. */
          readonly outboxEventId: string;
          /** Canonical durable idempotency identity. */
          readonly idempotencyKey: string;
          /** Opaque claim lease returned by the store. */
          readonly claimToken: string;
          /** Complete immutable intent retained by the reconciliation state. */
          readonly intent: Readonly<HistoricalPrivateEvidenceOutboxIntent>;
          /** Bind failure retains the original receipt and durable job identity. */
          readonly receipt: Readonly<HistoricalPrivateEvidenceProjectorReceipt>;
          /** Bind failure enters durable reconciliation. */
          readonly state: "reconcile";
          /** Failure class retained for operator/retry behavior. */
          readonly reason: "bind-failed";
        }
    >,
  ): Promise<void>;
  /** Persists the immutable provider-neutral durable receipt binding. */
  bindReceipt(
    input: Readonly<{
      /** Opaque claim lease that must still own the binding CAS. */
      readonly claimToken: string;
      /** Receipt bound to the immutable claimed intent. */
      readonly receipt: Readonly<HistoricalPrivateEvidenceProjectorReceipt>;
    }>,
  ): Promise<HistoricalPrivateEvidenceProjectorBindResult>;
}

/** Runtime result of the token-fenced receipt binding CAS. Stale/takeover results carry the authoritative receipt so callers never write through a lost token. */
export const historicalPrivateEvidenceProjectorBindResultSchema = z.union([
  z.strictObject({ status: z.literal("bound") }),
  z.strictObject({
    status: z.literal("replay"),
    receipt: historicalPrivateEvidenceProjectorReceiptSchema,
  }),
  z.strictObject({
    status: z.literal("stale"),
    /** Authoritative receipt retained by the takeover owner. */
    receipt: historicalPrivateEvidenceProjectorReceiptSchema,
  }),
  z.strictObject({
    status: z.literal("conflict"),
    reason: z.literal("receipt-mismatch"),
  }),
  z.strictObject({
    status: z.literal("conflict"),
    reason: z.literal("claim-taken-over"),
    /** Authoritative receipt retained by the takeover owner. */
    receipt: historicalPrivateEvidenceProjectorReceiptSchema,
  }),
]);

/** Strict outcome returned by a receipt-binding compare-and-set operation. */
export type HistoricalPrivateEvidenceProjectorBindResult = z.infer<
  typeof historicalPrivateEvidenceProjectorBindResultSchema
>;

type BindOutputParseResult =
  | {
      readonly kind: "valid";
      readonly data: HistoricalPrivateEvidenceProjectorBindResult;
    }
  | { readonly kind: "invalid" }
  | { readonly kind: "ownership-lost-invalid" };

function captureBindOutputProperty(
  value: unknown,
  key: string,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  if (typeof value !== "object" || value === null) {
    return { ok: false };
  }
  try {
    return { ok: true, value: (value as Record<string, unknown>)[key] };
  } catch {
    return { ok: false };
  }
}

function captureBindOutputKeys(value: unknown): readonly string[] | undefined {
  try {
    if (typeof value !== "object" || value === null) return undefined;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key): key is symbol => typeof key !== "string")) {
      return undefined;
    }
    return keys as string[];
  } catch {
    return undefined;
  }
}

function hasExactBindOutputKeys(
  actual: readonly string[] | undefined,
  expected: readonly string[],
): boolean {
  return (
    actual !== undefined &&
    actual.length === expected.length &&
    expected.every((key) => actual.includes(key))
  );
}

function parseCapturedBindOutput(
  value: Readonly<Record<string, unknown>>,
  ownershipLost: boolean,
): BindOutputParseResult {
  try {
    const result =
      historicalPrivateEvidenceProjectorBindResultSchema.safeParse(value);
    if (result.success) return { kind: "valid", data: result.data };
    return ownershipLost
      ? { kind: "ownership-lost-invalid" }
      : { kind: "invalid" };
  } catch {
    return ownershipLost
      ? { kind: "ownership-lost-invalid" }
      : { kind: "invalid" };
  }
}

function parseBindOutput(value: unknown): BindOutputParseResult {
  const statusResult = captureBindOutputProperty(value, "status");
  if (!statusResult.ok) return { kind: "invalid" };
  if (statusResult.value === "stale") {
    const keys = captureBindOutputKeys(value);
    if (!hasExactBindOutputKeys(keys, ["status", "receipt"])) {
      return { kind: "ownership-lost-invalid" };
    }
    const receiptResult = captureBindOutputProperty(value, "receipt");
    if (!receiptResult.ok) return { kind: "ownership-lost-invalid" };
    return parseCapturedBindOutput(
      { status: "stale", receipt: receiptResult.value },
      true,
    );
  }
  if (statusResult.value === "conflict") {
    const reasonResult = captureBindOutputProperty(value, "reason");
    if (!reasonResult.ok) return { kind: "invalid" };
    if (reasonResult.value === "claim-taken-over") {
      const keys = captureBindOutputKeys(value);
      if (!hasExactBindOutputKeys(keys, ["status", "reason", "receipt"])) {
        return { kind: "ownership-lost-invalid" };
      }
      const receiptResult = captureBindOutputProperty(value, "receipt");
      if (!receiptResult.ok) return { kind: "ownership-lost-invalid" };
      return parseCapturedBindOutput(
        {
          status: "conflict",
          reason: "claim-taken-over",
          receipt: receiptResult.value,
        },
        true,
      );
    }
    if (reasonResult.value !== "receipt-mismatch") {
      return { kind: "invalid" };
    }
    const keys = captureBindOutputKeys(value);
    if (!hasExactBindOutputKeys(keys, ["status", "reason"])) {
      return { kind: "invalid" };
    }
    return parseCapturedBindOutput(
      { status: "conflict", reason: "receipt-mismatch" },
      false,
    );
  }
  if (statusResult.value === "bound") {
    const keys = captureBindOutputKeys(value);
    if (!hasExactBindOutputKeys(keys, ["status"])) {
      return { kind: "invalid" };
    }
    return parseCapturedBindOutput({ status: "bound" }, false);
  }
  if (statusResult.value === "replay") {
    const keys = captureBindOutputKeys(value);
    if (!hasExactBindOutputKeys(keys, ["status", "receipt"])) {
      return { kind: "invalid" };
    }
    const receiptResult = captureBindOutputProperty(value, "receipt");
    if (!receiptResult.ok) return { kind: "invalid" };
    return parseCapturedBindOutput(
      { status: "replay", receipt: receiptResult.value },
      false,
    );
  }
  return { kind: "invalid" };
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
  readAuthorizedEvidence(
    input: Readonly<{
      /** Exact immutable evidence reference. */
      readonly evidenceReference: string;
      /** Company-first and optional-school scope. */
      readonly scope: {
        readonly companyId: string;
        readonly schoolId?: string;
      };
      /** Attestation evidence used for authorization. */
      readonly authorization: Readonly<Record<string, unknown>>;
      /** Expected payload digest. */
      readonly expectedPayloadDigest: string;
      /** Owner-controlled read limit. */
      readonly maxBytes: number;
    }>,
  ): Promise<
    Readonly<{
      /** Verified immutable evidence reference. */
      readonly evidenceReference: string;
      /** Verified payload digest. */
      readonly payloadDigest: string;
    }>
  >;
}

/** Dependencies for the Finance adapter that binds an authorized storage read. */
export interface HistoricalPrivateEvidenceBindingAdapterInput {
  /** Authorized provider-neutral private-evidence reader. */
  readonly reader: AuthorizedPrivateEvidenceReader;
  /** Owner-controlled maximum packet size. */
  readonly maxBytes: number;
}

/**
 * Creates the Finance binding port over an authorized private-storage reader.
 * @param input Authorized reader and owner-controlled byte ceiling.
 * @returns A provider-neutral evidence binding port.
 */
export function createHistoricalPrivateEvidenceBindingAdapter(
  input: HistoricalPrivateEvidenceBindingAdapterInput,
): HistoricalPrivateEvidenceBindingPort {
  let reader:
    | HistoricalPrivateEvidenceBindingAdapterInput["reader"]
    | undefined;
  let readMethod:
    | HistoricalPrivateEvidenceBindingAdapterInput["reader"]["readAuthorizedEvidence"]
    | undefined;
  let maxBytesValue: unknown;
  try {
    reader = input?.reader;
    maxBytesValue = input?.maxBytes;
    readMethod = reader?.readAuthorizedEvidence;
  } catch {
    throw new Error("FINANCE_PRIVATE_EVIDENCE_BINDING_DEPENDENCY_INVALID");
  }
  if (
    reader === undefined ||
    typeof readMethod !== "function" ||
    typeof maxBytesValue !== "number" ||
    !Number.isFinite(maxBytesValue) ||
    !Number.isInteger(maxBytesValue) ||
    maxBytesValue <= 0
  ) {
    throw new Error("FINANCE_PRIVATE_EVIDENCE_BINDING_DEPENDENCY_INVALID");
  }

  const readAuthorizedEvidence = readMethod.bind(reader);
  const maxBytes = maxBytesValue;

  const bindingRequestSchema = z.strictObject({
    evidenceReference: privateEvidenceReferenceSchema,
    scope: financeOperationScopeSchema,
    expectedPayloadDigest: historicalOutboxDigestSchema,
    authorization: historicalPrivateEvidenceAuthorizationEvidenceSchema,
  });
  const readerResultSchema = z
    .object({
      evidenceReference: privateEvidenceReferenceSchema,
      payloadDigest: historicalOutboxDigestSchema,
      scope: financeOperationScopeSchema.optional(),
    })
    .passthrough();

  return Object.freeze({
    async verify(
      request: Parameters<HistoricalPrivateEvidenceBindingPort["verify"]>[0],
    ) {
      let parsedRequest: z.SafeParseReturnType<
        unknown,
        z.infer<typeof bindingRequestSchema>
      >;
      try {
        parsedRequest = bindingRequestSchema.safeParse(request);
      } catch {
        throw projectorError(
          "FINANCE_PRIVATE_EVIDENCE_BINDING_REQUEST_INVALID",
        );
      }
      if (!parsedRequest.success) {
        throw projectorError(
          "FINANCE_PRIVATE_EVIDENCE_BINDING_REQUEST_INVALID",
        );
      }
      const immutableRequest = freezeDeep(parsedRequest.data);
      const referenceCompanyId = immutableRequest.evidenceReference
        .slice("private-evidence://".length)
        .split("/", 1)[0];
      if (
        referenceCompanyId !== immutableRequest.scope.companyId ||
        immutableRequest.authorization.organizationId !==
          immutableRequest.scope.companyId ||
        (immutableRequest.scope.schoolId !== undefined &&
          !immutableRequest.authorization.schoolIds?.includes(
            immutableRequest.scope.schoolId,
          ))
      ) {
        throw projectorError(
          "FINANCE_PRIVATE_EVIDENCE_BINDING_REQUEST_INVALID",
        );
      }
      let rawResult: unknown;
      try {
        rawResult = await readAuthorizedEvidence({
          evidenceReference: immutableRequest.evidenceReference,
          scope: immutableRequest.scope,
          authorization: immutableRequest.authorization,
          expectedPayloadDigest: immutableRequest.expectedPayloadDigest,
          maxBytes,
        });
      } catch {
        throw projectorError(
          "FINANCE_PRIVATE_EVIDENCE_BINDING_DEPENDENCY_FAILED",
        );
      }
      let result: z.SafeParseReturnType<
        unknown,
        z.infer<typeof readerResultSchema>
      >;
      try {
        result = readerResultSchema.safeParse(rawResult);
      } catch {
        throw projectorError("FINANCE_PRIVATE_EVIDENCE_BINDING_RESULT_INVALID");
      }
      if (!result.success) {
        throw projectorError("FINANCE_PRIVATE_EVIDENCE_BINDING_RESULT_INVALID");
      }
      let resultEvidenceReference: string;
      let resultPayloadDigest: string;
      let resultScope: FinanceOperationScope | undefined;
      try {
        resultEvidenceReference = result.data.evidenceReference;
        resultPayloadDigest = result.data.payloadDigest;
        resultScope = result.data.scope;
      } catch {
        throw projectorError("FINANCE_PRIVATE_EVIDENCE_BINDING_RESULT_INVALID");
      }
      if (
        resultEvidenceReference !== immutableRequest.evidenceReference ||
        resultPayloadDigest !== immutableRequest.expectedPayloadDigest
      ) {
        throw projectorError("FINANCE_PRIVATE_EVIDENCE_BINDING_MISMATCH");
      }
      if (
        resultScope !== undefined &&
        (resultScope.companyId !== immutableRequest.scope.companyId ||
          resultScope.schoolId !== immutableRequest.scope.schoolId)
      ) {
        throw projectorError("FINANCE_PRIVATE_EVIDENCE_BINDING_MISMATCH");
      }
      return Object.freeze({
        evidenceReference: immutableRequest.evidenceReference,
        scope: immutableRequest.scope,
        payloadDigest: immutableRequest.expectedPayloadDigest,
      });
    },
  });
}

const projectorJobSchema = z.strictObject({
  jobName: jobNameSchema,
  queueName: jobQueueNameSchema,
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
  return `${new TextEncoder().encode(value).byteLength}:${value}`;
}

/** Encodes an optional string list without conflating absence, members, or ordering. */
function encodeStringList(values: readonly string[] | undefined): string {
  return values === undefined
    ? "none"
    : `some:${values.length}:${values.map(encodeIdentity).join(",")}`;
}

const arrayBufferByteLengthGetter = Object.getOwnPropertyDescriptor(
  ArrayBuffer.prototype,
  "byteLength",
)?.get;

/** Copies one genuine 32-byte WebCrypto ArrayBuffer into this realm without retaining provider memory. */
function copySha256Digest(result: unknown): Uint8Array {
  try {
    if (typeof arrayBufferByteLengthGetter !== "function") {
      throw new Error("invalid buffer");
    }
    const byteLength = Reflect.apply(arrayBufferByteLengthGetter, result, []);
    if (byteLength !== 32) throw new Error("invalid SHA-256 result length");
    const copied = new Uint8Array(byteLength);
    copied.set(new Uint8Array(result as ArrayBuffer));
    return copied;
  } catch {
    throw new Error("invalid SHA-256 result");
  }
}

function sourceIdentityDigestInput(value: string): Uint8Array<ArrayBuffer> {
  const domain = new TextEncoder().encode(
    "reading-advantage.finance.historical-private-evidence.source-identity.v1",
  );
  const identity = new TextEncoder().encode(value);
  const framed = new Uint8Array(
    new ArrayBuffer(domain.byteLength + 4 + identity.byteLength),
  );
  framed.set(domain, 0);
  new DataView(framed.buffer).setUint32(domain.byteLength, identity.byteLength);
  framed.set(identity, domain.byteLength + 4);
  return framed;
}

async function createSourceIdentityDigest(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    sourceIdentityDigestInput(value),
  );
  const digestBytes = copySha256Digest(digest);
  if (digestBytes.byteLength !== 32) {
    throw new Error("invalid SHA-256 result length");
  }
  const hexadecimal = Array.from(digestBytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (!historicalOutboxDigestSchema.safeParse(hexadecimal).success) {
    throw new Error("invalid source identity digest");
  }
  return hexadecimal;
}

function createIdempotencyKey(
  intent: Readonly<HistoricalPrivateEvidenceOutboxIntent>,
  sourceIdentityDigest: string,
): string {
  const evidence = intent.authorizationEvidence;
  return [
    "historical-private-evidence-outbox-v1",
    `operation=${encodeIdentity(intent.operation)}`,
    `company=${encodeIdentity(intent.scope.companyId)}`,
    intent.scope.schoolId === undefined
      ? "school=none"
      : `school=some:${encodeIdentity(intent.scope.schoolId)}`,
    `source-system=${encodeIdentity(intent.source.sourceSystem)}`,
    `source-version=${encodeIdentity(intent.source.sourceVersion)}`,
    // Bind the validated source identity without exposing its raw token, email,
    // or other PII. The framed, domain-separated digest also prevents a source
    // identity from being confused with the command-bound object identity.
    `source-identity=sha256:${sourceIdentityDigest}`,
    `payload-digest=${encodeIdentity(intent.payloadDigest)}`,
    `object-id=${encodeIdentity(intent.objectId)}`,
    `claims-version=${encodeIdentity(evidence.claimsVersion)}`,
    `policy-version=${encodeIdentity(evidence.policyVersion)}`,
    `subject-id=${encodeIdentity(evidence.subjectId)}`,
    `organization-id=${encodeIdentity(evidence.organizationId)}`,
    `app-role-ids=${encodeStringList(evidence.appRoleIds)}`,
    `school-ids=${encodeStringList(evidence.schoolIds)}`,
  ].join("|");
}

/** Creates a bounded digest for oversized durable idempotency identities. */
async function createBoundedIdempotencyKey(
  intent: Readonly<HistoricalPrivateEvidenceOutboxIntent>,
): Promise<string> {
  try {
    const sourceIdentityDigest = await createSourceIdentityDigest(
      intent.source.sourceIdentity,
    );
    const identity = createIdempotencyKey(intent, sourceIdentityDigest);
    if (identity.length <= 500) {
      const identityResult =
        historicalPrivateEvidenceIdempotencyKeySchema.safeParse(identity);
      if (!identityResult.success) {
        throw new Error("invalid idempotency key");
      }
      return identityResult.data;
    }
    const bytes = new TextEncoder().encode(identity);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    const digestBytes = copySha256Digest(digest);
    if (digestBytes.byteLength !== 32) {
      throw new Error("invalid SHA-256 result length");
    }
    const hexadecimal = Array.from(digestBytes, (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("");
    const idempotencyKey = `${HISTORICAL_PRIVATE_EVIDENCE_OUTBOX_KEY_PREFIX}|sha256=${hexadecimal}`;
    const idempotencyKeyResult =
      historicalPrivateEvidenceIdempotencyKeySchema.safeParse(idempotencyKey);
    if (!idempotencyKeyResult.success) {
      throw new Error("invalid idempotency key");
    }
    return idempotencyKeyResult.data;
  } catch {
    throw projectorError("FINANCE_IDEMPOTENCY_KEY_DERIVATION_FAILED");
  }
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
    receipt.objectId === intent.objectId &&
    receipt.scope.companyId === intent.scope.companyId &&
    receipt.scope.schoolId === intent.scope.schoolId &&
    receipt.authorizationEvidence.source ===
      intent.authorizationEvidence.source &&
    receipt.authorizationEvidence.claimsVersion ===
      intent.authorizationEvidence.claimsVersion &&
    receipt.authorizationEvidence.policyVersion ===
      intent.authorizationEvidence.policyVersion &&
    receipt.authorizationEvidence.subjectId ===
      intent.authorizationEvidence.subjectId &&
    receipt.authorizationEvidence.organizationId ===
      intent.authorizationEvidence.organizationId &&
    encodeStringList(receipt.authorizationEvidence.appRoleIds) ===
      encodeStringList(intent.authorizationEvidence.appRoleIds) &&
    encodeStringList(receipt.authorizationEvidence.schoolIds) ===
      encodeStringList(intent.authorizationEvidence.schoolIds) &&
    receipt.policyVersion === intent.authorizationEvidence.policyVersion &&
    receipt.idempotencyKey === idempotencyKey
  );
}

function resolveAuthoritativeBindReceipt(
  receipt: Readonly<HistoricalPrivateEvidenceProjectorReceipt>,
  intent: Readonly<HistoricalPrivateEvidenceOutboxIntent>,
  idempotencyKey: string,
): HistoricalPrivateEvidenceProjectorResult {
  const authoritativeReceipt = freezeDeep(
    historicalPrivateEvidenceProjectorReceiptSchema.parse(receipt),
  );
  if (receiptMatchesIntent(authoritativeReceipt, intent, idempotencyKey)) {
    return freezeDeep({
      status: "replay" as const,
      receipt: authoritativeReceipt,
    });
  }
  return freezeDeep({
    status: "conflict" as const,
    receipt: authoritativeReceipt,
    reason: "outbox-identity-mismatch" as const,
  });
}

function createEnqueueRequest(
  intent: Readonly<HistoricalPrivateEvidenceOutboxIntent>,
  idempotencyKey: string,
  job: Readonly<HistoricalPrivateEvidenceProjectorJob>,
): Readonly<HistoricalPrivateEvidenceDurableJobRequest> {
  const { schoolIds, ...authorizationEvidence } = intent.authorizationEvidence;
  const request = {
    jobName: job.jobName,
    queueName: job.queueName,
    tenant: { mode: "tenant" as const, tenantId: intent.scope.companyId },
    idempotencyKey,
    payload: {
      outboxEventId: intent.outboxEventId,
      auditEventId: intent.auditEventId,
      objectId: intent.objectId,
      authorizationEvidence: {
        ...authorizationEvidence,
        ...(schoolIds === undefined ? {} : { schoolIds }),
      },
    },
    maxAttempts: job.maxAttempts,
    availableAt: new Date().toISOString(),
  };
  const parsed = enqueueJobRequestSchema.safeParse(request);
  if (!parsed.success) {
    throw projectorError("FINANCE_DURABLE_REQUEST_INVALID");
  }
  return freezeDeep(request);
}

/**
 * Creates the Finance projector that maps persisted outbox intents to the generic durable-job port.
 * @param input Generic enqueue port, claim/reconciliation store, and job configuration.
 * @returns A durable projector with constructor-bound dependencies.
 */
export function createHistoricalPrivateEvidenceOutboxProjector(
  input: HistoricalPrivateEvidenceProjectorInput,
): HistoricalPrivateEvidenceOutboxProjector {
  let jobValue: unknown;
  let durableJobs:
    | HistoricalPrivateEvidenceProjectorInput["durableJobs"]
    | undefined;
  let projectionStore:
    | HistoricalPrivateEvidenceProjectorInput["projectionStore"]
    | undefined;
  let enqueueMethod:
    | HistoricalPrivateEvidenceProjectorInput["durableJobs"]["enqueue"]
    | undefined;
  let findByOutboxEventIdMethod:
    | HistoricalPrivateEvidenceProjectorInput["projectionStore"]["findByOutboxEventId"]
    | undefined;
  let claimReceiptMethod:
    | HistoricalPrivateEvidenceProjectorInput["projectionStore"]["claimReceipt"]
    | undefined;
  let releaseClaimMethod:
    | HistoricalPrivateEvidenceProjectorInput["projectionStore"]["releaseClaim"]
    | undefined;
  let bindReceiptMethod:
    | HistoricalPrivateEvidenceProjectorInput["projectionStore"]["bindReceipt"]
    | undefined;
  try {
    jobValue = input?.job;
    durableJobs = input?.durableJobs;
    projectionStore = input?.projectionStore;
    enqueueMethod = durableJobs?.enqueue;
    findByOutboxEventIdMethod = projectionStore?.findByOutboxEventId;
    claimReceiptMethod = projectionStore?.claimReceipt;
    releaseClaimMethod = projectionStore?.releaseClaim;
    bindReceiptMethod = projectionStore?.bindReceipt;
  } catch {
    throw projectorError("FINANCE_PROJECTOR_DEPENDENCY_INVALID");
  }
  let jobResult: z.SafeParseReturnType<
    unknown,
    z.infer<typeof projectorJobSchema>
  >;
  try {
    jobResult = projectorJobSchema.safeParse(jobValue);
  } catch {
    throw projectorError("FINANCE_PROJECTOR_DEPENDENCY_INVALID");
  }
  if (
    !jobResult.success ||
    durableJobs === undefined ||
    projectionStore === undefined ||
    typeof enqueueMethod !== "function" ||
    typeof findByOutboxEventIdMethod !== "function" ||
    typeof bindReceiptMethod !== "function" ||
    typeof claimReceiptMethod !== "function" ||
    typeof releaseClaimMethod !== "function"
  ) {
    throw projectorError("FINANCE_PROJECTOR_DEPENDENCY_INVALID");
  }
  const job = freezeDeep(jobResult.data);
  const enqueue = enqueueMethod.bind(durableJobs);
  const findByOutboxEventId = findByOutboxEventIdMethod.bind(projectionStore);
  const claimReceipt = claimReceiptMethod.bind(projectionStore);
  const releaseClaim = releaseClaimMethod.bind(projectionStore);
  const bindReceipt = bindReceiptMethod.bind(projectionStore);

  async function releaseClaimAfterFailure(input: {
    readonly outboxEventId: string;
    readonly idempotencyKey: string;
    readonly claimToken: string;
    readonly intent: Readonly<HistoricalPrivateEvidenceOutboxIntent>;
    readonly state: "pending" | "reconcile";
    readonly receipt?: Readonly<HistoricalPrivateEvidenceProjectorReceipt>;
    readonly reason: "enqueue-failed" | "bind-failed";
    readonly errorCode: string;
  }): Promise<never> {
    try {
      if (input.state === "reconcile") {
        if (input.receipt === undefined) {
          throw projectorError("FINANCE_PROJECTOR_CLAIM_RELEASE_FAILED");
        }
        await releaseClaim({
          outboxEventId: input.outboxEventId,
          idempotencyKey: input.idempotencyKey,
          claimToken: input.claimToken,
          intent: input.intent,
          state: "reconcile",
          receipt: input.receipt,
          reason: "bind-failed",
        });
      } else {
        await releaseClaim({
          outboxEventId: input.outboxEventId,
          idempotencyKey: input.idempotencyKey,
          claimToken: input.claimToken,
          intent: input.intent,
          state: "pending",
          reason: "enqueue-failed",
        });
      }
    } catch {
      throw projectorError("FINANCE_PROJECTOR_CLAIM_RELEASE_FAILED");
    }
    throw projectorError(input.errorCode);
  }

  return {
    async project(
      rawIntent: Readonly<HistoricalPrivateEvidenceOutboxIntent>,
    ): Promise<HistoricalPrivateEvidenceProjectorResult> {
      let intentResult: z.SafeParseReturnType<
        unknown,
        z.infer<typeof historicalPrivateEvidenceOutboxIntentSchema>
      >;
      try {
        intentResult =
          historicalPrivateEvidenceOutboxIntentSchema.safeParse(rawIntent);
      } catch {
        throw projectorError("FINANCE_OUTBOX_INTENT_INVALID");
      }
      if (!intentResult.success) {
        throw projectorError("FINANCE_OUTBOX_INTENT_INVALID");
      }
      const intent = freezeDeep(intentResult.data);
      const idempotencyKey = await createBoundedIdempotencyKey(intent);
      let storedReceipt:
        | Readonly<HistoricalPrivateEvidenceProjectorReceipt>
        | undefined;
      try {
        storedReceipt = await findByOutboxEventId(intent.outboxEventId);
      } catch {
        throw projectorError("FINANCE_PROJECTOR_RECEIPT_LOOKUP_FAILED");
      }

      if (storedReceipt !== undefined) {
        let receiptResult: z.SafeParseReturnType<
          unknown,
          z.infer<typeof historicalPrivateEvidenceProjectorReceiptSchema>
        >;
        try {
          receiptResult =
            historicalPrivateEvidenceProjectorReceiptSchema.safeParse(
              storedReceipt,
            );
        } catch {
          throw projectorError("FINANCE_OUTBOX_RECEIPT_INVALID");
        }
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

      let claim: HistoricalPrivateEvidenceProjectorClaim;
      try {
        const claimResult =
          historicalPrivateEvidenceProjectorClaimSchema.safeParse(
            await claimReceipt({
              outboxEventId: intent.outboxEventId,
              idempotencyKey,
              intent,
            }),
          );
        if (!claimResult.success) {
          throw projectorError("FINANCE_PROJECTOR_CLAIM_RESULT_INVALID");
        }
        claim = claimResult.data;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "FINANCE_PROJECTOR_CLAIM_RESULT_INVALID"
        ) {
          throw error;
        }
        throw projectorError("FINANCE_PROJECTOR_CLAIM_FAILED");
      }

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

      if (claim.status === "reconcile") {
        const receipt = freezeDeep(
          historicalPrivateEvidenceProjectorReceiptSchema.parse(claim.receipt),
        );
        if (!receiptMatchesIntent(receipt, intent, idempotencyKey)) {
          return freezeDeep({
            status: "conflict" as const,
            receipt,
            reason: "outbox-identity-mismatch" as const,
          });
        }
        let bindOutput: unknown;
        try {
          bindOutput = await bindReceipt({
            claimToken: claim.claimToken,
            receipt,
          });
        } catch {
          return releaseClaimAfterFailure({
            outboxEventId: intent.outboxEventId,
            idempotencyKey,
            claimToken: claim.claimToken,
            intent,
            state: "reconcile",
            receipt,
            reason: "bind-failed",
            errorCode: "FINANCE_PROJECTOR_BIND_FAILED",
          });
        }
        const parsedBindOutput = parseBindOutput(bindOutput);
        if (parsedBindOutput.kind === "ownership-lost-invalid") {
          throw projectorError("FINANCE_PROJECTOR_BIND_RESULT_INVALID");
        }
        if (parsedBindOutput.kind === "invalid") {
          return releaseClaimAfterFailure({
            outboxEventId: intent.outboxEventId,
            idempotencyKey,
            claimToken: claim.claimToken,
            intent,
            state: "reconcile",
            receipt,
            reason: "bind-failed",
            errorCode: "FINANCE_PROJECTOR_BIND_RESULT_INVALID",
          });
        }
        const bindResult = parsedBindOutput.data;
        if (
          bindResult.status === "stale" ||
          (bindResult.status === "conflict" &&
            bindResult.reason === "claim-taken-over")
        ) {
          return resolveAuthoritativeBindReceipt(
            bindResult.receipt,
            intent,
            idempotencyKey,
          );
        }
        if (bindResult.status === "conflict") {
          return releaseClaimAfterFailure({
            outboxEventId: intent.outboxEventId,
            idempotencyKey,
            claimToken: claim.claimToken,
            intent,
            state: "reconcile",
            receipt,
            reason: "bind-failed",
            errorCode: "FINANCE_PROJECTOR_BIND_CONFLICT",
          });
        }
        if (bindResult.status === "replay") {
          return resolveAuthoritativeBindReceipt(
            bindResult.receipt,
            intent,
            idempotencyKey,
          );
        }
        return freezeDeep({ status: "accepted" as const, receipt });
      }

      let enqueueRequest: Readonly<HistoricalPrivateEvidenceDurableJobRequest>;
      try {
        enqueueRequest = createEnqueueRequest(intent, idempotencyKey, job);
      } catch {
        return releaseClaimAfterFailure({
          outboxEventId: intent.outboxEventId,
          idempotencyKey,
          claimToken: claim.claimToken,
          intent,
          state: "pending",
          reason: "enqueue-failed",
          errorCode: "FINANCE_DURABLE_REQUEST_INVALID",
        });
      }

      let durableOutput: unknown;
      try {
        durableOutput = await enqueue(enqueueRequest);
      } catch {
        return releaseClaimAfterFailure({
          outboxEventId: intent.outboxEventId,
          idempotencyKey,
          claimToken: claim.claimToken,
          intent,
          state: "pending",
          reason: "enqueue-failed",
          errorCode: "FINANCE_DURABLE_ENQUEUE_FAILED",
        });
      }

      let durableResult: z.SafeParseReturnType<
        unknown,
        z.infer<typeof enqueueJobResultSchema>
      >;
      try {
        durableResult = enqueueJobResultSchema.safeParse(durableOutput);
      } catch {
        return releaseClaimAfterFailure({
          outboxEventId: intent.outboxEventId,
          idempotencyKey,
          claimToken: claim.claimToken,
          intent,
          state: "pending",
          reason: "enqueue-failed",
          errorCode: "FINANCE_DURABLE_OUTCOME_INVALID",
        });
      }
      if (!durableResult.success) {
        return releaseClaimAfterFailure({
          outboxEventId: intent.outboxEventId,
          idempotencyKey,
          claimToken: claim.claimToken,
          intent,
          state: "pending",
          reason: "enqueue-failed",
          errorCode: "FINANCE_DURABLE_OUTCOME_INVALID",
        });
      }

      if (durableResult.data.outcome !== "enqueued") {
        return releaseClaimAfterFailure({
          outboxEventId: intent.outboxEventId,
          idempotencyKey,
          claimToken: claim.claimToken,
          intent,
          state: "pending",
          reason: "enqueue-failed",
          errorCode: "FINANCE_DURABLE_OUTCOME_UNSUPPORTED",
        });
      }

      const receipt = freezeDeep(
        historicalPrivateEvidenceProjectorReceiptSchema.parse({
          outboxEventId: intent.outboxEventId,
          auditEventId: intent.auditEventId,
          auditReceiptId: intent.auditReceiptId,
          objectId: intent.objectId,
          scope: intent.scope,
          authorizationEvidence: intent.authorizationEvidence,
          policyVersion: intent.authorizationEvidence.policyVersion,
          idempotencyKey,
          jobId: durableResult.data.jobId,
        }),
      );
      let bindOutput: unknown;
      try {
        bindOutput = await bindReceipt({
          claimToken: claim.claimToken,
          receipt,
        });
      } catch {
        return releaseClaimAfterFailure({
          outboxEventId: intent.outboxEventId,
          idempotencyKey,
          claimToken: claim.claimToken,
          intent,
          state: "reconcile",
          receipt,
          reason: "bind-failed",
          errorCode: "FINANCE_PROJECTOR_BIND_FAILED",
        });
      }
      const parsedBindOutput = parseBindOutput(bindOutput);
      if (parsedBindOutput.kind === "ownership-lost-invalid") {
        throw projectorError("FINANCE_PROJECTOR_BIND_RESULT_INVALID");
      }
      if (parsedBindOutput.kind === "invalid") {
        return releaseClaimAfterFailure({
          outboxEventId: intent.outboxEventId,
          idempotencyKey,
          claimToken: claim.claimToken,
          intent,
          state: "reconcile",
          receipt,
          reason: "bind-failed",
          errorCode: "FINANCE_PROJECTOR_BIND_RESULT_INVALID",
        });
      }
      const bindResult = parsedBindOutput.data;
      if (
        bindResult.status === "stale" ||
        (bindResult.status === "conflict" &&
          bindResult.reason === "claim-taken-over")
      ) {
        return resolveAuthoritativeBindReceipt(
          bindResult.receipt,
          intent,
          idempotencyKey,
        );
      }
      if (bindResult.status === "conflict") {
        return releaseClaimAfterFailure({
          outboxEventId: intent.outboxEventId,
          idempotencyKey,
          claimToken: claim.claimToken,
          intent,
          state: "reconcile",
          receipt,
          reason: "bind-failed",
          errorCode: "FINANCE_PROJECTOR_BIND_CONFLICT",
        });
      }
      if (bindResult.status === "replay") {
        return resolveAuthoritativeBindReceipt(
          bindResult.receipt,
          intent,
          idempotencyKey,
        );
      }
      return freezeDeep({ status: "accepted" as const, receipt });
    },
  };
}
