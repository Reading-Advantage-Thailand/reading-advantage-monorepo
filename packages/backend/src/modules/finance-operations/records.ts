import { z } from "zod";

import {
  financeAuditEventSchema,
  type FinanceAuditEvent,
  type FinanceAuditPort,
} from "./audit.js";
import {
  classifySourceReplay,
  financeMoneyInputSchema,
  financeOperationAuthorizationInputSchema,
  financeOperationScopeSchema,
  nonBlankStringSchema,
  financeSourceProvenanceSchema,
  type FinanceMoneyInput,
  type FinanceOperationAuthorizationInput,
  type FinanceOperationScope,
  type FinanceSourceProvenance,
} from "./contracts.js";
import type { CompanyIdentityAuthorizationPort } from "./ports.js";

const authorizationDecisionSchema = z.strictObject({
  decision: z.enum(["allow", "deny"]),
});

const financeRecordBaseShape = {
  recordId: nonBlankStringSchema,
  money: financeMoneyInputSchema,
  provenance: financeSourceProvenanceSchema,
} satisfies z.ZodRawShape;

const financeRecordCorrectionShape = {
  supersedesRecordId: nonBlankStringSchema.optional(),
  correctionReason: nonBlankStringSchema.optional(),
} satisfies z.ZodRawShape;

function addCorrectionIssues(
  record: {
    readonly recordId: string;
    readonly supersedesRecordId?: string;
    readonly correctionReason?: string;
  },
  context: z.RefinementCtx,
): void {
  const hasSupersession = record.supersedesRecordId !== undefined;
  const hasReason = record.correctionReason !== undefined;
  if (hasSupersession !== hasReason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [hasSupersession ? "correctionReason" : "supersedesRecordId"],
      message: "Corrections require both a superseded record and a reason",
    });
  }
  if (record.recordId === record.supersedesRecordId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["supersedesRecordId"],
      message: "A correction cannot supersede itself",
    });
  }
}

/** Runtime contract for an import record submitted to an authorized command. */
export const financeRecordInputSchema = z.strictObject(financeRecordBaseShape);

const financeRecordCandidateInputSchema = z
  .strictObject({
    ...financeRecordBaseShape,
    ...financeRecordCorrectionShape,
  })
  .superRefine(addCorrectionIssues);

/** Runtime contract for an accepted, tenant-scoped Finance Operations record. */
export const financeRecordSchema = z
  .strictObject({
    scope: financeOperationScopeSchema,
    ...financeRecordBaseShape,
    ...financeRecordCorrectionShape,
  })
  .superRefine(addCorrectionIssues);

/** Record payload submitted before the authorized command derives its tenant scope. */
export type FinanceRecordInput = Readonly<
  Omit<z.infer<typeof financeRecordInputSchema>, "money" | "provenance"> & {
    readonly money: Readonly<FinanceMoneyInput>;
    readonly provenance: Readonly<FinanceSourceProvenance>;
  }
>;

type FinanceRecordCandidateInput = Readonly<
  Omit<
    z.infer<typeof financeRecordCandidateInputSchema>,
    "money" | "provenance"
  > & {
    readonly money: Readonly<FinanceMoneyInput>;
    readonly provenance: Readonly<FinanceSourceProvenance>;
  }
>;

/** Immutable, tenant-scoped record snapshot stored by Finance Operations. */
export type FinanceRecord = Readonly<
  Omit<
    z.infer<typeof financeRecordSchema>,
    "scope" | "money" | "provenance"
  > & {
    readonly scope: Readonly<FinanceOperationScope>;
    readonly money: Readonly<FinanceMoneyInput>;
    readonly provenance: Readonly<FinanceSourceProvenance>;
  }
>;

/** Tenant-scoped source identity used for idempotent record acceptance. */
export interface FinanceSourceIdentity {
  /** Company that owns the accepted source record. */
  readonly companyId: string;
  /** School sub-scope when the source record belongs to one school. */
  readonly schoolId?: string;
  /** Registered source-system identity. */
  readonly sourceSystem: string;
  /** Version of the source contract. */
  readonly sourceVersion: string;
  /** Stable record identity assigned by the source. */
  readonly sourceRecordId: string;
}

