import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

import type { FinanceAuditEvent, FinanceAuditPort } from "../audit.js";
import type {
  FinanceAuthorizationEvidence,
  FinanceOperationAuthorizationInput,
  FinanceOperationScope,
} from "../contracts.js";
import type {
  DurableJobInput,
  PrivateEvidenceSnapshot,
} from "../port-contracts.js";
import type { CompanyIdentityAuthorizationPort } from "../ports.js";
import type { FinanceRecord } from "../records.js";

const CONTROLLED_IMPORTS_PATH = resolve(
  import.meta.dirname,
  "../controlled-imports.ts",
);
const FINANCE_OPERATIONS_DIRECTORY = resolve(import.meta.dirname, "..");
const ENVELOPE_VERSION = "finance-controlled-source-envelope-v1" as const;
const NORMALIZATION_VERSION =
  "finance-controlled-import-normalization-v1" as const;
const DURABLE_JOB_VERSION = "finance-controlled-import-job-v1" as const;
const DEFERRED_SOURCE_OWNER_MARKERS = [
  "CustomerBillingCatalogPort",
  "TutorFinancialExportPort",
  "crm-customer-billing-catalog",
  "tutor-financial-export",
] as const;

/** One source-faithful fact retained from a sanitized document extraction. */
interface PreparedControlledImportFact {
  readonly factId: string;
  readonly kind: "count" | "money" | "source-text";
  readonly amountMinor?: string;
  readonly currency?: string;
  readonly count?: string;
  readonly sourceText?: string;
  readonly voucherNumberText?: string;
  readonly sourceDateText?: string;
  readonly moneyKind?: "gross" | "source-stated-wht" | "net";
  readonly provenance: {
    readonly sourceSystem: string;
    readonly sourceVersion: string;
    readonly sourceRecordId: string;
    readonly importBatchId: string;
    readonly payloadDigest: string;
    readonly evidenceReference: string;
  };
}

/** Immutable policy-neutral snapshot of one sanitized source document. */
interface PreparedControlledSourceSnapshot {
  readonly sourceDocumentId: string;
  readonly logicalDocumentId: string;
  readonly sourceDocumentKind:
    | "school-billing-invoice"
    | "payroll-summary"
    | "payment-receipt"
    | "foreign-workspace-invoice";
  readonly variantId?: string;
  readonly thaiTaxDocumentStatus: "not-source-asserted" | "unresolved";
  readonly sourceStatedTax?: Readonly<{
    readonly label: string;
    readonly rateText: string;
  }>;
  readonly facts: readonly PreparedControlledImportFact[];
}

/** Result of pre-adapter normalization without choosing between ambiguous sources. */
type PreparedControlledImportBatch =
  | {
      readonly status: "ready";
      readonly normalizationVersion: typeof NORMALIZATION_VERSION;
      readonly scope: Readonly<FinanceOperationScope>;
      readonly batchId: string;
      readonly batchDigest: string;
      readonly snapshots: readonly PreparedControlledSourceSnapshot[];
      readonly records: readonly FinanceRecord[];
    }
  | {
      readonly status: "unresolved";
      readonly normalizationVersion: typeof NORMALIZATION_VERSION;
      readonly reason: "source-variant-ambiguity";
      readonly scope: Readonly<FinanceOperationScope>;
      readonly batchId: string;
      readonly variants: readonly PreparedControlledSourceSnapshot[];
      readonly records: readonly [];
    };

/** Sanitized decimal money fact accepted by the normalization boundary. */
interface ControlledMoneyFactInput {
  readonly factId: string;
  readonly kind: "money";
  readonly amountDecimal: string;
  readonly sourceText?: string;
}

/** Sanitized integral count fact accepted by the normalization boundary. */
interface ControlledCountFactInput {
  readonly factId: string;
  readonly kind: "count";
  readonly countText: string;
}

/** Sanitized source payroll voucher with source-stated labels only. */
interface ControlledPayrollVoucherInput {
  readonly voucherNumberText: string;
  readonly sourceDateText: string;
  readonly grossDecimal: string;
  readonly sourceStatedWhtDecimal: string;
  readonly netDecimal: string;
}

/** Strict normalized source-document input; it intentionally has no raw payload. */
type ControlledSourceDocumentInput =
  | {
      readonly sourceDocumentId: string;
      readonly logicalDocumentId: string;
      readonly sourceDocumentKind: "school-billing-invoice";
      readonly variantId?: string;
      readonly ambiguityGroupId?: string;
      readonly thaiTaxDocumentStatus: "unresolved";
      readonly currency: string;
      readonly facts: readonly (
        | ControlledMoneyFactInput
        | ControlledCountFactInput
      )[];
    }
  | {
      readonly sourceDocumentId: string;
      readonly logicalDocumentId: string;
      readonly sourceDocumentKind: "payroll-summary";
      readonly thaiTaxDocumentStatus: "unresolved";
      readonly currency: string;
      readonly vouchers: readonly ControlledPayrollVoucherInput[];
    }
  | {
      readonly sourceDocumentId: string;
      readonly logicalDocumentId: string;
      readonly sourceDocumentKind: "payment-receipt";
      readonly thaiTaxDocumentStatus: "not-source-asserted" | "unresolved";
      readonly currency: string;
      readonly facts: readonly ControlledMoneyFactInput[];
    }
  | {
      readonly sourceDocumentId: string;
      readonly logicalDocumentId: string;
      readonly sourceDocumentKind: "foreign-workspace-invoice";
      readonly thaiTaxDocumentStatus: "not-source-asserted";
      readonly sourceStatedTax: Readonly<{
        readonly label: string;
        readonly rateText: string;
      }>;
      readonly currency: string;
      readonly facts: readonly ControlledMoneyFactInput[];
    };

/** Receipt proving which existing provider-neutral source port accepted a snapshot. */
type AcceptedSourcePortReceipt = {
  readonly port: "private-evidence-storage";
  readonly snapshot: Readonly<PrivateEvidenceSnapshot>;
};

/** Real Phase 1 command boundary used to obtain trusted preparation evidence. */
interface TrustedPreparationCommand {
  prepare(input: unknown): Promise<unknown>;
}

/** Minimum Company Identity request observed by the trusted-preparation fake. */
interface TrustedAttestationRequest {
  readonly scope: FinanceOperationScope;
}

/** Minimum private-evidence binding request observed by the trusted fake. */
interface TrustedEvidenceBindingRequest {
  readonly evidenceReference: string;
  readonly scope: FinanceOperationScope;
  readonly expectedPayloadDigest: string;
}

/** Versioned envelope accepted before provider-neutral source data is normalized. */
interface AcceptedControlledSourceEnvelope {
  readonly envelopeVersion: typeof ENVELOPE_VERSION;
  readonly scope: Readonly<FinanceOperationScope>;
  readonly sourceSystem: string;
  readonly sourceVersion: string;
  readonly sourceRecordId: string;
  readonly sourceAcceptance: AcceptedSourcePortReceipt;
  readonly evidenceAuthorization: Readonly<PrivateEvidenceSnapshot>;
  readonly document: ControlledSourceDocumentInput;
}

/** Immutable accepted batch identity used to distinguish replay from conflict. */
interface AcceptedControlledImportBatch {
  readonly scope: Readonly<FinanceOperationScope>;
  readonly sourceSystem: string;
  readonly sourceVersion: string;
  readonly importBatchId: string;
  readonly batchDigest: string;
  readonly acceptedRecordIds: readonly string[];
}

/** Replay classification for a previously accepted controlled import identity. */
type ControlledImportReplayResult =
  | {
      readonly status: "replay";
      readonly acceptedRecordIds: readonly string[];
    }
  | {
      readonly status: "conflict";
      readonly acceptedRecordIds: readonly string[];
      readonly reason:
        | "scope-mismatch"
        | "source-system-mismatch"
        | "source-version-mismatch"
        | "import-batch-id-mismatch"
        | "payload-digest-mismatch";
    };

/** Versioned durable job intent compatible with the existing durable-job port. */
interface ControlledImportDurableJobIntent extends DurableJobInput {
  readonly jobContractVersion: typeof DURABLE_JOB_VERSION;
  readonly operation: "controlled-import:apply-batch";
}

/** Result returned from the one atomic controlled-import repository seam. */
type ControlledImportAtomicResult =
  | { readonly status: "accepted"; readonly recordIds: readonly string[] }
  | { readonly status: "replay"; readonly recordIds: readonly string[] }
  | {
      readonly status: "conflict";
      readonly recordIds: readonly string[];
      readonly reason: "payload-digest-mismatch";
    };

/** Single atomic persistence seam for records, a durable job, and audit evidence. */
interface ControlledImportAtomicRepository {
  /** Applies one immutable batch and appends its outcome audit transactionally. */
  applyBatchAtomically(input: {
    readonly plan: Extract<PreparedControlledImportBatch, { status: "ready" }>;
    readonly durableJob: Readonly<ControlledImportDurableJobIntent>;
    readonly audit: Readonly<FinanceAuditEvent>;
  }): Promise<ControlledImportAtomicResult>;
}

/** Dependencies and canonical context for accepting one prepared import batch. */
interface AcceptControlledImportBatchRequest {
  readonly plan: Extract<PreparedControlledImportBatch, { status: "ready" }>;
  readonly authorizationInput: FinanceOperationAuthorizationInput;
  readonly authorizationPort: CompanyIdentityAuthorizationPort;
  readonly auditPort: FinanceAuditPort;
  readonly repository: ControlledImportAtomicRepository;
  readonly requestId: string;
  readonly correlationId: string;
  readonly occurredAt: string;
}

/** Future production exports required by the Phase 2 RED contract. */
interface ControlledImportsModule {
  prepareControlledImportBatch(input: unknown): PreparedControlledImportBatch;
  createHistoricalPrivateEvidenceImportCommand(
    input: unknown,
  ): TrustedPreparationCommand;
  classifyControlledImportBatchReplay(input: {
    readonly existing: AcceptedControlledImportBatch;
    readonly incoming: Omit<AcceptedControlledImportBatch, "acceptedRecordIds">;
  }): ControlledImportReplayResult;
  prepareControlledImportCorrection(input: {
    readonly acceptedRecord: FinanceRecord;
    readonly correctionRecordId: string;
    readonly reason: string;
    readonly money: FinanceRecord["money"];
    readonly provenance: FinanceRecord["provenance"];
  }): FinanceRecord;
  createControlledImportJobIdentity(input: {
    readonly scope: Readonly<FinanceOperationScope>;
    readonly batchId: string;
  }): string;
  acceptControlledImportBatch(
    request: AcceptControlledImportBatchRequest,
  ): Promise<ControlledImportAtomicResult>;
  readonly runHistoricalPrivateEvidencePilot?: (input: unknown) => Promise<{
    readonly status: "not-admitted" | "blocked";
    readonly packetVersion: "historical-private-evidence-packet.v1";
    readonly liveSourceAdaptersUsed: readonly [];
  }>;
}

const scope = deepFreeze({
  companyId: "company-sanitized",
  schoolId: "school-sanitized",
});
const companyOnlyScope = deepFreeze({ companyId: "company-sanitized" });
const authorizationEvidence: FinanceAuthorizationEvidence = deepFreeze({
  source: "company-identity" as const,
  claimsVersion: "company-claims-v1",
  subjectId: "employee-sanitized",
  organizationId: scope.companyId,
  appRoleIds: ["finance-import-operator"],
  schoolIds: [scope.schoolId],
});
const authorizationInput: FinanceOperationAuthorizationInput = deepFreeze({
  operation: "controlled-import:untrusted-caller-value",
  scope,
  authorizationEvidence,
});
const canonicalOccurredAt = "2026-08-11T01:02:03.456Z";

/** Recursively freezes a test fixture so aliasing and mutation are observable. */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Asserts that an entire returned object graph is frozen. */
function expectDeepFrozen(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeepFrozen(child, seen);
}

/** Loads the existing Finance barrel as the future controlled-import export boundary. */
async function loadControlledImports(): Promise<ControlledImportsModule> {
  return (await import("../index.js")) as unknown as ControlledImportsModule;
}

/** Fails one RED test with the exact production export it requires. */
function requireFunction(value: unknown, exportName: string): void {
  expect(
    value,
    `Finance Operations must export ${exportName} for controlled imports`,
  ).toBeTypeOf("function");
}

/** Produces a stable, delimiter-safe identity expected from the future job helper. */
function expectedJobIdentity(
  jobScope: Readonly<FinanceOperationScope>,
  batchId: string,
): string {
  const encode = (value: string): string => `${value.length}:${value}`;
  const school =
    jobScope.schoolId === undefined
      ? "school=none"
      : `school=some:${encode(jobScope.schoolId)}`;
  return [
    DURABLE_JOB_VERSION,
    `company=${encode(jobScope.companyId)}`,
    school,
    `batch=${encode(batchId)}`,
  ].join("|");
}

/** Produces the immutable audit identity expected for one controlled-import outcome. */
function expectedAuditEventId(input: {
  readonly requestId: string;
  readonly outcome: FinanceAuditEvent["outcome"];
}): string {
  const parts = [
    input.requestId,
    "controlled-import:accept-batch",
    scope.companyId,
    scope.schoolId ?? "company-scope",
    "controlled-import-batch-001",
    input.outcome,
  ];
  return parts.map((part) => `${part.length}:${part}`).join("|");
}

/** Creates the evidence metadata required for every accepted source envelope. */
function evidenceSnapshot(
  evidenceReference: string,
  payloadDigest: string,
): Readonly<PrivateEvidenceSnapshot> {
  return deepFreeze({ evidenceReference, payloadDigest });
}

/** Wraps a sanitized document in an accepted private-evidence port receipt. */
function privateEvidenceEnvelope(input: {
  readonly document: ControlledSourceDocumentInput;
  readonly sourceSystem: string;
  readonly sourceVersion?: string;
  readonly sourceRecordId?: string;
  readonly payloadDigest: string;
  readonly evidenceReference: string;
  readonly envelopeScope?: Readonly<FinanceOperationScope>;
}): AcceptedControlledSourceEnvelope {
  const acceptedEvidence = evidenceSnapshot(
    input.evidenceReference,
    input.payloadDigest,
  );
  return {
    envelopeVersion: ENVELOPE_VERSION,
    scope: input.envelopeScope ?? scope,
    sourceSystem: input.sourceSystem,
    sourceVersion: input.sourceVersion ?? "source-v1",
    sourceRecordId: input.sourceRecordId ?? input.document.sourceDocumentId,
    sourceAcceptance: {
      port: "private-evidence-storage",
      snapshot: acceptedEvidence,
    },
    evidenceAuthorization: acceptedEvidence,
    document: input.document,
  };
}

/** Creates trusted preparation through the real Phase 1 command boundary. */
async function trustedPreparationForEnvelope(
  subject: ControlledImportsModule,
  envelope: AcceptedControlledSourceEnvelope,
): Promise<unknown> {
  const createCommand = subject.createHistoricalPrivateEvidenceImportCommand;
  expect(createCommand).toBeTypeOf("function");
  const attest = vi.fn(async (input: TrustedAttestationRequest) => ({
    decision: "allow" as const,
    evidence: {
      source: "company-identity" as const,
      claimsVersion: "company-identity-claims-v1",
      policyVersion: "finance-historical-import-role-policy-v1",
      subjectId: "employee-importer",
      organizationId: input.scope.companyId,
      appRoleIds: ["role-historical-private-evidence-import"],
      ...(input.scope.schoolId === undefined
        ? {}
        : { schoolIds: [input.scope.schoolId] }),
    },
  }));
  const verify = vi.fn(async (input: TrustedEvidenceBindingRequest) => ({
    evidenceReference: input.evidenceReference,
    scope: input.scope,
    payloadDigest: input.expectedPayloadDigest,
  }));
  const command = createCommand({
    companyIdentityAttestor: { attest },
    privateEvidenceBindingPort: { verify },
  });
  const preparation = await command.prepare({
    packet: {
      packetVersion: "historical-private-evidence-packet.v1",
      scope: envelope.scope,
      source: {
        sourceSystem: envelope.sourceSystem,
        sourceVersion: envelope.sourceVersion,
        sourceIdentity: envelope.sourceRecordId,
        payloadDigest: envelope.evidenceAuthorization.payloadDigest,
        evidenceReference: envelope.evidenceAuthorization.evidenceReference,
      },
      facts: [
        {
          factCategory: "document-total",
          factId: "document-total:receipt-total",
          kind: "source-stated-value",
          label: "Receipt total as stated",
          value: "100.00",
        },
      ],
    },
    credential: { kind: "token", value: "owner-token" },
    audit: {
      eventId: "finance-attestation-event-001",
      objectId: "historical-private-evidence-packet-001",
      occurredAt: "2026-08-13T01:02:03.000Z",
      requestId: "finance-import-request-001",
      correlationId: "finance-import-correlation-001",
    },
  });
  expect(attest).toHaveBeenCalledTimes(1);
  expect(verify).toHaveBeenCalledTimes(1);
  expect(preparation).toMatchObject({
    packet: {
      packetVersion: "historical-private-evidence-packet.v1",
      scope: envelope.scope,
      source: {
        sourceSystem: envelope.sourceSystem,
        sourceVersion: envelope.sourceVersion,
        sourceIdentity: envelope.sourceRecordId,
        payloadDigest: envelope.evidenceAuthorization.payloadDigest,
        evidenceReference: envelope.evidenceAuthorization.evidenceReference,
      },
    },
    evidence: {
      evidenceReference: envelope.evidenceAuthorization.evidenceReference,
      scope: envelope.scope,
      payloadDigest: envelope.evidenceAuthorization.payloadDigest,
    },
  });
  return preparation;
}

/** Creates one normalized input with accepted envelopes and genuine preparation artifacts. */
function normalizationInput(
  batchId: string,
  acceptedSourceEnvelopes: readonly AcceptedControlledSourceEnvelope[],
  inputScope: Readonly<FinanceOperationScope> = scope,
  trustedPreparations: readonly unknown[] = [],
): Readonly<{
  normalizationVersion: typeof NORMALIZATION_VERSION;
  scope: Readonly<FinanceOperationScope>;
  batchId: string;
  acceptedSourceEnvelopes: readonly AcceptedControlledSourceEnvelope[];
  readonly trustedPreparation?: unknown;
  readonly trustedPreparations?: readonly unknown[];
}> {
  return {
    normalizationVersion: NORMALIZATION_VERSION,
    scope: inputScope,
    batchId,
    acceptedSourceEnvelopes,
    ...(trustedPreparations.length === 1
      ? { trustedPreparation: trustedPreparations[0] }
      : trustedPreparations.length > 1
        ? { trustedPreparations }
        : {}),
  };
}

/** Creates a normalization request from real Phase 1 preparations. */
async function trustedNormalizationInput(
  subject: ControlledImportsModule,
  batchId: string,
  acceptedSourceEnvelopes: readonly AcceptedControlledSourceEnvelope[],
  inputScope: Readonly<FinanceOperationScope> = scope,
  preparationEnvelopes: readonly AcceptedControlledSourceEnvelope[] = acceptedSourceEnvelopes,
): Promise<
  Readonly<{
    normalizationVersion: typeof NORMALIZATION_VERSION;
    scope: Readonly<FinanceOperationScope>;
    batchId: string;
    acceptedSourceEnvelopes: readonly AcceptedControlledSourceEnvelope[];
    readonly trustedPreparation?: unknown;
    readonly trustedPreparations?: readonly unknown[];
  }>
> {
  const trustedPreparations = await Promise.all(
    preparationEnvelopes.map((envelope) =>
      trustedPreparationForEnvelope(subject, envelope),
    ),
  );
  return normalizationInput(
    batchId,
    acceptedSourceEnvelopes,
    inputScope,
    trustedPreparations,
  );
}

/** Produces one deeply frozen valid prepared plan for command tests. */
function readyPlan(
  overrides: {
    readonly scope?: Readonly<FinanceOperationScope>;
    readonly batchId?: string;
    readonly batchDigest?: string;
    readonly recordId?: string;
    readonly amountMinor?: string;
  } = {},
): Extract<PreparedControlledImportBatch, { status: "ready" }> {
  const planScope = overrides.scope ?? scope;
  const batchId = overrides.batchId ?? "controlled-import-batch-001";
  const record: FinanceRecord = {
    scope: planScope,
    recordId: overrides.recordId ?? "controlled-import-record-001",
    money: {
      amountMinor: overrides.amountMinor ?? "13230000",
      currency: "THB",
    },
    provenance: {
      sourceSystem: "owner-attested-archive",
      sourceVersion: "archive-v1",
      sourceRecordId: "PA-INV-2026-001#net",
      importBatchId: batchId,
      payloadDigest: "a".repeat(64),
      evidenceReference:
        "private-evidence://company-sanitized/finance/sanitized/pa-inv-2026-001",
    },
  };
  return deepFreeze({
    status: "ready" as const,
    normalizationVersion: NORMALIZATION_VERSION,
    scope: planScope,
    batchId,
    batchDigest: overrides.batchDigest ?? "b".repeat(64),
    snapshots: [],
    records: [record],
  });
}