/** Tenant-scoped Finance Operations record lookup identity. */
export interface FinanceRecordIdentity {
  /** Explicit tenant boundary for the lookup. */
  readonly scope: Readonly<FinanceOperationScope>;
  /** Finance Operations record identity within the tenant boundary. */
  readonly recordId: string;
}

/** Atomic repository outcome for a record candidate. */
export type FinanceRecordCompareAndAppendResult =
  | { readonly status: "accepted"; readonly record: FinanceRecord }
  | { readonly status: "existing"; readonly record: FinanceRecord };

/** Append-only persistence boundary for tenant-scoped Finance record snapshots. */
export interface FinanceRecordRepository {
  /**
   * Finds an accepted record without crossing its tenant boundary.
   * @param identity Tenant scope and Finance Operations record identity.
   * @returns The accepted immutable record, or undefined when it is unused.
   */
  findByRecordId(
    identity: FinanceRecordIdentity,
  ): Promise<FinanceRecord | undefined>;

  /**
   * Accepts a record and durable local success-audit event in one transaction.
   * @param record Frozen candidate whose acceptance is being audited.
   * @param audit Frozen succeeded event describing the same record and scope.
   * @returns The accepted candidate or the immutable record that already owns an identity.
   */
  readonly appendWithSuccessAudit: (
    record: FinanceRecord,
    audit: FinanceAuditEvent,
  ) => Promise<FinanceRecordCompareAndAppendResult>;
}

/** Accepted, replayed, or conflicting outcome from a record append request. */
export type FinanceRecordAcceptanceResult =
  | { readonly status: "accepted"; readonly recordId: string }
  | {
      readonly status: "replay";
      readonly acceptedRecordId: string;
    }
  | {
      readonly status: "conflict";
      readonly acceptedRecordId: string;
      readonly reason: "payload-digest-mismatch" | "record-id-conflict";
    };

/** Stable reason an append-only record operation was rejected. */
export type FinanceRecordOperationErrorReason =
  | "authorization-denied"
  | "missing-superseded-record"
  | "superseded-record-mismatch"
  | "self-supersession"
  | "currency-mismatch"
  | "evidence-scope-mismatch"
  | "repository-contract-violation"
  | "repository-scope-mismatch";

/** Structured failure from an append-only Finance Operations record command. */
export class FinanceRecordOperationError extends Error {
  /** Stable machine-readable rejection reason. */
  readonly reason: FinanceRecordOperationErrorReason;

  /**
   * Creates a structured append-only record error.
   * @param reason Stable rejection reason for callers and tests.
   */
  constructor(reason: FinanceRecordOperationErrorReason) {
    super(reason);
    this.name = "FinanceRecordOperationError";
    this.reason = reason;
  }
}

const financeCorrectionInputSchema = z.strictObject({
  operation: z.literal("append-correction"),
  recordId: nonBlankStringSchema,
  supersedesRecordId: nonBlankStringSchema,
  reason: nonBlankStringSchema,
  money: financeMoneyInputSchema,
  provenance: financeSourceProvenanceSchema,
});

/** Validated input for an append-only correction. */
export type FinanceCorrectionInput = Readonly<
  Omit<z.infer<typeof financeCorrectionInputSchema>, "money" | "provenance"> & {
    readonly money: Readonly<FinanceMoneyInput>;
    readonly provenance: Readonly<FinanceSourceProvenance>;
  }
>;

/** Security and audit dependencies required by every financial record command. */
export interface FinanceRecordCommandSecurity {
  /** Requested scope and Company Identity evidence to authorize. */
  readonly authorizationInput: FinanceOperationAuthorizationInput;
  /** Authoritative Company Identity decision boundary. */
  readonly authorizationPort: CompanyIdentityAuthorizationPort;
  /** Durable append-only audit boundary. */
  readonly auditPort: FinanceAuditPort;
  /** Stable request identity used to deduplicate command evidence. */
  readonly requestId: string;
  /** Correlation identity shared by related operations. */
  readonly correlationId: string;
  /** Canonical UTC instant supplied by the application clock adapter. */
  readonly occurredAt: string;
}

type FinanceRecordOperation =
  | "financial-record:import"
  | "financial-record:append-correction";

function sourceIdentity(record: FinanceRecord): FinanceSourceIdentity {
  return {
    companyId: record.scope.companyId,
    ...(record.scope.schoolId === undefined
      ? {}
      : { schoolId: record.scope.schoolId }),
    sourceSystem: record.provenance.sourceSystem,
    sourceVersion: record.provenance.sourceVersion,
    sourceRecordId: record.provenance.sourceRecordId,
  };
}

function scopesMatch(
  left: Readonly<FinanceOperationScope>,
  right: Readonly<FinanceOperationScope>,
): boolean {
  return left.companyId === right.companyId && left.schoolId === right.schoolId;
}

function sourceIdentitiesMatch(
  left: FinanceSourceIdentity,
  right: FinanceSourceIdentity,
): boolean {
  return (
    left.companyId === right.companyId &&
    left.schoolId === right.schoolId &&
    left.sourceSystem === right.sourceSystem &&
    left.sourceVersion === right.sourceVersion &&
    left.sourceRecordId === right.sourceRecordId
  );
}

function recordsMatch(left: FinanceRecord, right: FinanceRecord): boolean {
  return (
    scopesMatch(left.scope, right.scope) &&
    left.recordId === right.recordId &&
    left.money.amountMinor === right.money.amountMinor &&
    left.money.currency === right.money.currency &&
    left.provenance.sourceSystem === right.provenance.sourceSystem &&
    left.provenance.sourceVersion === right.provenance.sourceVersion &&
    left.provenance.sourceRecordId === right.provenance.sourceRecordId &&
    left.provenance.importBatchId === right.provenance.importBatchId &&
    left.provenance.payloadDigest === right.provenance.payloadDigest &&
    left.provenance.evidenceReference === right.provenance.evidenceReference &&
    left.supersedesRecordId === right.supersedesRecordId &&
    left.correctionReason === right.correctionReason
  );
}

function immutableRecord(record: FinanceRecord): FinanceRecord {
  return Object.freeze({
    ...record,
    scope: Object.freeze({ ...record.scope }),
    money: Object.freeze({ ...record.money }),
    provenance: Object.freeze({ ...record.provenance }),
  });
}

function immutableAuditEvent(event: FinanceAuditEvent): FinanceAuditEvent {
  return Object.freeze({
    ...event,
    scope: Object.freeze({ ...event.scope }),
  });
}

function immutableAuthorizationInput(
  input: FinanceOperationAuthorizationInput,
): FinanceOperationAuthorizationInput {
  Object.freeze(input.authorizationEvidence.appRoleIds);
  if (input.authorizationEvidence.schoolIds !== undefined) {
    Object.freeze(input.authorizationEvidence.schoolIds);
  }
  Object.freeze(input.authorizationEvidence);
  Object.freeze(input.scope);
  return Object.freeze(input);
}

function canonicalAuthorizationInput(
  input: FinanceOperationAuthorizationInput,
  operation: FinanceRecordOperation,
): FinanceOperationAuthorizationInput {
  return immutableAuthorizationInput(
    financeOperationAuthorizationInputSchema.parse({
      ...input,
      operation,
    }),
  );
}

function auditObjectId(value: unknown): string {
  const result = z
    .object({ recordId: nonBlankStringSchema })
    .passthrough()
    .safeParse(value);
  return result.success ? result.data.recordId : "unvalidated-financial-record";
}

function evidenceCompanyId(reference: string): string {
  return reference
    .slice("private-evidence://".length)
    .split("/", 1)[0] as string;
}

function createAuditEventId(request: {
  readonly requestId: string;
  readonly authorizationInput: FinanceOperationAuthorizationInput;
  readonly objectId: string;
  readonly outcome: FinanceAuditEvent["outcome"];
}): string {
  const parts = [
    request.requestId,
    request.authorizationInput.operation,
    request.authorizationInput.scope.companyId,
    request.authorizationInput.scope.schoolId ?? "company-scope",
    request.objectId,
    request.outcome,
  ];
  return parts.map((part) => `${part.length}:${part}`).join("|");
}