/** Creates an audit port double that retains appended command evidence. */
function auditPortDouble(): {
  readonly events: FinanceAuditEvent[];
  readonly port: FinanceAuditPort;
} {
  const events: FinanceAuditEvent[] = [];
  return {
    events,
    port: {
      append: async (event) => {
        events.push(event);
        return deepFreeze({
          eventId: event.eventId,
          receiptId: `receipt-${event.eventId}`,
        });
      },
    },
  };
}

/** Creates a reusable provider-neutral allowing authorization port. */
function allowingAuthorizationPort(): CompanyIdentityAuthorizationPort {
  return {
    authorizeFinanceOperation: vi.fn(async () => ({
      decision: "allow" as const,
    })),
  };
}

/** Promise barrier used to release concurrent fake repository calls together. */
function createBarrier(parties: number): {
  readonly arrive: () => Promise<void>;
} {
  let arrived = 0;
  let release: (() => void) | undefined;
  const opened = new Promise<void>((resolveOpened) => {
    release = resolveOpened;
  });
  return {
    arrive: async () => {
      arrived += 1;
      if (arrived === parties) release?.();
      await opened;
    },
  };
}

/** In-memory transaction fake with staging, failpoints, and one commit point. */
function createAtomicRepositoryFake(
  options: {
    readonly failAt?: "record" | "job" | "audit";
    readonly barrier?: { readonly arrive: () => Promise<void> };
  } = {},
): {
  readonly repository: ControlledImportAtomicRepository;
  readonly records: FinanceRecord[];
  readonly jobs: ControlledImportDurableJobIntent[];
  readonly audits: FinanceAuditEvent[];
  readonly accepted: ReadonlyMap<
    string,
    Readonly<{
      batchDigest: string;
      recordIds: readonly string[];
    }>
  >;
  readonly returnedResults: ControlledImportAtomicResult[];
  readonly receivedInputs: Array<{
    readonly plan: Extract<PreparedControlledImportBatch, { status: "ready" }>;
    readonly durableJob: Readonly<ControlledImportDurableJobIntent>;
    readonly audit: Readonly<FinanceAuditEvent>;
  }>;
} {
  const records: FinanceRecord[] = [];
  const jobs: ControlledImportDurableJobIntent[] = [];
  const audits: FinanceAuditEvent[] = [];
  const accepted = new Map<
    string,
    Readonly<{ batchDigest: string; recordIds: readonly string[] }>
  >();
  const returnedResults: ControlledImportAtomicResult[] = [];
  const receivedInputs: Array<{
    readonly plan: Extract<PreparedControlledImportBatch, { status: "ready" }>;
    readonly durableJob: Readonly<ControlledImportDurableJobIntent>;
    readonly audit: Readonly<FinanceAuditEvent>;
  }> = [];

  return {
    records,
    jobs,
    audits,
    accepted,
    returnedResults,
    receivedInputs,
    repository: {
      applyBatchAtomically: async (input) => {
        receivedInputs.push(input);
        await options.barrier?.arrive();
        const identity = expectedJobIdentity(
          input.plan.scope,
          input.plan.batchId,
        );
        const prior = accepted.get(identity);
        const stagedAudit = deepFreeze(structuredClone(input.audit));

        if (prior !== undefined) {
          if (options.failAt === "audit") throw new Error("audit-stage-failed");
          audits.push(stagedAudit);
          const result: ControlledImportAtomicResult =
            prior.batchDigest === input.plan.batchDigest
              ? { status: "replay", recordIds: [...prior.recordIds] }
              : {
                  status: "conflict",
                  recordIds: [...prior.recordIds],
                  reason: "payload-digest-mismatch",
                };
          returnedResults.push(result);
          return result;
        }

        const stagedRecords = input.plan.records.map((record) =>
          deepFreeze(structuredClone(record)),
        );
        if (options.failAt === "record") throw new Error("record-stage-failed");
        const stagedJob = deepFreeze(structuredClone(input.durableJob));
        if (options.failAt === "job") throw new Error("job-stage-failed");
        if (options.failAt === "audit") throw new Error("audit-stage-failed");

        records.push(...stagedRecords);
        jobs.push(stagedJob);
        audits.push(stagedAudit);
        const acceptedBatch = deepFreeze({
          batchDigest: input.plan.batchDigest,
          recordIds: stagedRecords.map((record) => record.recordId),
        });
        accepted.set(identity, acceptedBatch);
        const result: ControlledImportAtomicResult = {
          status: "accepted",
          recordIds: [...acceptedBatch.recordIds],
        };
        returnedResults.push(result);
        return result;
      },
    },
  };
}

/** Returns every forbidden finance-policy or sensitive-data key in an output. */
function collectForbiddenKeys(value: unknown): string[] {
  const forbidden = new Set([
    "accountCode",
    "accountNumber",
    "bankAccount",
    "bankAccountNumber",
    "deductible",
    "email",
    "expenseCategory",
    "ledgerAccount",
    "name",
    "rawPayload",
    "taxAmount",
    "taxId",
    "thaiTaxInvoice",
    "vat",
    "vatRate",
    "withholdingRate",
  ]);
  const found: string[] = [];
  const visit = (candidate: unknown): void => {
    if (candidate === null || typeof candidate !== "object") return;
    for (const [key, child] of Object.entries(candidate)) {
      if (forbidden.has(key)) found.push(key);
      visit(child);
    }
  };
  visit(value);
  return found;
}

/** Asserts the complete policy-neutral output grammar, including nested facts. */
function expectStrictPolicyNeutralOutput(input: {
  readonly snapshots: readonly PreparedControlledSourceSnapshot[];
  readonly records: readonly FinanceRecord[];
}): void {
  const snapshotKeys = new Set([
    "facts",
    "logicalDocumentId",
    "sourceDocumentId",
    "sourceDocumentKind",
    "sourceStatedTax",
    "thaiTaxDocumentStatus",
    "variantId",
  ]);
  const factKeys = new Set([
    "amountMinor",
    "count",
    "currency",
    "factId",
    "kind",
    "moneyKind",
    "provenance",
    "sourceDateText",
    "sourceText",
    "voucherNumberText",
  ]);
  const provenanceKeys = new Set([
    "evidenceReference",
    "importBatchId",
    "payloadDigest",
    "sourceRecordId",
    "sourceSystem",
    "sourceVersion",
  ]);
  for (const snapshot of input.snapshots) {
    expect(
      Object.keys(snapshot).every((key) => snapshotKeys.has(key)),
      `unexpected normalized snapshot key in ${snapshot.sourceDocumentId}`,
    ).toBe(true);
    if (snapshot.sourceStatedTax !== undefined) {
      expect(Object.keys(snapshot.sourceStatedTax).sort()).toEqual([
        "label",
        "rateText",
      ]);
    }
    for (const fact of snapshot.facts) {
      expect(
        Object.keys(fact).every((key) => factKeys.has(key)),
        `unexpected normalized fact key in ${fact.factId}`,
      ).toBe(true);
      expect(Object.keys(fact.provenance).sort()).toEqual(
        [...provenanceKeys].sort(),
      );
    }
  }
  for (const record of input.records) {
    expect(Object.keys(record).sort()).toEqual([
      "money",
      "provenance",
      "recordId",
      "scope",
    ]);
    expect(Object.keys(record.money).sort()).toEqual([
      "amountMinor",
      "currency",
    ]);
    expect(Object.keys(record.provenance).sort()).toEqual(
      [...provenanceKeys].sort(),
    );
  }
  expect(collectForbiddenKeys(input)).toEqual([]);
}

/** Describes one compiler-AST architecture boundary violation. */
interface BoundaryViolation {
  readonly kind: string;
  readonly detail: string;
}

/** Collects provider, database, runtime, and unbounded dynamic access via TypeScript AST. */
function collectControlledImportBoundaryViolations(
  fileName: string,
  sourceText: string,
): BoundaryViolation[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const violations: BoundaryViolation[] = [];
  const providerOrDatabasePackages = [
    "@aws-sdk/",
    "@google-cloud/",
    "@reading-advantage/db",
    "drizzle-orm",
    "firebase-admin",
    "googleapis",
    "postgres",
  ];
  const inspectSpecifier = (specifier: ts.Expression): void => {
    if (!ts.isStringLiteralLike(specifier)) {
      violations.push({ kind: "dynamic-import", detail: specifier.getText() });
      return;
    }
    const value = specifier.text;
    if (value === "zod") return;
    if (value.startsWith(".")) {
      const resolvedImport = resolve(dirname(fileName), value);
      const relativeToFinance = relative(
        FINANCE_OPERATIONS_DIRECTORY,
        resolvedImport,
      );
      if (
        relativeToFinance === ".." ||
        relativeToFinance.startsWith(`..${sep}`) ||
        isAbsolute(relativeToFinance)
      ) {
        violations.push({ kind: "import-escape", detail: value });
      }
      return;
    }
    violations.push({
      kind: providerOrDatabasePackages.some(
        (candidate) => value === candidate || value.startsWith(candidate),
      )
        ? "import"
        : "unapproved-import",
      detail: value,
    });
  };
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined
    ) {
      inspectSpecifier(node.moduleSpecifier);
    }
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const [specifier] = node.arguments;
        if (specifier === undefined) {
          violations.push({ kind: "dynamic-import", detail: "missing" });
        } else {
          inspectSpecifier(specifier);
        }
      }
      if (
        ts.isIdentifier(node.expression) &&
        ["fetch", "require"].includes(node.expression.text)
      ) {
        violations.push({
          kind: "runtime-access",
          detail: node.expression.text,
        });
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        [
          "delete",
          "execute",
          "insert",
          "query",
          "select",
          "transaction",
          "update",
        ].includes(node.expression.name.text)
      ) {
        violations.push({
          kind: "database-call",
          detail: node.expression.name.text,
        });
      }
      if (
        ts.isElementAccessExpression(node.expression) &&
        node.expression.argumentExpression !== undefined &&
        ts.isStringLiteralLike(node.expression.argumentExpression) &&
        [
          "delete",
          "execute",
          "insert",
          "query",
          "select",
          "transaction",
          "update",
        ].includes(node.expression.argumentExpression.text)
      ) {
        violations.push({
          kind: "database-call",
          detail: node.expression.argumentExpression.text,
        });
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ["fetch", "WebSocket", "XMLHttpRequest"].includes(
          node.expression.name.text,
        )
      ) {
        violations.push({
          kind: "runtime-access",
          detail: node.expression.name.text,
        });
      }
    }
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ["WebSocket", "XMLHttpRequest"].includes(node.expression.text)
    ) {
      violations.push({ kind: "runtime-access", detail: node.expression.text });
    }
    if (
      ts.isIdentifier(node) &&
      ["process", "Bun", "Deno"].includes(node.text)
    ) {
      violations.push({ kind: "runtime-global", detail: node.text });
    }
    if (
      ts.isTaggedTemplateExpression(node) &&
      ts.isIdentifier(node.tag) &&
      node.tag.text === "sql"
    ) {
      violations.push({ kind: "raw-sql", detail: "sql" });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return violations;
}