/** Constructs one immutable audit event from the canonical command context. */
function createAuditEvent(request: {
  readonly auditPort: FinanceAuditPort;
  readonly authorizationInput: FinanceOperationAuthorizationInput;
  readonly objectId: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly outcome: FinanceAuditEvent["outcome"];
}): FinanceAuditEvent {
  const event = financeAuditEventSchema.parse({
    eventId: createAuditEventId(request),
    actorSubjectId: request.authorizationInput.authorizationEvidence.subjectId,
    operation: request.authorizationInput.operation,
    objectType: "financial-record",
    objectId: request.objectId,
    occurredAt: request.occurredAt,
    requestId: request.requestId,
    correlationId: request.correlationId,
    scope: request.authorizationInput.scope,
    outcome: request.outcome,
  });
  return immutableAuditEvent(event);
}

/** Appends one event through the provider-neutral external audit projection port. */
async function appendAuditEvent(request: {
  readonly auditPort: FinanceAuditPort;
  readonly authorizationInput: FinanceOperationAuthorizationInput;
  readonly objectId: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly outcome: FinanceAuditEvent["outcome"];
}): Promise<void> {
  await request.auditPort.append(createAuditEvent(request));
}

async function executeAuthorizedRecordOperation<TResult>(request: {
  readonly security: FinanceRecordCommandSecurity;
  readonly operation: FinanceRecordOperation;
  readonly objectId: string;
  readonly execute: (
    scope: Readonly<FinanceOperationScope>,
    successAudit: FinanceAuditEvent,
  ) => Promise<TResult>;
}): Promise<TResult> {
  const authorizationInput = canonicalAuthorizationInput(
    request.security.authorizationInput,
    request.operation,
  );
  let decision: z.infer<typeof authorizationDecisionSchema>;
  try {
    decision = authorizationDecisionSchema.parse(
      await request.security.authorizationPort.authorizeFinanceOperation(
        authorizationInput,
      ),
    );
  } catch (error) {
    await appendAuditEvent({
      ...request.security,
      authorizationInput,
      objectId: request.objectId,
      outcome: "failed",
    });
    throw error;
  }

  if (decision.decision === "deny") {
    await appendAuditEvent({
      ...request.security,
      authorizationInput,
      objectId: request.objectId,
      outcome: "denied",
    });
    throw new FinanceRecordOperationError("authorization-denied");
  }

  await appendAuditEvent({
    ...request.security,
    authorizationInput,
    objectId: request.objectId,
    outcome: "allowed",
  });

  const successAudit = createAuditEvent({
    ...request.security,
    authorizationInput,
    objectId: request.objectId,
    outcome: "succeeded",
  });
  let result: TResult;
  try {
    result = await request.execute(authorizationInput.scope, successAudit);
  } catch (error) {
    await appendAuditEvent({
      ...request.security,
      authorizationInput,
      objectId: request.objectId,
      outcome: "failed",
    });
    throw error;
  }

  return result;
}

async function compareAndAcceptRecord(request: {
  readonly repository: FinanceRecordRepository;
  readonly scope: Readonly<FinanceOperationScope>;
  readonly record: FinanceRecordCandidateInput;
  readonly successAudit: FinanceAuditEvent;
}): Promise<FinanceRecordAcceptanceResult> {
  const record = financeRecordCandidateInputSchema.parse(request.record);
  if (
    evidenceCompanyId(record.provenance.evidenceReference) !==
    request.scope.companyId
  ) {
    throw new FinanceRecordOperationError("evidence-scope-mismatch");
  }
  const candidate = immutableRecord(
    financeRecordSchema.parse({
      ...record,
      scope: request.scope,
    }),
  );
  const repositoryResult = z
    .discriminatedUnion("status", [
      z.strictObject({
        status: z.literal("accepted"),
        record: financeRecordSchema,
      }),
      z.strictObject({
        status: z.literal("existing"),
        record: financeRecordSchema,
      }),
    ])
    .parse(
      await request.repository.appendWithSuccessAudit(
        candidate,
        request.successAudit,
      ),
    );
  const persistedRecord = immutableRecord(repositoryResult.record);

  if (!scopesMatch(candidate.scope, persistedRecord.scope)) {
    throw new FinanceRecordOperationError("repository-scope-mismatch");
  }

  if (repositoryResult.status === "accepted") {
    if (!recordsMatch(candidate, persistedRecord)) {
      throw new FinanceRecordOperationError("repository-contract-violation");
    }
    return { status: "accepted", recordId: persistedRecord.recordId };
  }

  if (
    sourceIdentitiesMatch(
      sourceIdentity(candidate),
      sourceIdentity(persistedRecord),
    )
  ) {
    const classification = classifySourceReplay({
      existing: persistedRecord,
      incoming: candidate.provenance,
    });
    if (classification.status === "replay") {
      return classification;
    }
    return {
      status: "conflict",
      acceptedRecordId: classification.acceptedRecordId,
      reason: "payload-digest-mismatch",
    };
  }

  if (candidate.recordId === persistedRecord.recordId) {
    return {
      status: "conflict",
      acceptedRecordId: persistedRecord.recordId,
      reason: "record-id-conflict",
    };
  }

  throw new FinanceRecordOperationError("repository-contract-violation");
}

/**
 * Authorizes and atomically accepts a source record within one tenant scope.
 * @param request Record candidate, atomic repository, authorization, and audit dependencies.
 * @returns Accepted, replay, or payload/identity-conflict result.
 * @throws FinanceRecordOperationError when authorization or a repository invariant fails.
 */
export async function acceptFinanceRecord(
  request: FinanceRecordCommandSecurity & {
    readonly repository: FinanceRecordRepository;
    readonly record: FinanceRecordInput;
  },
): Promise<FinanceRecordAcceptanceResult> {
  return executeAuthorizedRecordOperation({
    security: request,
    operation: "financial-record:import",
    objectId: auditObjectId(request.record),
    execute: (scope, successAudit) =>
      compareAndAcceptRecord({
        repository: request.repository,
        scope,
        record: financeRecordInputSchema.parse(request.record),
        successAudit,
      }),
  });
}

/**
 * Authorizes and atomically appends a correction linked to one scoped record.
 * @param request Correction, atomic repository, authorization, and audit dependencies.
 * @returns Accepted, replay, or conflict result for the correction append.
 * @throws FinanceRecordOperationError when authorization or supersession is invalid.
 */
export async function appendFinanceCorrection(
  request: FinanceRecordCommandSecurity & {
    readonly repository: FinanceRecordRepository;
    readonly correction: FinanceCorrectionInput;
  },
): Promise<FinanceRecordAcceptanceResult> {
  return executeAuthorizedRecordOperation({
    security: request,
    operation: "financial-record:append-correction",
    objectId: auditObjectId(request.correction),
    execute: async (scope, successAudit) => {
      const correction = financeCorrectionInputSchema.parse(request.correction);
      const supersededRecord = await request.repository.findByRecordId({
        scope,
        recordId: correction.supersedesRecordId,
      });
      if (supersededRecord === undefined) {
        throw new FinanceRecordOperationError("missing-superseded-record");
      }
      const validatedSupersededRecord =
        financeRecordSchema.parse(supersededRecord);
      if (!scopesMatch(scope, validatedSupersededRecord.scope)) {
        throw new FinanceRecordOperationError("repository-scope-mismatch");
      }
      if (correction.recordId === correction.supersedesRecordId) {
        throw new FinanceRecordOperationError("self-supersession");
      }
      if (
        correction.supersedesRecordId !== validatedSupersededRecord.recordId
      ) {
        throw new FinanceRecordOperationError("superseded-record-mismatch");
      }
      if (
        correction.money.currency !== validatedSupersededRecord.money.currency
      ) {
        throw new FinanceRecordOperationError("currency-mismatch");
      }

      return compareAndAcceptRecord({
        repository: request.repository,
        scope,
        record: {
          recordId: correction.recordId,
          money: correction.money,
          provenance: correction.provenance,
          supersedesRecordId: correction.supersedesRecordId,
          correctionReason: correction.reason,
        },
        successAudit,
      });
    },
  });
}