/** Collects deferred source-owner markers from a Finance-controlled-import AST. */
function collectDeferredSourceOwnerLookalikes(sourceText: string): string[] {
  const sourceFile = ts.createSourceFile(
    CONTROLLED_IMPORTS_PATH,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    const text =
      ts.isIdentifier(node) || ts.isStringLiteralLike(node)
        ? node.text
        : undefined;
    if (
      text !== undefined &&
      DEFERRED_SOURCE_OWNER_MARKERS.includes(
        text as (typeof DEFERRED_SOURCE_OWNER_MARKERS)[number],
      )
    ) {
      found.push(text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

describe("Finance Operations Phase 2 controlled imports", () => {
  it("requires versioned provider-neutral acceptance envelopes before normalization", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.prepareControlledImportBatch,
      "prepareControlledImportBatch",
    );
    const sourceDocument: ControlledSourceDocumentInput = {
      sourceDocumentId: "accepted-source-envelope-test",
      logicalDocumentId: "accepted-source-envelope-test",
      sourceDocumentKind: "payment-receipt",
      thaiTaxDocumentStatus: "not-source-asserted",
      currency: "THB",
      facts: [{ factId: "total", kind: "money", amountDecimal: "1.00" }],
    };
    const evidenceReference =
      "private-evidence://company-sanitized/finance/sanitized/envelope-test";

    const envelopes = [
      privateEvidenceEnvelope({
        document: sourceDocument,
        sourceSystem: "owner-attested-archive",
        sourceVersion: "archive-v1",
        payloadDigest: "1".repeat(64),
        evidenceReference,
      }),
      privateEvidenceEnvelope({
        document: {
          ...sourceDocument,
          sourceDocumentId: "archive-payroll-envelope-test",
        },
        sourceSystem: "sanitized-payroll-summary",
        sourceVersion: "archive-v1",
        sourceRecordId: "archive-payroll-record-sanitized",
        payloadDigest: "2".repeat(64),
        evidenceReference,
      }),
      privateEvidenceEnvelope({
        document: {
          ...sourceDocument,
          sourceDocumentId: "private-envelope-test",
        },
        sourceSystem: "private-evidence-normalized-source",
        payloadDigest: "3".repeat(64),
        evidenceReference,
      }),
    ];

    expect(
      subject.prepareControlledImportBatch(
        await trustedNormalizationInput(
          subject,
          "accepted-envelope-batch",
          envelopes,
        ),
      ),
    ).toMatchObject({
      status: "ready",
      normalizationVersion: NORMALIZATION_VERSION,
    });
    expect(() =>
      subject.prepareControlledImportBatch({
        normalizationVersion: NORMALIZATION_VERSION,
        scope,
        batchId: "direct-unaccepted-source-batch",
        documents: [sourceDocument],
      }),
    ).toThrow();
    const unknownEnvelopeVersion = {
      ...envelopes[0],
      envelopeVersion: "unregistered-envelope-v999",
    } as unknown as AcceptedControlledSourceEnvelope;
    const unknownEnvelopeRequest = await trustedNormalizationInput(
      subject,
      "unknown-envelope-version",
      [unknownEnvelopeVersion],
      scope,
      [envelopes[0]],
    );
    expect(() =>
      subject.prepareControlledImportBatch(unknownEnvelopeRequest),
    ).toThrow();

    for (const port of [
      "crm-customer-billing-catalog",
      "tutor-financial-export",
    ] as const) {
      const legitimateEnvelope = privateEvidenceEnvelope({
        document: sourceDocument,
        sourceSystem: "owner-attested-archive",
        sourceVersion: "archive-v1",
        payloadDigest: "f".repeat(64),
        evidenceReference,
      });
      const lookalikeEnvelope = {
        ...legitimateEnvelope,
        sourceAcceptance: {
          port,
          snapshot: evidenceSnapshot(evidenceReference, "f".repeat(64)),
        },
      } as unknown as AcceptedControlledSourceEnvelope;
      const lookalikeRequest = normalizationInput(
        `deferred-${port}`,
        [lookalikeEnvelope],
        scope,
        [await trustedPreparationForEnvelope(subject, legitimateEnvelope)],
      );
      expect(() =>
        subject.prepareControlledImportBatch(lookalikeRequest),
      ).toThrow();
    }
  });

  it("requires controlled-import and historical-private-evidence pilot behavior", async () => {
    const subject = await loadControlledImports();
    const pilot = subject.runHistoricalPrivateEvidencePilot;
    if (pilot === undefined) {
      expect(pilot).toBeUndefined();
      return;
    }
    expect(pilot).toBeTypeOf("function");

    const result = await pilot({
      packetVersion: "historical-private-evidence-packet.v1",
      sourceSystem: "owner-attested-archive",
    });
    expect(Object.keys(result).sort()).toEqual([
      "liveSourceAdaptersUsed",
      "packetVersion",
      "status",
    ]);
    expect(result).toMatchObject({
      packetVersion: "historical-private-evidence-packet.v1",
      liveSourceAdaptersUsed: [],
    });
    expect(["not-admitted", "blocked"]).toContain(result.status);
    await expect(
      pilot({
        packetVersion: "historical-private-evidence-packet.v999",
        sourceSystem: "owner-attested-archive",
      }),
    ).rejects.toThrow();
  });

  it("prepares PA-INV-2026-001 exactly, deeply frozen, and without input aliases or policy inference", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.prepareControlledImportBatch,
      "prepareControlledImportBatch",
    );
    const document = {
      sourceDocumentId: "PA-INV-2026-001",
      logicalDocumentId: "PA-INV-2026-001",
      sourceDocumentKind: "school-billing-invoice" as const,
      thaiTaxDocumentStatus: "unresolved" as const,
      currency: "THB",
      facts: [
        { factId: "student-count", kind: "count" as const, countText: "147" },
        { factId: "app", kind: "money" as const, amountDecimal: "147000.00" },
        {
          factId: "workbooks",
          kind: "money" as const,
          amountDecimal: "73500.00",
        },
        {
          factId: "subtotal",
          kind: "money" as const,
          amountDecimal: "220500.00",
        },
        {
          factId: "discount-40-percent",
          kind: "money" as const,
          amountDecimal: "-88200.00",
          sourceText: "40%",
        },
        { factId: "net", kind: "money" as const, amountDecimal: "132300.00" },
        {
          factId: "per-student",
          kind: "money" as const,
          amountDecimal: "900.00",
        },
      ],
    };
    const envelope = privateEvidenceEnvelope({
      document,
      sourceSystem: "owner-attested-archive",
      sourceVersion: "archive-v1",
      payloadDigest: "4".repeat(64),
      evidenceReference:
        "private-evidence://company-sanitized/finance/sanitized/pa-inv-2026-001",
    });
    const input = await trustedNormalizationInput(
      subject,
      "school-billing-pa-inv-2026-001",
      [envelope],
    );
    const result = subject.prepareControlledImportBatch(input);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(Object.keys(result).sort()).toEqual(
      [
        "batchDigest",
        "batchId",
        "normalizationVersion",
        "records",
        "scope",
        "snapshots",
        "status",
      ].sort(),
    );
    expect(result.snapshots).toHaveLength(1);
    expect(result.snapshots[0]).toMatchObject({
      sourceDocumentId: "PA-INV-2026-001",
      sourceDocumentKind: "school-billing-invoice",
      thaiTaxDocumentStatus: "unresolved",
      facts: expect.arrayContaining([
        expect.objectContaining({ factId: "student-count", count: "147" }),
        expect.objectContaining({ factId: "app", amountMinor: "14700000" }),
        expect.objectContaining({
          factId: "workbooks",
          amountMinor: "7350000",
        }),
        expect.objectContaining({
          factId: "subtotal",
          amountMinor: "22050000",
        }),
        expect.objectContaining({
          factId: "discount-40-percent",
          amountMinor: "-8820000",
          sourceText: "40%",
        }),
        expect.objectContaining({ factId: "net", amountMinor: "13230000" }),
        expect.objectContaining({
          factId: "per-student",
          amountMinor: "90000",
        }),
      ]),
    });
    expect(result.records).toHaveLength(6);
    expect(
      new Set(result.records.map((record) => record.provenance.sourceRecordId))
        .size,
    ).toBe(6);
    expect(
      result.records.map((record) => record.provenance.sourceRecordId),
    ).toEqual(
      expect.arrayContaining([
        "PA-INV-2026-001#app",
        "PA-INV-2026-001#workbooks",
        "PA-INV-2026-001#subtotal",
        "PA-INV-2026-001#discount-40-percent",
        "PA-INV-2026-001#net",
        "PA-INV-2026-001#per-student",
      ]),
    );
    for (const record of result.records) {
      expect(record.money.currency).toBe("THB");
      expect(record.provenance).toMatchObject({
        sourceSystem: "owner-attested-archive",
        sourceVersion: "archive-v1",
        importBatchId: "school-billing-pa-inv-2026-001",
        payloadDigest: "4".repeat(64),
        evidenceReference:
          "private-evidence://company-sanitized/finance/sanitized/pa-inv-2026-001",
      });
    }
    expectStrictPolicyNeutralOutput(result);
    expectDeepFrozen(result);
    expect(result.scope).not.toBe(input.scope);
    expect(result.snapshots[0]).not.toBe(document);
    expect(result.snapshots[0]?.facts).not.toBe(document.facts);
    expect(new Set(result.records.map((record) => record.money)).size).toBe(
      result.records.length,
    );
    expect(
      new Set(result.records.map((record) => record.provenance)).size,
    ).toBe(result.records.length);
    document.facts[1]!.amountDecimal = "0.00";
    expect(result.snapshots[0]?.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ factId: "app", amountMinor: "14700000" }),
      ]),
    );
    expect(collectForbiddenKeys(result)).toEqual([]);
    expect(Object.keys(result.snapshots[0] ?? {}).sort()).toEqual(
      [
        "facts",
        "logicalDocumentId",
        "sourceDocumentId",
        "sourceDocumentKind",
        "thaiTaxDocumentStatus",
      ].sort(),
    );
  });

  it("keeps equal-net Term1 and Term2 as distinct unresolved immutable variants", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.prepareControlledImportBatch,
      "prepareControlledImportBatch",
    );
    const variant = (variantId: "Term1" | "Term2", digit: string) =>
      privateEvidenceEnvelope({
        sourceSystem: "owner-attested-archive",
        sourceVersion: "archive-v1",
        payloadDigest: digit.repeat(64),
        evidenceReference: `private-evidence://company-sanitized/finance/sanitized/${variantId.toLowerCase()}`,
        document: {
          sourceDocumentId: `school-billing-${variantId.toLowerCase()}-source`,
          logicalDocumentId: "school-billing-unresolved-term",
          variantId,
          ambiguityGroupId: "school-billing-unresolved-term",
          sourceDocumentKind: "school-billing-invoice",
          thaiTaxDocumentStatus: "unresolved",
          currency: "THB",
          facts: [{ factId: "net", kind: "money", amountDecimal: "59535.00" }],
        },
      });
    const envelopes = [variant("Term1", "5"), variant("Term2", "6")];
    const result = subject.prepareControlledImportBatch(
      await trustedNormalizationInput(
        subject,
        "school-billing-term-variants",
        envelopes,
      ),
    );

    expect(result).toMatchObject({
      status: "unresolved",
      normalizationVersion: NORMALIZATION_VERSION,
      reason: "source-variant-ambiguity",
      records: [],
      variants: [
        expect.objectContaining({ variantId: "Term1" }),
        expect.objectContaining({ variantId: "Term2" }),
      ],
    });
    if (result.status !== "unresolved") return;
    expect(Object.keys(result).sort()).toEqual(
      [
        "batchId",
        "normalizationVersion",
        "reason",
        "records",
        "scope",
        "status",
        "variants",
      ].sort(),
    );
    for (const candidate of result.variants) {
      expect(candidate.facts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ factId: "net", amountMinor: "5953500" }),
        ]),
      );
    }
    expect(result.variants[0]).not.toBe(result.variants[1]);
    expect(result.variants[0]?.facts).not.toBe(result.variants[1]?.facts);
    expect(result.variants[0]?.facts[0]).not.toBe(result.variants[1]?.facts[0]);
    for (const [index, candidate] of result.variants.entries()) {
      expect(candidate).not.toBe(envelopes[index]?.document);
      expect(candidate.facts).not.toBe(
        (envelopes[index]?.document as { readonly facts?: unknown }).facts,
      );
    }
    expectStrictPolicyNeutralOutput({
      snapshots: result.variants,
      records: result.records,
    });
    expectDeepFrozen(result);
  });

  it("preserves Buddhist source dates, variable voucher labels, exact decimals, and a zero-gross voucher", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.prepareControlledImportBatch,
      "prepareControlledImportBatch",
    );
    const payrollEnvelope = privateEvidenceEnvelope({
      sourceSystem: "sanitized-payroll-summary",
      payloadDigest: "7".repeat(64),
      evidenceReference:
        "private-evidence://company-sanitized/finance/sanitized/payroll-summary",
      document: {
        sourceDocumentId: "payroll-summary-sanitized-001",
        logicalDocumentId: "payroll-summary-sanitized-001",
        sourceDocumentKind: "payroll-summary",
        thaiTaxDocumentStatus: "unresolved",
        currency: "THB",
        vouchers: [
          {
            voucherNumberText: "7",
            sourceDateText: "08/07/2569",
            grossDecimal: "12345.67",
            sourceStatedWhtDecimal: "370.37",
            netDecimal: "11975.30",
          },
          {
            voucherNumberText: "PV-2026/071",
            sourceDateText: "15/07/2569",
            grossDecimal: "8000.00",
            sourceStatedWhtDecimal: "0.00",
            netDecimal: "8000.00",
          },
          {
            voucherNumberText: "ZERO-GROSS-SANITIZED",
            sourceDateText: "31/07/2569",
            grossDecimal: "0.00",
            sourceStatedWhtDecimal: "0.00",
            netDecimal: "0.00",
          },
        ],
      },
    });
    const result = subject.prepareControlledImportBatch(
      await trustedNormalizationInput(
        subject,
        "payroll-sanitized-buddhist-dates",
        [payrollEnvelope],
      ),
    );

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.snapshots[0]?.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          voucherNumberText: "7",
          sourceDateText: "08/07/2569",
          moneyKind: "gross",
          amountMinor: "1234567",
        }),
        expect.objectContaining({
          voucherNumberText: "7",
          moneyKind: "source-stated-wht",
          amountMinor: "37037",
        }),
        expect.objectContaining({
          voucherNumberText: "7",
          moneyKind: "net",
          amountMinor: "1197530",
        }),
        expect.objectContaining({
          voucherNumberText: "PV-2026/071",
          sourceDateText: "15/07/2569",
        }),
        expect.objectContaining({
          voucherNumberText: "ZERO-GROSS-SANITIZED",
          sourceDateText: "31/07/2569",
          moneyKind: "gross",
          amountMinor: "0",
        }),
      ]),
    );
    expect(result.records).toHaveLength(9);
    expect(
      new Set(result.records.map((record) => record.provenance.sourceRecordId))
        .size,
    ).toBe(9);
    expect(Object.keys(result.snapshots[0] ?? {}).sort()).toEqual(
      [
        "facts",
        "logicalDocumentId",
        "sourceDocumentId",
        "sourceDocumentKind",
        "thaiTaxDocumentStatus",
      ].sort(),
    );
    expect(collectForbiddenKeys(result)).toEqual([]);
    expectStrictPolicyNeutralOutput(result);
    expectDeepFrozen(result);
  });

  it("classifies the July 2026 GCP PDF only as a THB 9,270.79 payment receipt", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.prepareControlledImportBatch,
      "prepareControlledImportBatch",
    );
    const gcpEnvelope = privateEvidenceEnvelope({
      sourceSystem: "sanitized-gcp-billing",
      payloadDigest: "8".repeat(64),
      evidenceReference:
        "private-evidence://company-sanitized/finance/sanitized/gcp-july-2026-receipt",
      document: {
        sourceDocumentId: "gcp-july-2026-payment-receipt",
        logicalDocumentId: "gcp-july-2026-payment-receipt",
        sourceDocumentKind: "payment-receipt",
        thaiTaxDocumentStatus: "not-source-asserted",
        currency: "THB",
        facts: [
          {
            factId: "payment-total",
            kind: "money",
            amountDecimal: "9270.79",
          },
        ],
      },
    });
    const result = subject.prepareControlledImportBatch(
      await trustedNormalizationInput(subject, "gcp-july-2026-receipt", [
        gcpEnvelope,
      ]),
    );

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.snapshots[0]).toEqual({
      sourceDocumentId: "gcp-july-2026-payment-receipt",
      logicalDocumentId: "gcp-july-2026-payment-receipt",
      sourceDocumentKind: "payment-receipt",
      thaiTaxDocumentStatus: "not-source-asserted",
      facts: [
        expect.objectContaining({
          factId: "payment-total",
          amountMinor: "927079",
          currency: "THB",
        }),
      ],
    });
    expect(collectForbiddenKeys(result.snapshots[0])).toEqual([]);
    expectStrictPolicyNeutralOutput(result);
  });

  it("preserves the Workspace PDF as a foreign THB 1,300 invoice with source-stated GST 0% only", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.prepareControlledImportBatch,
      "prepareControlledImportBatch",
    );
    const workspaceEnvelope = privateEvidenceEnvelope({
      sourceSystem: "sanitized-workspace-billing",
      payloadDigest: "9".repeat(64),
      evidenceReference:
        "private-evidence://company-sanitized/finance/sanitized/workspace-invoice",
      document: {
        sourceDocumentId: "workspace-foreign-invoice-sanitized",
        logicalDocumentId: "workspace-foreign-invoice-sanitized",
        sourceDocumentKind: "foreign-workspace-invoice",
        thaiTaxDocumentStatus: "not-source-asserted",
        sourceStatedTax: { label: "GST", rateText: "0%" },
        currency: "THB",
        facts: [
          {
            factId: "invoice-total",
            kind: "money",
            amountDecimal: "1300.00",
          },
        ],
      },
    });
    const result = subject.prepareControlledImportBatch(
      await trustedNormalizationInput(subject, "workspace-foreign-invoice", [
        workspaceEnvelope,
      ]),
    );

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.snapshots[0]).toEqual({
      sourceDocumentId: "workspace-foreign-invoice-sanitized",
      logicalDocumentId: "workspace-foreign-invoice-sanitized",
      sourceDocumentKind: "foreign-workspace-invoice",
      thaiTaxDocumentStatus: "not-source-asserted",
      sourceStatedTax: { label: "GST", rateText: "0%" },
      facts: [
        expect.objectContaining({
          factId: "invoice-total",
          amountMinor: "130000",
          currency: "THB",
        }),
      ],
    });
    expect(Object.keys(result.snapshots[0] ?? {}).sort()).toEqual(
      [
        "facts",
        "logicalDocumentId",
        "sourceDocumentId",
        "sourceDocumentKind",
        "sourceStatedTax",
        "thaiTaxDocumentStatus",
      ].sort(),
    );
    expect(collectForbiddenKeys(result.snapshots[0])).toEqual([]);
    expectStrictPolicyNeutralOutput(result);
  });

  it("rejects floating point amounts, inferred policy fields, sensitive data, and raw payloads", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.prepareControlledImportBatch,
      "prepareControlledImportBatch",
    );
    const baseDocument = {
      sourceDocumentId: "strict-normalized-source",
      logicalDocumentId: "strict-normalized-source",
      sourceDocumentKind: "payment-receipt" as const,
      thaiTaxDocumentStatus: "unresolved" as const,
      currency: "THB",
      facts: [
        { factId: "total", kind: "money" as const, amountDecimal: "100.00" },
      ],
    };
    const strictEnvelope = privateEvidenceEnvelope({
      document: baseDocument,
      sourceSystem: "sanitized-test-source",
      payloadDigest: "a".repeat(64),
      evidenceReference:
        "private-evidence://company-sanitized/finance/sanitized/strict-source",
    });
    const prepare = async (
      document: unknown,
    ): Promise<PreparedControlledImportBatch> => {
      const envelope = privateEvidenceEnvelope({
        ...strictEnvelope,
        document: document as ControlledSourceDocumentInput,
      });
      return subject.prepareControlledImportBatch(
        await trustedNormalizationInput(
          subject,
          "strict-normalized-batch",
          [envelope],
          scope,
          [strictEnvelope],
        ),
      );
    };
    const trustedStrictPreparation = await trustedPreparationForEnvelope(
      subject,
      strictEnvelope,
    );
    const prepareAcceptedEnvelope = async (envelope: unknown) =>
      subject.prepareControlledImportBatch({
        normalizationVersion: NORMALIZATION_VERSION,
        scope,
        batchId: "strict-accepted-envelope-batch",
        acceptedSourceEnvelopes: [envelope],
        trustedPreparation: trustedStrictPreparation,
      });
    const prepareAcceptedEnvelopeExpectingError = async (
      envelope: unknown,
    ): Promise<void> => {
      await expect(prepareAcceptedEnvelope(envelope)).rejects.toThrow();
    };

    await prepareAcceptedEnvelopeExpectingError({
      ...strictEnvelope,
      document: {
        ...baseDocument,
        thaiTaxDocumentStatus: "tax-invoice",
      },
    });
    await expect(
      prepare({
        ...baseDocument,
        facts: [{ factId: "total", kind: "money", amountDecimal: 9270.79 }],
      }),
    ).rejects.toThrow();
    for (const [key, value] of [
      ["vatRate", "7%"],
      ["taxAmount", "7.00"],
      ["accountCode", "expense-cloud"],
      ["ledgerAccount", "cloud-services"],
      ["deductible", true],
      ["name", "Sensitive Person"],
      ["email", "sensitive@example.invalid"],
      ["bankAccount", "000-000-0000"],
      ["accountNumber", "000000"],
      ["taxId", "0000000000000"],
      ["rawPayload", "unredacted-source-body"],
    ] as const) {
      await expect(
        prepare({ ...baseDocument, [key]: value }),
        key,
      ).rejects.toThrow();
      await expect(
        prepare({
          ...baseDocument,
          facts: [{ ...baseDocument.facts[0], [key]: value }],
        }),
        `normalized fact field ${key}`,
      ).rejects.toThrow();
    }
    const rawPayloadEnvelope = {
      ...strictEnvelope,
      rawPayload: "unredacted-source-body",
    };
    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationInput("raw-envelope-batch", [rawPayloadEnvelope], scope, [
          trustedStrictPreparation,
        ]),
      ),
    ).toThrow();
    for (const [key, value] of [
      ["name", "Sensitive Person"],
      ["email", "sensitive@example.invalid"],
      ["bankAccount", "000-000-0000"],
      ["accountNumber", "000000"],
      ["taxId", "0000000000000"],
      ["rawPayload", "unredacted-source-body"],
    ] as const) {
      await prepareAcceptedEnvelopeExpectingError({
        ...strictEnvelope,
        evidenceAuthorization: {
          ...strictEnvelope.evidenceAuthorization,
          [key]: value,
        },
      });
      await prepareAcceptedEnvelopeExpectingError({
        ...strictEnvelope,
        sourceAcceptance: {
          ...strictEnvelope.sourceAcceptance,
          snapshot: {
            ...strictEnvelope.sourceAcceptance.snapshot,
            [key]: value,
          },
        },
      });
    }
    await prepareAcceptedEnvelopeExpectingError({
      ...strictEnvelope,
      document: {
        sourceDocumentId: "strict-workspace-source",
        logicalDocumentId: "strict-workspace-source",
        sourceDocumentKind: "foreign-workspace-invoice",
        thaiTaxDocumentStatus: "not-source-asserted",
        sourceStatedTax: {
          label: "GST",
          rateText: "0%",
          rawPayload: "unredacted-source-body",
        },
        currency: "THB",
        facts: [{ factId: "total", kind: "money", amountDecimal: "100.00" }],
      },
    });
    await prepareAcceptedEnvelopeExpectingError({
      ...strictEnvelope,
      document: {
        sourceDocumentId: "strict-payroll-source",
        logicalDocumentId: "strict-payroll-source",
        sourceDocumentKind: "payroll-summary",
        thaiTaxDocumentStatus: "unresolved",
        currency: "THB",
        vouchers: [
          {
            voucherNumberText: "PV-1",
            sourceDateText: "01/07/2569",
            grossDecimal: "100.00",
            sourceStatedWhtDecimal: "0.00",
            netDecimal: "100.00",
            bankAccount: "000-000-0000",
          },
        ],
      },
    });
    for (const unsafeText of [
      "<script>",
      "line\nbreak",
      "nul\u0000byte",
      '{"raw":true}',
      "sensitive@example.invalid",
      "x".repeat(129),
    ]) {
      await expect(
        prepare({
          ...baseDocument,
          facts: [
            {
              ...baseDocument.facts[0],
              sourceText: unsafeText,
            },
          ],
        }),
        `unsafe fact sourceText ${JSON.stringify(unsafeText)}`,
      ).rejects.toThrow();
      await prepareAcceptedEnvelopeExpectingError({
        ...strictEnvelope,
        document: {
          sourceDocumentId: "unsafe-workspace-source",
          logicalDocumentId: "unsafe-workspace-source",
          sourceDocumentKind: "foreign-workspace-invoice",
          thaiTaxDocumentStatus: "not-source-asserted",
          sourceStatedTax: { label: unsafeText, rateText: "0%" },
          currency: "THB",
          facts: [{ factId: "total", kind: "money", amountDecimal: "100.00" }],
        },
      });
      await prepareAcceptedEnvelopeExpectingError({
        ...strictEnvelope,
        document: {
          sourceDocumentId: "unsafe-payroll-source",
          logicalDocumentId: "unsafe-payroll-source",
          sourceDocumentKind: "payroll-summary",
          thaiTaxDocumentStatus: "unresolved",
          currency: "THB",
          vouchers: [
            {
              voucherNumberText: unsafeText,
              sourceDateText: "01/07/2569",
              grossDecimal: "100.00",
              sourceStatedWhtDecimal: "0.00",
              netDecimal: "100.00",
            },
          ],
        },
      });
    }
  });

  it("rejects malformed digests, cross-company evidence, and mismatched accepted receipts", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.prepareControlledImportBatch,
      "prepareControlledImportBatch",
    );
    const document: ControlledSourceDocumentInput = {
      sourceDocumentId: "invalid-provenance-source",
      logicalDocumentId: "invalid-provenance-source",
      sourceDocumentKind: "payment-receipt",
      thaiTaxDocumentStatus: "unresolved",
      currency: "THB",
      facts: [{ factId: "total", kind: "money", amountDecimal: "100.00" }],
    };
    const valid = privateEvidenceEnvelope({
      document,
      sourceSystem: "sanitized-test-source",
      payloadDigest: "b".repeat(64),
      evidenceReference:
        "private-evidence://company-sanitized/finance/sanitized/valid-source",
    });
    const validPreparation = await trustedPreparationForEnvelope(
      subject,
      valid,
    );

    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationInput(
          "invalid-digest",
          [
            {
              ...valid,
              sourceAcceptance: {
                port: "private-evidence-storage",
                snapshot: {
                  ...valid.evidenceAuthorization,
                  payloadDigest: "not-a-digest",
                },
              },
            },
          ],
          scope,
          [validPreparation],
        ),
      ),
    ).toThrow();
    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationInput(
          "cross-company-evidence",
          [
            {
              ...valid,
              evidenceAuthorization: {
                ...valid.evidenceAuthorization,
                evidenceReference:
                  "private-evidence://another-company/finance/sanitized/source",
              },
            },
          ],
          scope,
          [validPreparation],
        ),
      ),
    ).toThrow();
    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationInput(
          "receipt-digest-mismatch",
          [
            {
              ...valid,
              evidenceAuthorization: {
                ...valid.evidenceAuthorization,
                payloadDigest: "c".repeat(64),
              },
            },
          ],
          scope,
          [validPreparation],
        ),
      ),
    ).toThrow();
    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationInput(
          "envelope-scope-mismatch",
          [
            {
              ...valid,
              scope: { companyId: scope.companyId, schoolId: "another-school" },
            },
          ],
          scope,
          [validPreparation],
        ),
      ),
    ).toThrow();
    const acceptedSource = privateEvidenceEnvelope({
      document,
      sourceSystem: "owner-attested-archive",
      sourceVersion: "archive-v1",
      payloadDigest: "d".repeat(64),
      evidenceReference:
        "private-evidence://company-sanitized/finance/sanitized/archive-version",
    });
    const acceptedSourcePreparation = await trustedPreparationForEnvelope(
      subject,
      acceptedSource,
    );
    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationInput(
          "source-version-mismatch",
          [{ ...acceptedSource, sourceVersion: "archive-v2" }],
          scope,
          [acceptedSourcePreparation],
        ),
      ),
    ).toThrow();
    const acceptedPrivateSource = privateEvidenceEnvelope({
      document,
      sourceSystem: "sanitized-payroll-summary",
      sourceVersion: "archive-v1",
      sourceRecordId: "archive-payroll-record-sanitized",
      payloadDigest: "e".repeat(64),
      evidenceReference:
        "private-evidence://company-sanitized/finance/sanitized/payroll-identity",
    });
    const acceptedPrivateSourcePreparation =
      await trustedPreparationForEnvelope(subject, acceptedPrivateSource);
    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationInput(
          "source-record-mismatch",
          [
            {
              ...acceptedPrivateSource,
              sourceRecordId: "different-archive-record",
            },
          ],
          scope,
          [acceptedPrivateSourcePreparation],
        ),
      ),
    ).toThrow();
  });

  it("classifies replay across company, school, source system, version, batch, and digest without aliases", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.classifyControlledImportBatchReplay,
      "classifyControlledImportBatchReplay",
    );
    const existing = deepFreeze({
      scope,
      sourceSystem: "owner-attested-archive",
      sourceVersion: "archive-v1",
      importBatchId: "controlled-import-batch-001",
      batchDigest: "d".repeat(64),
      acceptedRecordIds: ["record-001", "record-002"],
    });
    const before = structuredClone(existing);
    const baseIncoming = {
      scope,
      sourceSystem: existing.sourceSystem,
      sourceVersion: existing.sourceVersion,
      importBatchId: existing.importBatchId,
      batchDigest: existing.batchDigest,
    };
    const replay = subject.classifyControlledImportBatchReplay({
      existing,
      incoming: baseIncoming,
    });
    expect(replay).toEqual({
      status: "replay",
      acceptedRecordIds: existing.acceptedRecordIds,
    });
    expect(replay.acceptedRecordIds).not.toBe(existing.acceptedRecordIds);
    expectDeepFrozen(replay);

    const cases: ReadonlyArray<{
      incoming: typeof baseIncoming;
      reason: Exclude<
        ControlledImportReplayResult,
        { status: "replay" }
      >["reason"];
    }> = [
      {
        incoming: {
          ...baseIncoming,
          scope: { ...scope, companyId: "another-company" },
        },
        reason: "scope-mismatch",
      },
      {
        incoming: {
          ...baseIncoming,
          scope: { ...scope, schoolId: "another-school" },
        },
        reason: "scope-mismatch",
      },
      {
        incoming: {
          ...baseIncoming,
          sourceSystem: "sanitized-payroll-summary",
        },
        reason: "source-system-mismatch",
      },
      {
        incoming: { ...baseIncoming, sourceVersion: "archive-v2" },
        reason: "source-version-mismatch",
      },
      {
        incoming: { ...baseIncoming, importBatchId: "another-batch" },
        reason: "import-batch-id-mismatch",
      },
      {
        incoming: { ...baseIncoming, batchDigest: "e".repeat(64) },
        reason: "payload-digest-mismatch",
      },
    ];
    for (const testCase of cases) {
      const result = subject.classifyControlledImportBatchReplay({
        existing,
        incoming: testCase.incoming,
      });
      expect(result).toEqual({
        status: "conflict",
        acceptedRecordIds: existing.acceptedRecordIds,
        reason: testCase.reason,
      });
      expect(result.acceptedRecordIds).not.toBe(existing.acceptedRecordIds);
      expectDeepFrozen(result);
    }
    expect(existing).toEqual(before);
  });

  it("prepares a deeply frozen correction without mutating or aliasing accepted state", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.prepareControlledImportCorrection,
      "prepareControlledImportCorrection",
    );
    const acceptedRecord = readyPlan().records[0];
    if (acceptedRecord === undefined)
      throw new Error("Missing accepted fixture.");
    const before = structuredClone(acceptedRecord);
    const money = { amountMinor: "13220000", currency: "THB" };
    const provenance = {
      ...acceptedRecord.provenance,
      sourceRecordId: "PA-INV-2026-001#net#correction-001",
      importBatchId: "controlled-import-correction-batch-001",
      payloadDigest: "f".repeat(64),
    };
    const correction = subject.prepareControlledImportCorrection({
      acceptedRecord,
      correctionRecordId: "controlled-import-record-001-correction-001",
      reason: "Source owner supplied a corrected immutable snapshot.",
      money,
      provenance,
    });

    expect(correction).toMatchObject({
      recordId: "controlled-import-record-001-correction-001",
      supersedesRecordId: acceptedRecord.recordId,
      correctionReason: "Source owner supplied a corrected immutable snapshot.",
      money: { amountMinor: "13220000", currency: "THB" },
    });
    expect(correction).not.toBe(acceptedRecord);
    expect(correction.scope).toEqual(acceptedRecord.scope);
    expect(correction.scope).not.toBe(acceptedRecord.scope);
    expect(correction.money).not.toBe(money);
    expect(correction.provenance).not.toBe(provenance);
    expectDeepFrozen(correction);
    money.amountMinor = "1";
    provenance.payloadDigest = "0".repeat(64);
    expect(correction.money.amountMinor).toBe("13220000");
    expect(correction.provenance.payloadDigest).toBe("f".repeat(64));
    expect(acceptedRecord).toEqual(before);
  });

  it("fails closed on an authorization denial before atomic persistence and appends denial audit", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.acceptControlledImportBatch,
      "acceptControlledImportBatch",
    );
    const audit = auditPortDouble();
    const repository = { applyBatchAtomically: vi.fn() };

    await expect(
      subject.acceptControlledImportBatch({
        plan: readyPlan(),
        authorizationInput,
        authorizationPort: {
          authorizeFinanceOperation: vi.fn(async () => ({
            decision: "deny" as const,
          })),
        },
        auditPort: audit.port,
        repository,
        requestId: "request-controlled-import-denied-001",
        correlationId: "correlation-controlled-import-001",
        occurredAt: canonicalOccurredAt,
      }),
    ).rejects.toMatchObject({ reason: "authorization-denied" });
    expect(repository.applyBatchAtomically).not.toHaveBeenCalled();
    expect(audit.events).toEqual([
      expect.objectContaining({
        outcome: "denied",
        operation: "controlled-import:accept-batch",
        objectId: "controlled-import-batch-001",
        scope,
      }),
    ]);
    expectDeepFrozen(audit.events[0]);
  });

  it("rejects allowing-port company and school scope mismatches without repository calls and audits each failure", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.acceptControlledImportBatch,
      "acceptControlledImportBatch",
    );
    const audit = auditPortDouble();
    const repository = { applyBatchAtomically: vi.fn() };
    const mismatches: FinanceOperationAuthorizationInput[] = [
      deepFreeze({
        ...authorizationInput,
        scope: { companyId: "another-company", schoolId: scope.schoolId },
        authorizationEvidence: {
          ...authorizationEvidence,
          organizationId: "another-company",
        },
      }),
      deepFreeze({
        ...authorizationInput,
        scope: { companyId: scope.companyId, schoolId: "another-school" },
        authorizationEvidence: {
          ...authorizationEvidence,
          schoolIds: ["another-school"],
        },
      }),
    ];

    for (const [index, mismatchedAuthorization] of mismatches.entries()) {
      await expect(
        subject.acceptControlledImportBatch({
          plan: readyPlan(),
          authorizationInput: mismatchedAuthorization,
          authorizationPort: allowingAuthorizationPort(),
          auditPort: audit.port,
          repository,
          requestId: `request-controlled-import-scope-mismatch-${index}`,
          correlationId: "correlation-controlled-import-scope-mismatch",
          occurredAt: canonicalOccurredAt,
        }),
      ).rejects.toMatchObject({ reason: "scope-mismatch" });
    }
    expect(repository.applyBatchAtomically).not.toHaveBeenCalled();
    expect(audit.events).toHaveLength(2);
    expect(audit.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          outcome: "failed",
          operation: "controlled-import:accept-batch",
          scope,
        }),
      ]),
    );
    for (const event of audit.events) expectDeepFrozen(event);
  });

  it("creates collision-free structured durable-job identities for company-only, school, and delimiter-bearing values", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.createControlledImportJobIdentity,
      "createControlledImportJobIdentity",
    );
    const inputs = [
      { scope: companyOnlyScope, batchId: "school:batch|one" },
      { scope, batchId: "school:batch|one" },
      {
        scope: { companyId: "company-sanitized", schoolId: "company-only" },
        batchId: "school:batch|one",
      },
      {
        scope: { companyId: "company:school", schoolId: "sanitized|batch" },
        batchId: "one",
      },
      {
        scope: { companyId: "company", schoolId: "school:sanitized" },
        batchId: "batch|one",
      },
    ];
    const identities = inputs.map((input) =>
      subject.createControlledImportJobIdentity(input),
    );

    expect(identities).toEqual(
      inputs.map((input) => expectedJobIdentity(input.scope, input.batchId)),
    );
    expect(new Set(identities).size).toBe(inputs.length);
  });

  it("returns deeply frozen accepted, replay, and conflict command outcomes without repository aliases", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.acceptControlledImportBatch,
      "acceptControlledImportBatch",
    );
    const audit = auditPortDouble();
    const plan = readyPlan();
    const before = structuredClone(plan);
    const repositoryResults: ControlledImportAtomicResult[] = [
      { status: "accepted", recordIds: ["controlled-import-record-001"] },
      { status: "replay", recordIds: ["controlled-import-record-001"] },
      {
        status: "conflict",
        recordIds: ["controlled-import-record-001"],
        reason: "payload-digest-mismatch",
      },
    ];
    const received: Parameters<
      ControlledImportAtomicRepository["applyBatchAtomically"]
    >[0][] = [];
    const repository: ControlledImportAtomicRepository = {
      applyBatchAtomically: vi.fn(async (input) => {
        received.push(input);
        const result = repositoryResults[received.length - 1];
        if (result === undefined)
          throw new Error("Missing repository result fixture.");
        return result;
      }),
    };

    for (const [index, repositoryResult] of repositoryResults.entries()) {
      const result = await subject.acceptControlledImportBatch({
        plan,
        authorizationInput,
        authorizationPort: allowingAuthorizationPort(),
        auditPort: audit.port,
        repository,
        requestId: `request-controlled-import-outcome-${index}`,
        correlationId: "correlation-controlled-import-outcomes",
        occurredAt: canonicalOccurredAt,
      });
      expect(result).toEqual(repositoryResult);
      expect(result).not.toBe(repositoryResult);
      expect(result.recordIds).not.toBe(repositoryResult.recordIds);
      expectDeepFrozen(result);
    }
    expect(plan).toEqual(before);
    expect(received).toHaveLength(3);
    for (const [index, input] of received.entries()) {
      const requestId = `request-controlled-import-outcome-${index}`;
      expect(input.plan).not.toBe(plan);
      expect(input.plan.scope).not.toBe(plan.scope);
      expect(input.plan.records).not.toBe(plan.records);
      expect(input.plan.records[0]).not.toBe(plan.records[0]);
      expect(input.plan.records[0]?.money).not.toBe(plan.records[0]?.money);
      expect(input.plan.records[0]?.provenance).not.toBe(
        plan.records[0]?.provenance,
      );
      expect(input.durableJob).toEqual({
        jobContractVersion: DURABLE_JOB_VERSION,
        operation: "controlled-import:apply-batch",
        idempotencyKey: expectedJobIdentity(scope, plan.batchId),
        payloadDigest: plan.batchDigest,
        scope,
        authorizationEvidence,
      });
      expect(input.durableJob.authorizationEvidence).not.toBe(
        authorizationEvidence,
      );
      expect(input.audit).toEqual({
        eventId: expectedAuditEventId({ requestId, outcome: "succeeded" }),
        actorSubjectId: "employee-sanitized",
        operation: "controlled-import:accept-batch",
        objectType: "controlled-import-batch",
        objectId: "controlled-import-batch-001",
        occurredAt: canonicalOccurredAt,
        requestId,
        correlationId: "correlation-controlled-import-outcomes",
        scope,
        outcome: "succeeded",
      });
      expectDeepFrozen(input);
    }
    expect(audit.events).toHaveLength(3);
    for (const [index, event] of audit.events.entries()) {
      const requestId = `request-controlled-import-outcome-${index}`;
      expect(event).toEqual({
        eventId: expectedAuditEventId({ requestId, outcome: "allowed" }),
        actorSubjectId: "employee-sanitized",
        operation: "controlled-import:accept-batch",
        objectType: "controlled-import-batch",
        objectId: "controlled-import-batch-001",
        occurredAt: canonicalOccurredAt,
        requestId,
        correlationId: "correlation-controlled-import-outcomes",
        scope,
        outcome: "allowed",
      });
      expectDeepFrozen(event);
    }
  });

  it.each(["record", "job", "audit"] as const)(
    "rolls back records, durable jobs, and success audits when %s staging fails",
    async (failAt) => {
      const subject = await loadControlledImports();
      requireFunction(
        subject.acceptControlledImportBatch,
        "acceptControlledImportBatch",
      );
      const atomic = createAtomicRepositoryFake({ failAt });
      const decisionAudit = auditPortDouble();

      await expect(
        subject.acceptControlledImportBatch({
          plan: readyPlan(),
          authorizationInput,
          authorizationPort: allowingAuthorizationPort(),
          auditPort: decisionAudit.port,
          repository: atomic.repository,
          requestId: `request-controlled-import-rollback-${failAt}`,
          correlationId: "correlation-controlled-import-rollback",
          occurredAt: canonicalOccurredAt,
        }),
      ).rejects.toThrow(`${failAt}-stage-failed`);
      expect(atomic.records).toEqual([]);
      expect(atomic.jobs).toEqual([]);
      expect(atomic.audits).toEqual([]);
      expect(atomic.accepted.size).toBe(0);
      expect(decisionAudit.events).toEqual([
        expect.objectContaining({ outcome: "allowed", scope }),
        expect.objectContaining({ outcome: "failed", scope }),
      ]);
    },
  );

  it("atomically resolves concurrent identical commands as accepted plus replay", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.acceptControlledImportBatch,
      "acceptControlledImportBatch",
    );
    const atomic = createAtomicRepositoryFake({ barrier: createBarrier(2) });
    const audit = auditPortDouble();
    const plan = readyPlan();
    const execute = (suffix: string) =>
      subject.acceptControlledImportBatch({
        plan,
        authorizationInput,
        authorizationPort: allowingAuthorizationPort(),
        auditPort: audit.port,
        repository: atomic.repository,
        requestId: `request-concurrent-replay-${suffix}`,
        correlationId: "correlation-concurrent-replay",
        occurredAt: canonicalOccurredAt,
      });

    const results = await Promise.all([execute("a"), execute("b")]);
    expect(results.map((result) => result.status).sort()).toEqual([
      "accepted",
      "replay",
    ]);
    expect(atomic.records).toHaveLength(1);
    expect(atomic.jobs).toHaveLength(1);
    expect(atomic.audits).toHaveLength(2);
    expect(atomic.accepted.size).toBe(1);
    expect(atomic.returnedResults).toHaveLength(2);
    for (const [index, result] of results.entries()) {
      expect(result).not.toBe(atomic.returnedResults[index]);
      expect(result.recordIds).not.toBe(
        atomic.returnedResults[index]?.recordIds,
      );
      expectDeepFrozen(result);
    }
    for (const value of [
      ...atomic.records,
      ...atomic.jobs,
      ...atomic.audits,
      ...atomic.accepted.values(),
    ]) {
      expectDeepFrozen(value);
    }
  });

  it("atomically resolves concurrent changed payloads as accepted plus conflict without replacing prior state", async () => {
    const subject = await loadControlledImports();
    requireFunction(
      subject.acceptControlledImportBatch,
      "acceptControlledImportBatch",
    );
    const atomic = createAtomicRepositoryFake({ barrier: createBarrier(2) });
    const audit = auditPortDouble();
    const plans = [
      readyPlan({ batchDigest: "1".repeat(64), amountMinor: "13230000" }),
      readyPlan({ batchDigest: "2".repeat(64), amountMinor: "13220000" }),
    ];
    const results = await Promise.all(
      plans.map((plan, index) =>
        subject.acceptControlledImportBatch({
          plan,
          authorizationInput,
          authorizationPort: allowingAuthorizationPort(),
          auditPort: audit.port,
          repository: atomic.repository,
          requestId: `request-concurrent-conflict-${index}`,
          correlationId: "correlation-concurrent-conflict",
          occurredAt: canonicalOccurredAt,
        }),
      ),
    );

    expect(results.map((result) => result.status).sort()).toEqual([
      "accepted",
      "conflict",
    ]);
    expect(
      results.find((result) => result.status === "conflict"),
    ).toMatchObject({
      reason: "payload-digest-mismatch",
    });
    expect(atomic.records).toHaveLength(1);
    expect(atomic.jobs).toHaveLength(1);
    expect(atomic.audits).toHaveLength(2);
    expect(atomic.accepted.size).toBe(1);
    const acceptedState = [...atomic.accepted.values()][0];
    expect(acceptedState?.batchDigest).toBe(
      results[0]?.status === "accepted"
        ? plans[0]?.batchDigest
        : plans[1]?.batchDigest,
    );
    expectDeepFrozen(acceptedState);
    for (const result of results) expectDeepFrozen(result);
  });

  it("detects every provider, database, runtime, raw SQL, and dynamic boundary with compiler AST", () => {
    const fixtures: ReadonlyArray<readonly [string, string]> = [
      ['import { google } from "googleapis";', "import"],
      ['import { financeRecords } from "@reading-advantage/db";', "import"],
      ['import { drizzle } from "drizzle-orm";', "import"],
      ['import postgres from "postgres";', "import"],
      ['import { S3Client } from "@aws-sdk/client-s3";', "import"],
      ['import { Storage } from "@google-cloud/storage";', "import"],
      ['import admin from "firebase-admin";', "import"],
      [
        'import type { CompanyIdentityService } from "../company-identity/index.js";',
        "import-escape",
      ],
      [
        'import type { FinanceRecord } from "./nested/../../company-identity/contracts.js";',
        "import-escape",
      ],
      ["const provider = await import(providerName);", "dynamic-import"],
      ['await fetch("https://provider.invalid");', "runtime-access"],
      ['require("provider");', "runtime-access"],
      ['new WebSocket("wss://provider.invalid");', "runtime-access"],
      ["new XMLHttpRequest();", "runtime-access"],
      ["const secret = process.env.DATABASE_URL;", "runtime-global"],
      ["const secret = Bun.env.DATABASE_URL;", "runtime-global"],
      ['const file = Deno.readFile("source");', "runtime-global"],
      ["await database.select().from(table);", "database-call"],
      ['await database["insert"](row);', "database-call"],
      ["await database.update(table).set(row);", "database-call"],
      ["await database.delete(table);", "database-call"],
      ['await database.query("statement");', "database-call"],
      ["await database.execute(query);", "database-call"],
      ["await database.transaction(callback);", "database-call"],
      ['await globalThis.fetch("https://provider.invalid");', "runtime-access"],
      ["const query = sql`SELECT * FROM finance_records`;", "raw-sql"],
    ];
    for (const [source, expectedKind] of fixtures) {
      expect(
        collectControlledImportBoundaryViolations(
          CONTROLLED_IMPORTS_PATH,
          source,
        ),
        source,
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: expectedKind }),
        ]),
      );
    }
    expect(
      collectControlledImportBoundaryViolations(
        CONTROLLED_IMPORTS_PATH,
        'import { z } from "zod"; import type { FinanceAuditPort } from "./audit.js"; export const schema = z.string();',
      ),
    ).toEqual([]);
  });

  it("keeps deferred CRM and Tutor adapters and envelopes out of the Finance Phase 2 source", async () => {
    if (!existsSync(CONTROLLED_IMPORTS_PATH)) return;
    const source = await readFile(CONTROLLED_IMPORTS_PATH, "utf8");
    const lookalikes = collectDeferredSourceOwnerLookalikes(source);
    expect(lookalikes).toEqual([]);
  });

  it("detects every deferred source-owner marker in the guard AST", () => {
    const syntheticSource = DEFERRED_SOURCE_OWNER_MARKERS.map(
      (marker, index) =>
        `const deferredMarker${index} = ${JSON.stringify(marker)};`,
    ).join("\n");
    expect(collectDeferredSourceOwnerLookalikes(syntheticSource)).toEqual([
      ...DEFERRED_SOURCE_OWNER_MARKERS,
    ]);
  });

  it("keeps controlled-import production code behind compiler-checked internal boundaries", async () => {
    if (!existsSync(CONTROLLED_IMPORTS_PATH)) return;
    const source = await readFile(CONTROLLED_IMPORTS_PATH, "utf8");
    expect(
      collectControlledImportBoundaryViolations(
        CONTROLLED_IMPORTS_PATH,
        source,
      ),
    ).toEqual([]);
  });
});
