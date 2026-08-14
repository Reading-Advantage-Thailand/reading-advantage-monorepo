import { describe, expect, it, vi } from "vitest";

import type { FinanceOperationScope } from "../contracts.js";

const ENVELOPE_VERSION = "finance-controlled-source-envelope-v1" as const;
const NORMALIZATION_VERSION =
  "finance-controlled-import-normalization-v1" as const;
const PACKET_VERSION = "historical-private-evidence-packet.v1" as const;

const requestedScope = {
  companyId: "company-a",
  schoolId: "school-a",
} as const;
const validEvidenceReference =
  "private-evidence://company-a/finance/sanitized/receipt-001";

interface TrustedPreparationCommand {
  prepare(input: unknown): Promise<unknown>;
}

interface ControlledImportsReviewModule {
  historicalPrivateEvidencePacketSchema: {
    safeParse(input: unknown): { readonly success: boolean };
  };
  prepareControlledImportBatch(input: unknown): unknown;
  acceptControlledImportBatch(request: unknown): Promise<unknown>;
  createHistoricalPrivateEvidenceImportCommand(
    input: unknown,
  ): TrustedPreparationCommand;
  runHistoricalPrivateEvidencePilot?: (input: unknown) => Promise<unknown>;
}

interface AttestationRequest {
  readonly scope: FinanceOperationScope;
}

interface EvidenceBindingRequest {
  readonly evidenceReference: string;
  readonly scope: FinanceOperationScope;
  readonly expectedPayloadDigest: string;
}

interface ResultRecord {
  readonly status: string;
  readonly [key: string]: unknown;
}

/** Loads the public Finance Operations boundary under review. */
async function loadControlledImports(): Promise<ControlledImportsReviewModule> {
  return (await import("../index.js")) as unknown as ControlledImportsReviewModule;
}

/** Builds a policy-neutral payment receipt document for boundary probes. */
function paymentReceiptDocument(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    sourceDocumentId: "receipt-001",
    logicalDocumentId: "receipt-001",
    sourceDocumentKind: "payment-receipt",
    thaiTaxDocumentStatus: "not-source-asserted",
    currency: "THB",
    facts: [
      {
        factId: "payment-total",
        kind: "money",
        amountDecimal: "100.00",
      },
    ],
    ...overrides,
  };
}

/** Builds a policy-neutral school billing document for trusted metadata probes. */
function schoolBillingDocument(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    sourceDocumentId: "school-billing-001",
    logicalDocumentId: "school-billing-001",
    sourceDocumentKind: "school-billing-invoice",
    thaiTaxDocumentStatus: "unresolved",
    currency: "THB",
    variantId: "term-1",
    ambiguityGroupId: "school-billing-group-1",
    facts: [
      {
        factId: "invoice-total",
        kind: "money",
        amountDecimal: "100.00",
      },
    ],
    ...overrides,
  };
}

/** Builds a school billing document with only the stated trusted metadata fields. */
function schoolBillingDocumentWithMetadata(input: {
  readonly sourceDocumentId: string;
  readonly logicalDocumentId: string;
  readonly variantId?: string;
  readonly ambiguityGroupId?: string;
}): Record<string, unknown> {
  const {
    variantId: defaultVariantId,
    ambiguityGroupId: defaultAmbiguityGroupId,
    ...document
  } = schoolBillingDocument({
    sourceDocumentId: input.sourceDocumentId,
    logicalDocumentId: input.logicalDocumentId,
  });
  void defaultVariantId;
  void defaultAmbiguityGroupId;
  return {
    ...document,
    ...(input.variantId === undefined ? {} : { variantId: input.variantId }),
    ...(input.ambiguityGroupId === undefined
      ? {}
      : { ambiguityGroupId: input.ambiguityGroupId }),
  };
}

/** Returns normalized snapshots from either valid controlled-import outcome. */
function normalizedSnapshots(
  result: unknown,
): readonly Record<string, unknown>[] {
  const outcome = result as {
    readonly status: string;
    readonly snapshots?: readonly Record<string, unknown>[];
    readonly variants?: readonly Record<string, unknown>[];
  };
  if (outcome.status === "ready") return outcome.snapshots ?? [];
  if (outcome.status === "unresolved") return outcome.variants ?? [];
  throw new Error("Expected a controlled-import normalization outcome.");
}

/** Wraps one document in the caller-shaped envelope that the current implementation trusts. */
function callerEnvelope(
  input: {
    readonly document?: Record<string, unknown>;
    readonly envelopeScope?: FinanceOperationScope;
    readonly evidenceReference?: string;
    readonly payloadDigest?: string;
  } = {},
): Record<string, unknown> {
  const document = input.document ?? paymentReceiptDocument();
  const payloadDigest = input.payloadDigest ?? "a".repeat(64);
  const evidenceReference = input.evidenceReference ?? validEvidenceReference;
  const snapshot = { evidenceReference, payloadDigest };
  return {
    envelopeVersion: ENVELOPE_VERSION,
    scope: input.envelopeScope ?? requestedScope,
    sourceSystem: "owner-attested-archive",
    sourceVersion: "archive-v1",
    sourceRecordId: document.sourceDocumentId,
    sourceAcceptance: {
      port: "private-evidence-storage",
      snapshot,
    },
    evidenceAuthorization: snapshot,
    document,
  };
}

/** Builds the current normalization request without contacting a live source system. */
function normalizationRequest(input: {
  readonly batchId: string;
  readonly envelopes: readonly Record<string, unknown>[];
  readonly scope?: FinanceOperationScope;
  readonly trustedPreparation?: unknown;
  readonly trustedPreparations?: readonly unknown[];
}): Record<string, unknown> {
  return {
    normalizationVersion: NORMALIZATION_VERSION,
    scope: input.scope ?? requestedScope,
    batchId: input.batchId,
    acceptedSourceEnvelopes: input.envelopes,
    ...(input.trustedPreparation === undefined
      ? {}
      : { trustedPreparation: input.trustedPreparation }),
    ...(input.trustedPreparations === undefined
      ? {}
      : { trustedPreparations: input.trustedPreparations }),
  };
}

/** Creates a genuine Phase 1 preparation artifact with injected owner-boundary fakes. */
type TrustedPacketFact = Readonly<{
  readonly factCategory: string;
  readonly factId: string;
  readonly label: string;
  readonly value: string;
  readonly normalizationBinding?: Readonly<
    | {
        readonly bindingKind: "document-money";
        readonly normalizedFactId: string;
        readonly sourceText?: string;
      }
    | {
        readonly bindingKind: "document-count";
        readonly normalizedFactId: string;
      }
    | {
        readonly bindingKind: "payroll-money";
        readonly voucherNumberText: string;
        readonly sourceDateText: string;
        readonly moneyKind: "gross" | "source-stated-wht" | "net";
      }
  >;
}>;

/** Tests whether a fixture fact is controlled-import metadata. */
function isMetadataPacketFact(fact: TrustedPacketFact): boolean {
  return (
    fact.factCategory === "document-class" ||
    fact.factCategory === "document-status" ||
    fact.factCategory === "currency" ||
    fact.factCategory === "tax-label" ||
    [
      "document-reference:source-record",
      "document-reference:receipt-number",
      "document-reference:invoice-number",
      "document-reference:document-number",
      "document-reference:variant-id",
      "document-reference:ambiguity-group-id",
    ].includes(fact.factId)
  );
}

/** Builds the trusted Thai tax status metadata required for controlled documents. */
function thaiTaxStatusFact(
  value: "not-source-asserted" | "unresolved",
): TrustedPacketFact {
  return {
    factCategory: "document-status",
    factId: "document-status:thai-tax-document-status",
    label: "Thai tax document status as stated",
    value,
  };
}

/** Builds the trusted school-billing variant metadata. */
function schoolVariantFact(value: string): TrustedPacketFact {
  return {
    factCategory: "document-reference",
    factId: "document-reference:variant-id",
    label: "School billing variant as stated",
    value,
  };
}

/** Builds the trusted school-billing ambiguity-group metadata. */
function schoolAmbiguityGroupFact(value: string): TrustedPacketFact {
  return {
    factCategory: "document-reference",
    factId: "document-reference:ambiguity-group-id",
    label: "School billing ambiguity group as stated",
    value,
  };
}

async function trustedPreparationFor(
  subject: ControlledImportsReviewModule,
  scope: FinanceOperationScope,
  evidenceReference: string,
  options: {
    readonly sourceIdentity?: string;
    readonly payloadDigest?: string;
    readonly factValue?: string;
    readonly packetFact?: Omit<TrustedPacketFact, "value">;
    readonly packetFacts?: readonly TrustedPacketFact[];
    readonly document?: Readonly<Record<string, unknown>>;
    readonly bindValueFacts?: boolean;
    readonly includeDocumentStatus?: boolean;
  } = {},
): Promise<unknown> {
  const sourceIdentity = options.sourceIdentity ?? "receipt-001";
  const payloadDigest = options.payloadDigest ?? "a".repeat(64);
  const valueFacts = options.packetFacts ?? [
    {
      factCategory: options.packetFact?.factCategory ?? "document-total",
      factId: options.packetFact?.factId ?? "document-total:receipt-total",
      label: options.packetFact?.label ?? "Receipt total as stated",
      value: options.factValue ?? "100.00",
    },
  ];
  const suppliedClass = valueFacts.find(
    (fact) => fact.factCategory === "document-class",
  );
  const candidateDocumentKind =
    (options.document?.sourceDocumentKind as string | undefined) ??
    suppliedClass?.value ??
    (valueFacts.some((fact) => fact.factCategory === "tax-label")
      ? "foreign-workspace-invoice"
      : valueFacts.some((fact) => fact.factCategory === "payroll-summary")
        ? "payroll-summary"
        : valueFacts.some((fact) => fact.factCategory === "billing-summary")
          ? "school-billing-invoice"
          : "payment-receipt");
  const documentKind:
    | "payment-receipt"
    | "school-billing-invoice"
    | "payroll-summary"
    | "foreign-workspace-invoice" =
    candidateDocumentKind === "payment-receipt"
      ? "payment-receipt"
      : candidateDocumentKind === "school-billing-invoice"
        ? "school-billing-invoice"
        : candidateDocumentKind === "payroll-summary"
          ? "payroll-summary"
          : candidateDocumentKind === "foreign-workspace-invoice"
            ? "foreign-workspace-invoice"
            : "payment-receipt";
  const logicalDocumentId =
    (options.document?.logicalDocumentId as string | undefined) ??
    sourceIdentity;
  const logicalReferenceFactId = {
    "payment-receipt": "document-reference:receipt-number",
    "school-billing-invoice": "document-reference:invoice-number",
    "payroll-summary": "document-reference:document-number",
    "foreign-workspace-invoice": "document-reference:invoice-number",
  }[documentKind];
  const metadataFacts: TrustedPacketFact[] = [
    ...(suppliedClass === undefined
      ? [
          {
            factCategory: "document-class",
            factId: `document-class:${documentKind}`,
            label: "Document class as stated",
            value: documentKind,
          },
        ]
      : []),
    ...(valueFacts.some(
      (fact) => fact.factId === "document-reference:source-record",
    )
      ? []
      : [
          {
            factCategory: "document-reference",
            factId: "document-reference:source-record",
            label: "Source record as stated",
            value: sourceIdentity,
          },
        ]),
    ...(valueFacts.some((fact) => fact.factId === "currency:document-currency")
      ? []
      : [
          {
            factCategory: "currency",
            factId: "currency:document-currency",
            label: "Document currency as stated",
            value: (options.document?.currency as string | undefined) ?? "THB",
          },
        ]),
    ...(options.includeDocumentStatus === false ||
    valueFacts.some(
      (fact) => fact.factId === "document-status:thai-tax-document-status",
    )
      ? []
      : [
          thaiTaxStatusFact(
            (options.document?.thaiTaxDocumentStatus as
              | "not-source-asserted"
              | "unresolved"
              | undefined) ??
              (documentKind === "school-billing-invoice" ||
              documentKind === "payroll-summary"
                ? "unresolved"
                : "not-source-asserted"),
          ),
        ]),
    ...(logicalDocumentId !== sourceIdentity &&
    !valueFacts.some((fact) => fact.factId === logicalReferenceFactId)
      ? [
          {
            factCategory: "document-reference",
            factId: logicalReferenceFactId,
            label: "Logical document reference as stated",
            value: logicalDocumentId,
          },
        ]
      : []),
  ];
  if (
    documentKind === "school-billing-invoice" &&
    options.packetFacts === undefined
  ) {
    const variantId = options.document?.variantId as string | undefined;
    const ambiguityGroupId = options.document?.ambiguityGroupId as
      | string
      | undefined;
    if (
      variantId !== undefined &&
      !valueFacts.some(
        (fact) => fact.factId === "document-reference:variant-id",
      )
    ) {
      metadataFacts.push(schoolVariantFact(variantId));
    }
    if (
      ambiguityGroupId !== undefined &&
      !valueFacts.some(
        (fact) => fact.factId === "document-reference:ambiguity-group-id",
      )
    ) {
      metadataFacts.push(schoolAmbiguityGroupFact(ambiguityGroupId));
    }
  }
  if (
    documentKind === "foreign-workspace-invoice" &&
    !valueFacts.some((fact) => fact.factCategory === "tax-label")
  ) {
    const sourceStatedTax = options.document?.sourceStatedTax as
      | Readonly<{ readonly label: string; readonly rateText: string }>
      | undefined;
    if (sourceStatedTax === undefined) {
      throw new Error("Missing foreign invoice tax fixture.");
    }
    metadataFacts.push({
      factCategory: "tax-label",
      factId: "tax-label:gst",
      label: sourceStatedTax.label,
      value: sourceStatedTax.rateText,
    });
  }
  const fixtureDocument =
    options.document ?? (paymentReceiptDocument() as Record<string, unknown>);
  const callerFacts = (fixtureDocument.facts ?? []) as readonly Readonly<{
    readonly factId: string;
    readonly kind: "money" | "count";
    readonly sourceText?: string;
  }>[];
  const callerVouchers = (fixtureDocument.vouchers ?? []) as readonly Readonly<{
    readonly voucherNumberText: string;
    readonly sourceDateText: string;
  }>[];
  let documentFactIndex = 0;
  const payrollOccurrences = new Map<string, number>();
  const boundValueFacts = valueFacts.map((fact): TrustedPacketFact => {
    if (
      isMetadataPacketFact(fact) ||
      fact.normalizationBinding !== undefined ||
      options.bindValueFacts === false
    ) {
      return fact;
    }
    if (documentKind === "payroll-summary") {
      const moneyKind =
        fact.factId === "payroll-summary:gross-total"
          ? "gross"
          : fact.factId === "payroll-summary:withholding-total"
            ? "source-stated-wht"
            : fact.factId === "payroll-summary:net-total"
              ? "net"
              : undefined;
      if (moneyKind === undefined) return fact;
      const occurrence = payrollOccurrences.get(moneyKind) ?? 0;
      payrollOccurrences.set(moneyKind, occurrence + 1);
      const voucher = callerVouchers[occurrence];
      if (voucher === undefined) return fact;
      return {
        ...fact,
        normalizationBinding: {
          bindingKind: "payroll-money",
          voucherNumberText: voucher.voucherNumberText,
          sourceDateText: voucher.sourceDateText,
          moneyKind,
        },
      };
    }

    const callerFact = callerFacts[documentFactIndex];
    documentFactIndex += 1;
    if (callerFact === undefined) return fact;
    return {
      ...fact,
      normalizationBinding:
        callerFact.kind === "count"
          ? {
              bindingKind: "document-count",
              normalizedFactId: callerFact.factId,
            }
          : {
              bindingKind: "document-money",
              normalizedFactId: callerFact.factId,
              ...(callerFact.sourceText === undefined
                ? {}
                : { sourceText: callerFact.sourceText }),
            },
    };
  });
  const packetFacts = [...boundValueFacts, ...metadataFacts];
  const createCommand = subject.createHistoricalPrivateEvidenceImportCommand;
  expect(createCommand).toBeTypeOf("function");
  const command = createCommand({
    companyIdentityAttestor: {
      attest: vi.fn(async (input: AttestationRequest) => ({
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
      })),
    },
    privateEvidenceBindingPort: {
      verify: vi.fn(async (input: EvidenceBindingRequest) => ({
        evidenceReference: input.evidenceReference,
        scope: input.scope,
        payloadDigest: input.expectedPayloadDigest,
      })),
    },
  });
  const preparation = await command.prepare({
    packet: {
      packetVersion: PACKET_VERSION,
      scope,
      source: {
        sourceSystem: "owner-attested-archive",
        sourceVersion: "archive-v1",
        sourceIdentity,
        payloadDigest,
        evidenceReference,
      },
      facts: packetFacts.map((fact) => ({
        ...fact,
        kind: "source-stated-value" as const,
      })),
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
  const prepared = preparation as {
    readonly packet: {
      readonly source: {
        readonly payloadDigest: string;
        readonly evidenceReference: string;
      };
      readonly facts: readonly Record<string, unknown>[];
    };
    readonly evidence: {
      readonly payloadDigest: string;
      readonly evidenceReference: string;
    };
  };
  expect(prepared.packet.source.payloadDigest).toBe(payloadDigest);
  expect(prepared.packet.source.evidenceReference).toBe(evidenceReference);
  expect(prepared.evidence.payloadDigest).toBe(payloadDigest);
  expect(prepared.evidence.evidenceReference).toBe(evidenceReference);
  expect(prepared.packet.facts).toHaveLength(packetFacts.length);
  for (const fact of packetFacts) {
    expect(prepared.packet.facts).toEqual(
      expect.arrayContaining([expect.objectContaining({ value: fact.value })]),
    );
  }
  return preparation;
}

/** Recursively freezes a caller-built fixture for capability-bypass tests. */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Adds real owner-boundary preparations to a normalization request. */
async function trustedNormalizationRequest(
  subject: ControlledImportsReviewModule,
  input: {
    readonly batchId: string;
    readonly envelopes: readonly Record<string, unknown>[];
    readonly scope?: FinanceOperationScope;
  },
): Promise<Record<string, unknown>> {
  const preparations = await Promise.all(
    input.envelopes.map((envelope) => {
      const document = envelope.document as Record<string, unknown>;
      const evidence = envelope.evidenceAuthorization as Record<
        string,
        unknown
      >;
      const envelopeScope = envelope.scope as FinanceOperationScope;
      return trustedPreparationFor(
        subject,
        envelopeScope,
        evidence.evidenceReference as string,
        {
          sourceIdentity: envelope.sourceRecordId as string,
          payloadDigest: evidence.payloadDigest as string,
          document,
        },
      ).then((preparation) => {
        expect(document.sourceDocumentId).toBe(envelope.sourceRecordId);
        return preparation;
      });
    }),
  );
  return normalizationRequest({
    ...input,
    ...(preparations.length === 1
      ? { trustedPreparation: preparations[0] }
      : { trustedPreparations: preparations }),
  });
}

/** Builds an authorization input for the atomic acceptance probes. */
function authorizationInput(): Record<string, unknown> {
  return {
    operation: "controlled-import:accept-batch",
    scope: requestedScope,
    authorizationEvidence: {
      source: "company-identity",
      claimsVersion: "company-identity-claims-v1",
      subjectId: "employee-importer",
      organizationId: requestedScope.companyId,
      appRoleIds: ["finance-import-operator"],
      schoolIds: [requestedScope.schoolId],
    },
  };
}

/** Creates the audit and repository fakes used by fail-closed command tests. */
function commandFakes(): {
  readonly auditPort: { readonly append: ReturnType<typeof vi.fn> };
  readonly repository: {
    readonly applyBatchAtomically: ReturnType<typeof vi.fn>;
  };
} {
  return {
    auditPort: {
      append: vi.fn(async (event: Record<string, unknown>) => ({
        eventId: event.eventId,
        receiptId: `receipt-${String(event.eventId)}`,
      })),
    },
    repository: {
      applyBatchAtomically: vi.fn(async () => ({
        status: "accepted",
        recordIds: ["record-001"],
      })),
    },
  };
}

/** Prepares one current-shape ready plan for authorization probes. */
async function preparedPlan(
  subject: ControlledImportsReviewModule,
): Promise<Record<string, unknown>> {
  const result = subject.prepareControlledImportBatch(
    await trustedNormalizationRequest(subject, {
      batchId: "controlled-import-batch-001",
      envelopes: [callerEnvelope()],
    }),
  );
  expect(result).toMatchObject({ status: "ready" });
  return result as Record<string, unknown>;
}

describe("Finance Operations Phase 2 Review B remediation RED contract", () => {
  it("rejects document facts that differ from the trusted packet preparation", async () => {
    const subject = await loadControlledImports();
    const cleanEnvelope = callerEnvelope();
    const genuinePreparation = await trustedPreparationFor(
      subject,
      requestedScope,
      validEvidenceReference,
    );
    const cleanResult = subject.prepareControlledImportBatch(
      normalizationRequest({
        batchId: "trusted-fact-control-batch",
        envelopes: [cleanEnvelope],
        trustedPreparation: genuinePreparation,
      }),
    );
    expect(cleanResult).toMatchObject({ status: "ready" });

    const tamperedEnvelope = callerEnvelope({
      document: paymentReceiptDocument({
        facts: [
          {
            factId: "payment-total",
            kind: "money",
            amountDecimal: "999.00",
          },
        ],
      }),
    });
    const tamperedRequest = normalizationRequest({
      batchId: "trusted-fact-tamper-batch",
      envelopes: [tamperedEnvelope],
      trustedPreparation: genuinePreparation,
    });

    let result: unknown;
    try {
      result = subject.prepareControlledImportBatch(tamperedRequest);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      return;
    }

    expect(result).toMatchObject({ status: "ready" });
    const snapshot = (result as { readonly snapshots: readonly unknown[] })
      .snapshots[0] as { readonly facts: readonly Record<string, unknown>[] };
    expect(snapshot.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ amountMinor: "10000" }),
      ]),
    );
    expect(snapshot.facts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ amountMinor: "99900" }),
      ]),
    );
  });

  it("rejects a trusted value fact without a normalization binding", async () => {
    const subject = await loadControlledImports();
    const preparation = await trustedPreparationFor(
      subject,
      requestedScope,
      validEvidenceReference,
      { bindValueFacts: false },
    );

    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "missing-normalization-binding-batch",
          envelopes: [callerEnvelope()],
          trustedPreparation: preparation,
        }),
      ),
    ).toThrow("trusted normalized fact binding is required");
  });

  it("rejects duplicate trusted nonpayroll normalized fact IDs", async () => {
    const subject = await loadControlledImports();
    const evidenceReference =
      "private-evidence://company-a/finance/sanitized/duplicate-normalized-fact";
    const document = {
      sourceDocumentId: "duplicate-normalized-fact",
      logicalDocumentId: "duplicate-normalized-fact",
      sourceDocumentKind: "school-billing-invoice",
      thaiTaxDocumentStatus: "unresolved",
      currency: "THB",
      facts: [
        {
          factId: "invoice-total",
          kind: "money",
          amountDecimal: "100.00",
        },
        {
          factId: "unbound-total",
          kind: "money",
          amountDecimal: "200.00",
        },
      ],
    };
    const preparation = await trustedPreparationFor(
      subject,
      requestedScope,
      evidenceReference,
      {
        sourceIdentity: "duplicate-normalized-fact",
        document,
        packetFacts: [
          {
            factCategory: "document-total",
            factId: "document-total:invoice-total",
            label: "Invoice total as stated",
            value: "100.00",
            normalizationBinding: {
              bindingKind: "document-money",
              normalizedFactId: "invoice-total",
            },
          },
          {
            factCategory: "document-total",
            factId: "document-total:amount-due",
            label: "Amount due as stated",
            value: "200.00",
            normalizationBinding: {
              bindingKind: "document-money",
              normalizedFactId: "invoice-total",
            },
          },
        ],
      },
    );

    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "duplicate-normalized-fact-batch",
          envelopes: [callerEnvelope({ document, evidenceReference })],
          trustedPreparation: preparation,
        }),
      ),
    ).toThrow("duplicate trusted document fact identity");
  });

  it("keeps trusted document metadata independent from packet fact order", async () => {
    const subject = await loadControlledImports();
    const envelope = callerEnvelope({
      document: paymentReceiptDocument({
        sourceDocumentId: "receipt-metadata-order-001",
        logicalDocumentId: "receipt-metadata-order-001",
      }),
      evidenceReference:
        "private-evidence://company-a/finance/sanitized/receipt-metadata-order-001",
    });
    const preparation = await trustedPreparationFor(
      subject,
      requestedScope,
      "private-evidence://company-a/finance/sanitized/receipt-metadata-order-001",
      {
        sourceIdentity: "receipt-metadata-order-001",
        document: envelope.document as Readonly<Record<string, unknown>>,
        packetFacts: [
          {
            factCategory: "currency",
            factId: "currency:document-currency",
            label: "Document currency as stated",
            value: "THB",
          },
          {
            factCategory: "document-total",
            factId: "document-total:receipt-total",
            label: "Receipt total as stated",
            value: "100.00",
          },
          {
            factCategory: "document-reference",
            factId: "document-reference:source-record",
            label: "Source record as stated",
            value: "receipt-metadata-order-001",
          },
          {
            factCategory: "document-class",
            factId: "document-class:payment-receipt",
            label: "Payment receipt class as stated",
            value: "payment-receipt",
          },
        ],
      },
    );

    const result = subject.prepareControlledImportBatch(
      normalizationRequest({
        batchId: "trusted-metadata-order-batch",
        envelopes: [envelope],
        trustedPreparation: preparation,
      }),
    ) as {
      readonly status: string;
      readonly snapshots: readonly {
        readonly facts: readonly Record<string, unknown>[];
      }[];
    };

    expect(result).toMatchObject({ status: "ready" });
    expect(result.snapshots[0]?.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ amountMinor: "10000", currency: "THB" }),
      ]),
    );
  });

  it("keeps generic packets parsable but rejects a caller-only Thai tax document status", async () => {
    const subject = await loadControlledImports();
    const genericPacket = {
      packetVersion: PACKET_VERSION,
      scope: requestedScope,
      source: {
        sourceSystem: "owner-attested-archive",
        sourceVersion: "archive-v1",
        sourceIdentity: "generic-payment-receipt-001",
        payloadDigest: "a".repeat(64),
        evidenceReference:
          "private-evidence://company-a/finance/sanitized/generic-payment-receipt-001",
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
    };
    expect(
      subject.historicalPrivateEvidencePacketSchema.safeParse(genericPacket),
    ).toMatchObject({ success: true });

    const document = paymentReceiptDocument({
      sourceDocumentId: "generic-payment-receipt-001",
      logicalDocumentId: "generic-payment-receipt-001",
    });
    const preparation = await trustedPreparationFor(
      subject,
      requestedScope,
      "private-evidence://company-a/finance/sanitized/generic-payment-receipt-001",
      {
        sourceIdentity: "generic-payment-receipt-001",
        document,
        includeDocumentStatus: false,
      },
    );

    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "missing-thai-tax-document-status-batch",
          envelopes: [
            callerEnvelope({
              document,
              evidenceReference:
                "private-evidence://company-a/finance/sanitized/generic-payment-receipt-001",
            }),
          ],
          trustedPreparation: preparation,
        }),
      ),
    ).toThrow("trusted Thai tax document status fact is required");
  });

  it("maps the trusted Thai tax document status instead of a caller-selected receipt status", async () => {
    const subject = await loadControlledImports();
    const evidenceReference =
      "private-evidence://company-a/finance/sanitized/trusted-thai-tax-status-001";
    const trustedDocument = paymentReceiptDocument({
      sourceDocumentId: "trusted-thai-tax-status-001",
      logicalDocumentId: "trusted-thai-tax-status-001",
      thaiTaxDocumentStatus: "not-source-asserted",
    });
    const preparation = await trustedPreparationFor(
      subject,
      requestedScope,
      evidenceReference,
      {
        sourceIdentity: "trusted-thai-tax-status-001",
        document: trustedDocument,
        packetFacts: [
          {
            factCategory: "document-total",
            factId: "document-total:receipt-total",
            label: "Receipt total as stated",
            value: "100.00",
          },
          thaiTaxStatusFact("not-source-asserted"),
        ],
      },
    );
    const cleanResult = subject.prepareControlledImportBatch(
      normalizationRequest({
        batchId: "trusted-thai-tax-status-clean-batch",
        envelopes: [
          callerEnvelope({ document: trustedDocument, evidenceReference }),
        ],
        trustedPreparation: preparation,
      }),
    );
    expect(cleanResult).toMatchObject({ status: "ready" });
    expect(normalizedSnapshots(cleanResult)[0]).toMatchObject({
      thaiTaxDocumentStatus: "not-source-asserted",
    });

    const callerChangedDocument = paymentReceiptDocument({
      sourceDocumentId: "trusted-thai-tax-status-001",
      logicalDocumentId: "trusted-thai-tax-status-001",
      thaiTaxDocumentStatus: "unresolved",
    });
    let changedResult: unknown;
    try {
      changedResult = subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "trusted-thai-tax-status-tamper-batch",
          envelopes: [
            callerEnvelope({
              document: callerChangedDocument,
              evidenceReference,
            }),
          ],
          trustedPreparation: preparation,
        }),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      return;
    }

    expect(changedResult).toMatchObject({ status: "ready" });
    expect(normalizedSnapshots(changedResult)[0]).toMatchObject({
      thaiTaxDocumentStatus: "not-source-asserted",
    });
  });

  it.each([
    {
      name: "equal Thai tax document status facts",
      facts: [
        thaiTaxStatusFact("not-source-asserted"),
        thaiTaxStatusFact("not-source-asserted"),
      ],
    },
    {
      name: "conflicting Thai tax document status facts",
      facts: [
        thaiTaxStatusFact("not-source-asserted"),
        thaiTaxStatusFact("unresolved"),
      ],
    },
  ] as const)("rejects $name", async ({ facts }) => {
    const subject = await loadControlledImports();
    const evidenceReference =
      "private-evidence://company-a/finance/sanitized/duplicate-thai-tax-status-001";
    const document = paymentReceiptDocument({
      sourceDocumentId: "duplicate-thai-tax-status-001",
      logicalDocumentId: "duplicate-thai-tax-status-001",
    });
    await expect(
      trustedPreparationFor(subject, requestedScope, evidenceReference, {
        sourceIdentity: "duplicate-thai-tax-status-001",
        document,
        packetFacts: [
          {
            factCategory: "document-total",
            factId: "document-total:receipt-total",
            label: "Receipt total as stated",
            value: "100.00",
          },
          ...facts,
        ],
      }),
    ).rejects.toThrow("FINANCE_PACKET_INVALID");
  });

  it("maps trusted school variant metadata and rejects a caller-selected variant", async () => {
    const subject = await loadControlledImports();
    const evidenceReference =
      "private-evidence://company-a/finance/sanitized/trusted-school-variant-001";
    const trustedDocument = schoolBillingDocument({
      sourceDocumentId: "trusted-school-variant-001",
      logicalDocumentId: "trusted-school-variant-001",
      variantId: "term-1",
      ambiguityGroupId: "trusted-school-group-1",
    });
    const preparation = await trustedPreparationFor(
      subject,
      requestedScope,
      evidenceReference,
      {
        sourceIdentity: "trusted-school-variant-001",
        document: trustedDocument,
        packetFacts: [
          {
            factCategory: "document-total",
            factId: "document-total:invoice-total",
            label: "Invoice total as stated",
            value: "100.00",
          },
          thaiTaxStatusFact("unresolved"),
          schoolVariantFact("term-1"),
          schoolAmbiguityGroupFact("trusted-school-group-1"),
        ],
      },
    );
    const cleanResult = subject.prepareControlledImportBatch(
      normalizationRequest({
        batchId: "trusted-school-variant-clean-batch",
        envelopes: [
          callerEnvelope({ document: trustedDocument, evidenceReference }),
        ],
        trustedPreparation: preparation,
      }),
    );
    expect(cleanResult).toMatchObject({ status: "ready" });
    expect(normalizedSnapshots(cleanResult)[0]).toMatchObject({
      variantId: "term-1",
    });

    const callerChangedDocument = schoolBillingDocument({
      sourceDocumentId: "trusted-school-variant-001",
      logicalDocumentId: "trusted-school-variant-001",
      variantId: "caller-selected-variant",
      ambiguityGroupId: "trusted-school-group-1",
    });
    let changedResult: unknown;
    try {
      changedResult = subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "trusted-school-variant-tamper-batch",
          envelopes: [
            callerEnvelope({
              document: callerChangedDocument,
              evidenceReference,
            }),
          ],
          trustedPreparation: preparation,
        }),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      return;
    }

    expect(changedResult).toMatchObject({ status: "ready" });
    expect(normalizedSnapshots(changedResult)[0]).toMatchObject({
      variantId: "term-1",
    });
  });

  it.each([
    {
      name: "neither field",
      variantId: undefined,
      ambiguityGroupId: undefined,
    },
    {
      name: "a variant ID only",
      variantId: "term-1",
      ambiguityGroupId: undefined,
    },
    {
      name: "an ambiguity group ID only",
      variantId: undefined,
      ambiguityGroupId: "school-group-1",
    },
    {
      name: "both fields",
      variantId: "term-1",
      ambiguityGroupId: "school-group-1",
    },
  ] as const)(
    "keeps one school billing document ready with $name",
    async ({ variantId, ambiguityGroupId }) => {
      const subject = await loadControlledImports();
      const sourceDocumentId = `school-metadata-clean-${
        variantId === undefined ? "no-variant" : "variant"
      }-${ambiguityGroupId === undefined ? "no-group" : "group"}`;
      const evidenceReference = `private-evidence://company-a/finance/sanitized/${sourceDocumentId}`;
      const document = schoolBillingDocumentWithMetadata({
        sourceDocumentId,
        logicalDocumentId: sourceDocumentId,
        ...(variantId === undefined ? {} : { variantId }),
        ...(ambiguityGroupId === undefined ? {} : { ambiguityGroupId }),
      });
      const preparation = await trustedPreparationFor(
        subject,
        requestedScope,
        evidenceReference,
        {
          sourceIdentity: sourceDocumentId,
          document,
        },
      );
      const result = subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: `${sourceDocumentId}-batch`,
          envelopes: [callerEnvelope({ document, evidenceReference })],
          trustedPreparation: preparation,
        }),
      );

      expect(result).toMatchObject({ status: "ready" });
      const snapshot = normalizedSnapshots(result)[0];
      if (variantId === undefined) {
        expect(snapshot).not.toHaveProperty("variantId");
      } else {
        expect(snapshot).toMatchObject({ variantId });
      }
    },
  );

  it("does not let a caller switch ready school variants to unresolved", async () => {
    const subject = await loadControlledImports();
    const firstDocument = schoolBillingDocument({
      sourceDocumentId: "school-ready-variant-001",
      logicalDocumentId: "shared-school-billing-logical-id",
      variantId: "term-1",
      ambiguityGroupId: "trusted-school-group-1",
    });
    const secondDocument = schoolBillingDocument({
      sourceDocumentId: "school-ready-variant-002",
      logicalDocumentId: "shared-school-billing-logical-id",
      variantId: "term-2",
      ambiguityGroupId: "trusted-school-group-2",
    });
    const firstEvidenceReference =
      "private-evidence://company-a/finance/sanitized/school-ready-variant-001";
    const secondEvidenceReference =
      "private-evidence://company-a/finance/sanitized/school-ready-variant-002";
    const firstPayloadDigest = "1".repeat(64);
    const secondPayloadDigest = "2".repeat(64);
    const buildPacketFacts = (variantId: string, ambiguityGroupId: string) => [
      {
        factCategory: "document-total",
        factId: "document-total:invoice-total",
        label: "Invoice total as stated",
        value: "100.00",
      },
      thaiTaxStatusFact("unresolved"),
      schoolVariantFact(variantId),
      schoolAmbiguityGroupFact(ambiguityGroupId),
    ];
    const [firstPreparation, secondPreparation] = await Promise.all([
      trustedPreparationFor(subject, requestedScope, firstEvidenceReference, {
        sourceIdentity: "school-ready-variant-001",
        payloadDigest: firstPayloadDigest,
        document: firstDocument,
        packetFacts: buildPacketFacts("term-1", "trusted-school-group-1"),
      }),
      trustedPreparationFor(subject, requestedScope, secondEvidenceReference, {
        sourceIdentity: "school-ready-variant-002",
        payloadDigest: secondPayloadDigest,
        document: secondDocument,
        packetFacts: buildPacketFacts("term-2", "trusted-school-group-2"),
      }),
    ]);
    const firstEnvelope = callerEnvelope({
      document: firstDocument,
      evidenceReference: firstEvidenceReference,
      payloadDigest: firstPayloadDigest,
    });
    const secondEnvelope = callerEnvelope({
      document: secondDocument,
      evidenceReference: secondEvidenceReference,
      payloadDigest: secondPayloadDigest,
    });
    const cleanResult = subject.prepareControlledImportBatch(
      normalizationRequest({
        batchId: "trusted-school-group-clean-batch",
        envelopes: [firstEnvelope, secondEnvelope],
        trustedPreparations: [firstPreparation, secondPreparation],
      }),
    );
    expect(cleanResult).toMatchObject({ status: "ready" });

    const callerChangedSecondDocument = schoolBillingDocument({
      sourceDocumentId: "school-ready-variant-002",
      logicalDocumentId: "shared-school-billing-logical-id",
      variantId: "term-2",
      ambiguityGroupId: "trusted-school-group-1",
    });
    let changedResult: unknown;
    try {
      changedResult = subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "trusted-school-group-tamper-batch",
          envelopes: [
            firstEnvelope,
            callerEnvelope({
              document: callerChangedSecondDocument,
              evidenceReference: secondEvidenceReference,
              payloadDigest: secondPayloadDigest,
            }),
          ],
          trustedPreparations: [firstPreparation, secondPreparation],
        }),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      return;
    }

    expect(changedResult).toMatchObject({ status: "ready" });
  });

  it.each([
    {
      name: "variant ID",
      facts: [
        thaiTaxStatusFact("unresolved"),
        schoolAmbiguityGroupFact("group-1"),
      ],
    },
    {
      name: "ambiguity group ID",
      facts: [thaiTaxStatusFact("unresolved"), schoolVariantFact("term-1")],
    },
  ] as const)(
    "rejects caller-only school $name metadata",
    async ({ name, facts }) => {
      const subject = await loadControlledImports();
      const evidenceReference =
        "private-evidence://company-a/finance/sanitized/missing-school-metadata-001";
      const document = schoolBillingDocument({
        sourceDocumentId: "missing-school-metadata-001",
        logicalDocumentId: "missing-school-metadata-001",
      });
      const preparation = await trustedPreparationFor(
        subject,
        requestedScope,
        evidenceReference,
        {
          sourceIdentity: "missing-school-metadata-001",
          document,
          packetFacts: [
            {
              factCategory: "document-total",
              factId: "document-total:invoice-total",
              label: "Invoice total as stated",
              value: "100.00",
            },
            ...facts,
          ],
        },
      );

      expect(() =>
        subject.prepareControlledImportBatch(
          normalizationRequest({
            batchId: `missing-school-${name.replaceAll(" ", "-")}-batch`,
            envelopes: [callerEnvelope({ document, evidenceReference })],
            trustedPreparation: preparation,
          }),
        ),
      ).toThrow("trusted school billing metadata is incomplete");
    },
  );

  it.each([
    {
      name: "equal variant ID facts",
      facts: [
        schoolVariantFact("term-1"),
        schoolVariantFact("term-1"),
        schoolAmbiguityGroupFact("group-1"),
      ],
    },
    {
      name: "conflicting variant ID facts",
      facts: [
        schoolVariantFact("term-1"),
        schoolVariantFact("term-2"),
        schoolAmbiguityGroupFact("group-1"),
      ],
    },
    {
      name: "equal ambiguity group ID facts",
      facts: [
        schoolVariantFact("term-1"),
        schoolAmbiguityGroupFact("group-1"),
        schoolAmbiguityGroupFact("group-1"),
      ],
    },
    {
      name: "conflicting ambiguity group ID facts",
      facts: [
        schoolVariantFact("term-1"),
        schoolAmbiguityGroupFact("group-1"),
        schoolAmbiguityGroupFact("group-2"),
      ],
    },
  ] as const)("rejects $name", async ({ facts }) => {
    const subject = await loadControlledImports();
    const evidenceReference =
      "private-evidence://company-a/finance/sanitized/duplicate-school-metadata-001";
    const document = schoolBillingDocument({
      sourceDocumentId: "duplicate-school-metadata-001",
      logicalDocumentId: "duplicate-school-metadata-001",
      variantId: "term-1",
      ambiguityGroupId: "group-1",
    });
    await expect(
      trustedPreparationFor(subject, requestedScope, evidenceReference, {
        sourceIdentity: "duplicate-school-metadata-001",
        document,
        packetFacts: [
          {
            factCategory: "document-total",
            factId: "document-total:invoice-total",
            label: "Invoice total as stated",
            value: "100.00",
          },
          thaiTaxStatusFact("unresolved"),
          ...facts,
        ],
      }),
    ).rejects.toThrow("FINANCE_PACKET_INVALID");
  });

  it("rejects school billing metadata on a non-school document", async () => {
    const subject = await loadControlledImports();
    const evidenceReference =
      "private-evidence://company-a/finance/sanitized/payment-receipt-school-metadata-001";
    const document = paymentReceiptDocument({
      sourceDocumentId: "payment-receipt-school-metadata-001",
      logicalDocumentId: "payment-receipt-school-metadata-001",
    });
    const preparation = await trustedPreparationFor(
      subject,
      requestedScope,
      evidenceReference,
      {
        sourceIdentity: "payment-receipt-school-metadata-001",
        document,
        packetFacts: [
          {
            factCategory: "document-total",
            factId: "document-total:receipt-total",
            label: "Receipt total as stated",
            value: "100.00",
          },
          thaiTaxStatusFact("not-source-asserted"),
          schoolVariantFact("term-1"),
          schoolAmbiguityGroupFact("group-1"),
        ],
      },
    );

    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "payment-receipt-school-metadata-batch",
          envelopes: [callerEnvelope({ document, evidenceReference })],
          trustedPreparation: preparation,
        }),
      ),
    ).toThrow("school billing metadata requires a school-billing invoice");
  });

  it("rejects caller identity that contradicts trusted document identity facts", async () => {
    const subject = await loadControlledImports();
    const genuinePreparation = await trustedPreparationFor(
      subject,
      requestedScope,
      validEvidenceReference,
      {
        packetFacts: [
          {
            factCategory: "document-total",
            factId: "document-total:receipt-total",
            label: "Receipt total as stated",
            value: "100.00",
          },
          {
            factCategory: "document-class",
            factId: "document-class:payment-receipt",
            label: "Payment receipt class as stated",
            value: "payment-receipt",
          },
          {
            factCategory: "document-reference",
            factId: "document-reference:source-record",
            label: "Source record as stated",
            value: "receipt-001",
          },
          {
            factCategory: "currency",
            factId: "currency:document-currency",
            label: "Document currency as stated",
            value: "THB",
          },
        ],
      },
    );
    expect(genuinePreparation).toMatchObject({
      packet: {
        facts: expect.arrayContaining([
          expect.objectContaining({
            factId: "document-class:payment-receipt",
            value: "payment-receipt",
          }),
          expect.objectContaining({
            factId: "document-reference:source-record",
            value: "receipt-001",
          }),
          expect.objectContaining({
            factId: "currency:document-currency",
            value: "THB",
          }),
        ]),
      },
    });

    const contradictoryEnvelope = callerEnvelope({
      document: {
        sourceDocumentId: "receipt-001",
        logicalDocumentId: "caller-controlled-logical-id",
        sourceDocumentKind: "school-billing-invoice",
        thaiTaxDocumentStatus: "unresolved",
        currency: "THB",
        facts: [
          { factId: "caller-fact-class", kind: "count", countText: "1" },
          {
            factId: "caller-fact-reference",
            kind: "count",
            countText: "2",
          },
        ],
      },
    });

    let result: unknown;
    try {
      result = subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "caller-identity-contradiction-batch",
          envelopes: [contradictoryEnvelope],
          trustedPreparation: genuinePreparation,
        }),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      return;
    }

    const output = result as {
      readonly status: "ready" | "unresolved";
      readonly snapshots?: readonly Record<string, unknown>[];
      readonly variants?: readonly Record<string, unknown>[];
    };
    const snapshots =
      output.status === "ready"
        ? output.snapshots
        : output.status === "unresolved"
          ? output.variants
          : undefined;
    expect(snapshots).toHaveLength(1);
    expect(snapshots?.[0]).toMatchObject({
      sourceDocumentKind: "payment-receipt",
      logicalDocumentId: "receipt-001",
    });
  });

  it("rejects or derives a changed school-billing count from the trusted packet", async () => {
    const subject = await loadControlledImports();
    const genuinePreparation = await trustedPreparationFor(
      subject,
      requestedScope,
      "private-evidence://company-a/finance/sanitized/school-billing-count",
      {
        sourceIdentity: "school-billing-count-001",
        factValue: "147",
        packetFact: {
          factCategory: "billing-summary",
          factId: "billing-summary:billing-period",
          label: "Student count as stated",
          normalizationBinding: {
            bindingKind: "document-count",
            normalizedFactId: "student-count",
          },
        },
      },
    );
    expect(genuinePreparation).toMatchObject({
      packet: {
        facts: expect.arrayContaining([
          expect.objectContaining({
            factId: "billing-summary:billing-period",
            value: "147",
          }),
        ]),
      },
    });

    const tamperedRequest = normalizationRequest({
      batchId: "trusted-school-count-tamper-batch",
      envelopes: [
        callerEnvelope({
          evidenceReference:
            "private-evidence://company-a/finance/sanitized/school-billing-count",
          document: {
            ...paymentReceiptDocument({
              sourceDocumentId: "school-billing-count-001",
              logicalDocumentId: "school-billing-count-001",
              sourceDocumentKind: "school-billing-invoice",
              thaiTaxDocumentStatus: "unresolved",
            }),
            facts: [
              { factId: "student-count", kind: "count", countText: "999" },
            ],
          },
        }),
      ],
      trustedPreparation: genuinePreparation,
    });

    let result: unknown;
    try {
      result = subject.prepareControlledImportBatch(tamperedRequest);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      return;
    }

    expect(result).toMatchObject({ status: "ready" });
    const facts = (result as { readonly snapshots: readonly unknown[] })
      .snapshots[0] as { readonly facts: readonly Record<string, unknown>[] };
    expect(facts.facts).toEqual(
      expect.arrayContaining([expect.objectContaining({ count: "147" })]),
    );
    expect(facts.facts).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ count: "999" })]),
    );
  });

  it("rejects caller payroll voucher money overrides for gross, source-stated WHT, and net", async () => {
    const subject = await loadControlledImports();
    const genuinePreparation = await trustedPreparationFor(
      subject,
      requestedScope,
      validEvidenceReference,
      {
        sourceIdentity: "payroll-voucher-001",
        packetFacts: [
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:gross-total",
            label: "PV-2026/071 gross as stated",
            value: "12345.67",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/071",
              sourceDateText: "08/07/2569",
              moneyKind: "gross",
            },
          },
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:withholding-total",
            label: "PV-2026/071 withholding as stated",
            value: "370.37",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/071",
              sourceDateText: "08/07/2569",
              moneyKind: "source-stated-wht",
            },
          },
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:net-total",
            label: "PV-2026/071 net as stated",
            value: "11975.30",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/071",
              sourceDateText: "08/07/2569",
              moneyKind: "net",
            },
          },
        ],
      },
    );
    const callerModifiedEnvelope = callerEnvelope({
      document: {
        sourceDocumentId: "payroll-voucher-001",
        logicalDocumentId: "payroll-voucher-001",
        sourceDocumentKind: "payroll-summary",
        thaiTaxDocumentStatus: "unresolved",
        currency: "THB",
        vouchers: [
          {
            voucherNumberText: "PV-2026/071",
            sourceDateText: "08/07/2569",
            grossDecimal: "99999.99",
            sourceStatedWhtDecimal: "0.01",
            netDecimal: "1.00",
          },
        ],
      },
    });

    let result: unknown;
    try {
      result = subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "trusted-payroll-money-tamper-batch",
          envelopes: [callerModifiedEnvelope],
          trustedPreparation: genuinePreparation,
        }),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      return;
    }

    expect(result).toMatchObject({ status: "ready" });
    const ready = result as {
      readonly snapshots: readonly {
        readonly facts: readonly Record<string, unknown>[];
      }[];
      readonly records: readonly {
        readonly money: { readonly amountMinor: string };
      }[];
    };
    expect(ready.snapshots[0]?.facts.map((fact) => fact.amountMinor)).toEqual([
      "1234567",
      "37037",
      "1197530",
    ]);
    expect(ready.records.map((record) => record.money.amountMinor)).toEqual([
      "1234567",
      "37037",
      "1197530",
    ]);
  });

  it("rejects or derives nonpayroll facts when a caller reorders and relabels them", async () => {
    const subject = await loadControlledImports();
    const evidenceReference =
      "private-evidence://company-a/finance/sanitized/school-billing-fact-binding-001";
    const callerDocument = {
      sourceDocumentId: "school-billing-fact-binding-001",
      logicalDocumentId: "school-billing-fact-binding-001",
      sourceDocumentKind: "school-billing-invoice",
      thaiTaxDocumentStatus: "unresolved",
      currency: "THB",
      facts: [
        {
          factId: "caller-student-count",
          kind: "count",
          countText: "147",
        },
        {
          factId: "caller-invoice-total",
          kind: "money",
          amountDecimal: "100.00",
        },
      ],
    };
    const envelope = callerEnvelope({
      document: callerDocument,
      evidenceReference,
    });
    const preparation = await trustedPreparationFor(
      subject,
      requestedScope,
      evidenceReference,
      {
        sourceIdentity: "school-billing-fact-binding-001",
        document: callerDocument,
        packetFacts: [
          {
            factCategory: "document-total",
            factId: "document-total:invoice-total",
            label: "Invoice total as stated",
            value: "100.00",
            normalizationBinding: {
              bindingKind: "document-money",
              normalizedFactId: "trusted-invoice-total",
            },
          },
          {
            factCategory: "billing-summary",
            factId: "billing-summary:billing-period",
            label: "Student count as stated",
            value: "147",
            normalizationBinding: {
              bindingKind: "document-count",
              normalizedFactId: "trusted-student-count",
            },
          },
        ],
      },
    );

    let result: unknown;
    try {
      result = subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "school-billing-fact-reordering-batch",
          envelopes: [envelope],
          trustedPreparation: preparation,
        }),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      return;
    }

    expect(result).toMatchObject({ status: "ready" });
    const facts = (
      result as {
        readonly snapshots: readonly {
          readonly facts: readonly Record<string, unknown>[];
        }[];
      }
    ).snapshots[0]?.facts;
    expect(facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "money", amountMinor: "10000" }),
        expect.objectContaining({ kind: "count", count: "147" }),
      ]),
    );
    expect(facts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ factId: "caller-student-count" }),
        expect.objectContaining({ factId: "caller-invoice-total" }),
      ]),
    );
  });

  it("keeps a valid nonpayroll result stable when caller fact order changes", async () => {
    const subject = await loadControlledImports();
    const evidenceReference =
      "private-evidence://company-a/finance/sanitized/reordered-nonpayroll-facts";
    const document = {
      sourceDocumentId: "reordered-nonpayroll-facts",
      logicalDocumentId: "reordered-nonpayroll-facts",
      sourceDocumentKind: "school-billing-invoice",
      thaiTaxDocumentStatus: "unresolved",
      currency: "THB",
      facts: [
        {
          factId: "trusted-student-count",
          kind: "count",
          countText: "147",
        },
        {
          factId: "trusted-invoice-total",
          kind: "money",
          amountDecimal: "100.00",
        },
      ],
    };
    const preparation = await trustedPreparationFor(
      subject,
      requestedScope,
      evidenceReference,
      {
        sourceIdentity: "reordered-nonpayroll-facts",
        document,
        packetFacts: [
          {
            factCategory: "document-total",
            factId: "document-total:invoice-total",
            label: "Invoice total as stated",
            value: "100.00",
            normalizationBinding: {
              bindingKind: "document-money",
              normalizedFactId: "trusted-invoice-total",
            },
          },
          {
            factCategory: "billing-summary",
            factId: "billing-summary:billing-period",
            label: "Student count as stated",
            value: "147",
            normalizationBinding: {
              bindingKind: "document-count",
              normalizedFactId: "trusted-student-count",
            },
          },
        ],
      },
    );

    const result = subject.prepareControlledImportBatch(
      normalizationRequest({
        batchId: "reordered-nonpayroll-facts-batch",
        envelopes: [callerEnvelope({ document, evidenceReference })],
        trustedPreparation: preparation,
      }),
    ) as {
      readonly status: string;
      readonly snapshots: readonly {
        readonly facts: readonly Record<string, unknown>[];
      }[];
    };

    expect(result).toMatchObject({ status: "ready" });
    expect(result.snapshots[0]?.facts).toEqual([
      expect.objectContaining({
        factId: "trusted-invoice-total",
        kind: "money",
        amountMinor: "10000",
      }),
      expect.objectContaining({
        factId: "trusted-student-count",
        kind: "count",
        count: "147",
      }),
    ]);
  });

  it("rejects or derives payroll vouchers when a caller changes their identity, date, or order", async () => {
    const subject = await loadControlledImports();
    const evidenceReference =
      "private-evidence://company-a/finance/sanitized/payroll-voucher-binding-001";
    const callerDocument = {
      sourceDocumentId: "payroll-voucher-binding-001",
      logicalDocumentId: "payroll-voucher-binding-001",
      sourceDocumentKind: "payroll-summary",
      thaiTaxDocumentStatus: "unresolved",
      currency: "THB",
      vouchers: [
        {
          voucherNumberText: "CALLER-SECOND",
          sourceDateText: "2099-12-31",
          grossDecimal: "0.00",
          sourceStatedWhtDecimal: "0.00",
          netDecimal: "0.00",
        },
        {
          voucherNumberText: "CALLER-FIRST",
          sourceDateText: "2099-01-01",
          grossDecimal: "0.00",
          sourceStatedWhtDecimal: "0.00",
          netDecimal: "0.00",
        },
      ],
    };
    const envelope = callerEnvelope({
      document: callerDocument,
      evidenceReference,
    });
    const preparation = await trustedPreparationFor(
      subject,
      requestedScope,
      evidenceReference,
      {
        sourceIdentity: "payroll-voucher-binding-001",
        document: callerDocument,
        packetFacts: [
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:gross-total",
            label: "PV-2026/071 gross as stated",
            value: "100.00",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/071",
              sourceDateText: "08/07/2569",
              moneyKind: "gross",
            },
          },
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:withholding-total",
            label: "PV-2026/071 withholding as stated",
            value: "10.00",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/071",
              sourceDateText: "08/07/2569",
              moneyKind: "source-stated-wht",
            },
          },
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:net-total",
            label: "PV-2026/071 net as stated",
            value: "90.00",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/071",
              sourceDateText: "08/07/2569",
              moneyKind: "net",
            },
          },
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:gross-total",
            label: "PV-2026/072 gross as stated",
            value: "200.00",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/072",
              sourceDateText: "09/07/2569",
              moneyKind: "gross",
            },
          },
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:withholding-total",
            label: "PV-2026/072 withholding as stated",
            value: "20.00",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/072",
              sourceDateText: "09/07/2569",
              moneyKind: "source-stated-wht",
            },
          },
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:net-total",
            label: "PV-2026/072 net as stated",
            value: "180.00",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/072",
              sourceDateText: "09/07/2569",
              moneyKind: "net",
            },
          },
        ],
      },
    );

    let result: unknown;
    try {
      result = subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "payroll-voucher-reordering-batch",
          envelopes: [envelope],
          trustedPreparation: preparation,
        }),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      return;
    }

    expect(result).toMatchObject({ status: "ready" });
    const facts = (
      result as {
        readonly snapshots: readonly {
          readonly facts: readonly Record<string, unknown>[];
        }[];
      }
    ).snapshots[0]?.facts;
    expect(facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          voucherNumberText: "PV-2026/071",
          sourceDateText: "08/07/2569",
          moneyKind: "gross",
          amountMinor: "10000",
        }),
        expect.objectContaining({
          voucherNumberText: "PV-2026/072",
          sourceDateText: "09/07/2569",
          moneyKind: "gross",
          amountMinor: "20000",
        }),
      ]),
    );
    expect(facts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ voucherNumberText: "CALLER-SECOND" }),
        expect.objectContaining({ voucherNumberText: "CALLER-FIRST" }),
      ]),
    );
  });

  it("keeps a valid payroll result stable when caller voucher order changes", async () => {
    const subject = await loadControlledImports();
    const evidenceReference =
      "private-evidence://company-a/finance/sanitized/reordered-payroll-vouchers";
    const document = {
      sourceDocumentId: "reordered-payroll-vouchers",
      logicalDocumentId: "reordered-payroll-vouchers",
      sourceDocumentKind: "payroll-summary",
      thaiTaxDocumentStatus: "unresolved",
      currency: "THB",
      vouchers: [
        {
          voucherNumberText: "PV-2026/072",
          sourceDateText: "09/07/2569",
          grossDecimal: "200.00",
          sourceStatedWhtDecimal: "20.00",
          netDecimal: "180.00",
        },
        {
          voucherNumberText: "PV-2026/071",
          sourceDateText: "08/07/2569",
          grossDecimal: "100.00",
          sourceStatedWhtDecimal: "10.00",
          netDecimal: "90.00",
        },
      ],
    };
    const preparation = await trustedPreparationFor(
      subject,
      requestedScope,
      evidenceReference,
      {
        sourceIdentity: "reordered-payroll-vouchers",
        document,
        packetFacts: [
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:gross-total",
            label: "PV-2026/071 gross as stated",
            value: "100.00",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/071",
              sourceDateText: "08/07/2569",
              moneyKind: "gross",
            },
          },
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:withholding-total",
            label: "PV-2026/071 withholding as stated",
            value: "10.00",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/071",
              sourceDateText: "08/07/2569",
              moneyKind: "source-stated-wht",
            },
          },
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:net-total",
            label: "PV-2026/071 net as stated",
            value: "90.00",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/071",
              sourceDateText: "08/07/2569",
              moneyKind: "net",
            },
          },
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:gross-total",
            label: "PV-2026/072 gross as stated",
            value: "200.00",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/072",
              sourceDateText: "09/07/2569",
              moneyKind: "gross",
            },
          },
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:withholding-total",
            label: "PV-2026/072 withholding as stated",
            value: "20.00",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/072",
              sourceDateText: "09/07/2569",
              moneyKind: "source-stated-wht",
            },
          },
          {
            factCategory: "payroll-summary",
            factId: "payroll-summary:net-total",
            label: "PV-2026/072 net as stated",
            value: "180.00",
            normalizationBinding: {
              bindingKind: "payroll-money",
              voucherNumberText: "PV-2026/072",
              sourceDateText: "09/07/2569",
              moneyKind: "net",
            },
          },
        ],
      },
    );

    const result = subject.prepareControlledImportBatch(
      normalizationRequest({
        batchId: "reordered-payroll-vouchers-batch",
        envelopes: [callerEnvelope({ document, evidenceReference })],
        trustedPreparation: preparation,
      }),
    ) as {
      readonly status: string;
      readonly snapshots: readonly {
        readonly facts: readonly Record<string, unknown>[];
      }[];
    };

    expect(result).toMatchObject({ status: "ready" });
    expect(result.snapshots[0]?.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          voucherNumberText: "PV-2026/071",
          sourceDateText: "08/07/2569",
          moneyKind: "gross",
          amountMinor: "10000",
        }),
        expect.objectContaining({
          voucherNumberText: "PV-2026/072",
          sourceDateText: "09/07/2569",
          moneyKind: "gross",
          amountMinor: "20000",
        }),
      ]),
    );
  });

  it("rejects a Proxy that reports true for every preparation symbol", async () => {
    const subject = await loadControlledImports();
    const envelope = callerEnvelope();
    const genuinePreparation = await trustedPreparationFor(
      subject,
      requestedScope,
      validEvidenceReference,
    );
    const forgedPreparation = new Proxy(genuinePreparation as object, {
      get(target, property, receiver) {
        if (typeof property === "symbol") return true;
        return Reflect.get(target, property, receiver);
      },
    });

    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "proxy-preparation-forgery-batch",
          envelopes: [envelope],
          trustedPreparation: forgedPreparation,
        }),
      ),
    ).toThrow();
  });

  it("rejects a caller-fabricated accepted envelope without trusted preparation evidence", async () => {
    const subject = await loadControlledImports();

    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "fabricated-envelope-batch",
          envelopes: [callerEnvelope()],
        }),
      ),
    ).toThrow();
  });

  it("rejects a consistently foreign company reference on both accepted-envelope sides", async () => {
    const subject = await loadControlledImports();
    const foreignReference =
      "private-evidence://company-b/finance/sanitized/foreign-receipt";

    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "foreign-company-batch",
          envelopes: [callerEnvelope({ evidenceReference: foreignReference })],
        }),
      ),
    ).toThrow();
  });

  it("rejects a trusted preparation artifact whose company differs from the requested scope", async () => {
    const subject = await loadControlledImports();
    const foreignScope = { companyId: "company-b", schoolId: "school-a" };
    const foreignReference =
      "private-evidence://company-b/finance/sanitized/foreign-receipt";
    const preparation = await trustedPreparationFor(
      subject,
      foreignScope,
      foreignReference,
    );

    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "trusted-company-mismatch-batch",
          envelopes: [callerEnvelope()],
          trustedPreparation: preparation,
        }),
      ),
    ).toThrow();
  });

  it("rejects a trusted preparation artifact whose school differs from the requested scope", async () => {
    const subject = await loadControlledImports();
    const foreignScope = { companyId: "company-a", schoolId: "school-b" };
    const foreignReference =
      "private-evidence://company-a/school-b/finance/sanitized/foreign-receipt";
    const preparation = await trustedPreparationFor(
      subject,
      foreignScope,
      foreignReference,
    );

    expect(() =>
      subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: "trusted-school-mismatch-batch",
          envelopes: [callerEnvelope()],
          trustedPreparation: preparation,
        }),
      ),
    ).toThrow();
  });

  it.each([
    ["missing decision", {}],
    ["unknown decision", { decision: "maybe" }],
    ["decision with an unknown key", { decision: "allow", extra: true }],
  ] as const)(
    "fails closed when the authorization port returns a %s outcome",
    async (_name, decision) => {
      const subject = await loadControlledImports();
      const plan = await preparedPlan(subject);
      const fakes = commandFakes();

      await expect(
        subject.acceptControlledImportBatch({
          plan,
          authorizationInput: authorizationInput(),
          authorizationPort: {
            authorizeFinanceOperation: vi.fn(async () => decision),
          },
          auditPort: fakes.auditPort,
          repository: fakes.repository,
          requestId: "request-malformed-decision-001",
          correlationId: "correlation-malformed-decision-001",
          occurredAt: "2026-08-13T01:02:03.000Z",
        }),
      ).rejects.toThrow();
      expect(fakes.repository.applyBatchAtomically).not.toHaveBeenCalled();
    },
  );

  it("rejects a caller-built ready plan before repository access", async () => {
    const subject = await loadControlledImports();
    const prepared = await preparedPlan(subject);
    const fakes = commandFakes();
    const callerBuiltPlan = {
      status: prepared.status,
      normalizationVersion: prepared.normalizationVersion,
      scope: structuredClone(prepared.scope),
      batchId: prepared.batchId,
      batchDigest: prepared.batchDigest,
      snapshots: structuredClone(prepared.snapshots),
      records: structuredClone(prepared.records),
    };

    await expect(
      subject.acceptControlledImportBatch({
        plan: callerBuiltPlan,
        authorizationInput: authorizationInput(),
        authorizationPort: {
          authorizeFinanceOperation: vi.fn(async () => ({
            decision: "allow" as const,
          })),
        },
        auditPort: fakes.auditPort,
        repository: fakes.repository,
        requestId: "request-caller-built-plan-001",
        correlationId: "correlation-caller-built-plan-001",
        occurredAt: "2026-08-13T01:02:03.000Z",
      }),
    ).rejects.toThrow();
    expect(fakes.repository.applyBatchAtomically).not.toHaveBeenCalled();
  });

  it("rejects a mutated clone of a prepared plan before repository access", async () => {
    const subject = await loadControlledImports();
    const prepared = await preparedPlan(subject);
    const mutatedPlan = structuredClone(prepared);
    mutatedPlan.batchDigest = "c".repeat(64);
    const fakes = commandFakes();

    await expect(
      subject.acceptControlledImportBatch({
        plan: mutatedPlan,
        authorizationInput: authorizationInput(),
        authorizationPort: {
          authorizeFinanceOperation: vi.fn(async () => ({
            decision: "allow" as const,
          })),
        },
        auditPort: fakes.auditPort,
        repository: fakes.repository,
        requestId: "request-mutated-plan-001",
        correlationId: "correlation-mutated-plan-001",
        occurredAt: "2026-08-13T01:02:03.000Z",
      }),
    ).rejects.toThrow();
    expect(fakes.repository.applyBatchAtomically).not.toHaveBeenCalled();
  });

  it("rejects a deeply frozen caller-built ready plan before repository access", async () => {
    const subject = await loadControlledImports();
    const prepared = await preparedPlan(subject);
    const fakes = commandFakes();
    const callerBuiltPlan = deepFreeze({
      status: prepared.status,
      normalizationVersion: prepared.normalizationVersion,
      scope: structuredClone(prepared.scope),
      batchId: prepared.batchId,
      batchDigest: prepared.batchDigest,
      snapshots: structuredClone(prepared.snapshots),
      records: structuredClone(prepared.records),
    });

    const callerBuiltRecords = callerBuiltPlan.records as readonly unknown[];
    expect(Object.isFrozen(callerBuiltPlan)).toBe(true);
    expect(Object.isFrozen(callerBuiltRecords[0])).toBe(true);
    await expect(
      subject.acceptControlledImportBatch({
        plan: callerBuiltPlan,
        authorizationInput: authorizationInput(),
        authorizationPort: {
          authorizeFinanceOperation: vi.fn(async () => ({
            decision: "allow" as const,
          })),
        },
        auditPort: fakes.auditPort,
        repository: fakes.repository,
        requestId: "request-deep-frozen-caller-plan-001",
        correlationId: "correlation-deep-frozen-caller-plan-001",
        occurredAt: "2026-08-13T01:02:03.000Z",
      }),
    ).rejects.toThrow();
    expect(fakes.repository.applyBatchAtomically).not.toHaveBeenCalled();
  });

  it.each([
    [
      "unknown repository field",
      {
        status: "accepted",
        recordIds: ["record-001"],
        secret: "repository-secret",
      },
    ],
    [
      "malformed repository status",
      { status: "pending", recordIds: ["record-001"] },
    ],
  ] as const)(
    "strictly parses the repository result for %s",
    async (_name, repositoryResult) => {
      const subject = await loadControlledImports();
      const audit = commandFakes();
      const repository = {
        applyBatchAtomically: vi.fn(async () => repositoryResult as never),
      };

      const failure = await subject
        .acceptControlledImportBatch({
          plan: await preparedPlan(subject),
          authorizationInput: authorizationInput(),
          authorizationPort: {
            authorizeFinanceOperation: vi.fn(async () => ({
              decision: "allow" as const,
            })),
          },
          auditPort: audit.auditPort,
          repository,
          requestId: "request-strict-repository-result-001",
          correlationId: "correlation-strict-repository-result-001",
          occurredAt: "2026-08-13T01:02:03.000Z",
        })
        .then(
          () => undefined,
          (error: unknown) => error,
        );

      expect(failure).toBeInstanceOf(Error);
      expect(JSON.stringify(failure)).not.toContain("repository-secret");
      expect(repository.applyBatchAtomically).toHaveBeenCalledTimes(1);
    },
  );

  it("appends a sanitized failed audit when authorization evaluation fails", async () => {
    const subject = await loadControlledImports();
    const audit = commandFakes();
    const repository = commandFakes().repository;
    const secret = "authorization-provider-secret";

    const failure = await subject
      .acceptControlledImportBatch({
        plan: await preparedPlan(subject),
        authorizationInput: authorizationInput(),
        authorizationPort: {
          authorizeFinanceOperation: vi.fn(async () => {
            throw new Error(`authorization dependency failed: ${secret}`);
          }),
        },
        auditPort: audit.auditPort,
        repository,
        requestId: "request-authorization-failure-001",
        correlationId: "correlation-authorization-failure-001",
        occurredAt: "2026-08-13T01:02:03.000Z",
      })
      .then(
        () => undefined,
        (error: unknown) => error,
      );

    expect(failure).toBeInstanceOf(Error);
    expect(audit.auditPort.append).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failed" }),
    );
    expect(JSON.stringify(audit.auditPort.append.mock.calls)).not.toContain(
      secret,
    );
    expect(repository.applyBatchAtomically).not.toHaveBeenCalled();
  });

  it("rejects decimal amounts beyond the bounded 38-digit integer limit", async () => {
    const subject = await loadControlledImports();
    const run = async (amountDecimal: string): Promise<unknown> => {
      const envelope = callerEnvelope({
        document: paymentReceiptDocument({
          facts: [{ factId: "payment-total", kind: "money", amountDecimal }],
        }),
      });
      const preparation = await trustedPreparationFor(
        subject,
        requestedScope,
        validEvidenceReference,
        { factValue: amountDecimal },
      );
      return subject.prepareControlledImportBatch(
        normalizationRequest({
          batchId: `decimal-limit-${amountDecimal.length}`,
          envelopes: [envelope],
          trustedPreparation: preparation,
        }),
      );
    };

    await expect(run(`${"9".repeat(38)}.99`)).resolves.toMatchObject({
      status: "ready",
    });
    await expect(run(`${"1".repeat(39)}.00`)).rejects.toThrow();
  });

  it.each([
    ["bankAccountNumber", "000-000-0000"],
    ["expenseCategory", "cloud-services"],
    ["thaiTaxInvoice", true],
    ["vat", "7%"],
    ["withholdingRate", "3%"],
  ] as const)(
    "rejects the unreviewed %s field at the document level",
    async (key, value) => {
      const subject = await loadControlledImports();
      const base = paymentReceiptDocument();

      const request = await trustedNormalizationRequest(subject, {
        batchId: `unreviewed-${key}-batch`,
        envelopes: [callerEnvelope({ document: { ...base, [key]: value } })],
      });
      expect(() => subject.prepareControlledImportBatch(request)).toThrow();
    },
  );

  it.each([
    ["bankAccountNumber", "000-000-0000"],
    ["expenseCategory", "cloud-services"],
    ["thaiTaxInvoice", true],
    ["vat", "7%"],
    ["withholdingRate", "3%"],
  ] as const)(
    "rejects the unreviewed %s field at the nested-fact level",
    async (key, value) => {
      const subject = await loadControlledImports();
      const base = paymentReceiptDocument();

      const request = await trustedNormalizationRequest(subject, {
        batchId: `unreviewed-nested-${key}-batch`,
        envelopes: [
          callerEnvelope({
            document: {
              ...base,
              facts: [
                {
                  ...(base.facts as readonly Record<string, unknown>[])[0],
                  [key]: value,
                },
              ],
            },
          }),
        ],
      });
      expect(() => subject.prepareControlledImportBatch(request)).toThrow();
    },
  );

  it("rejects unknown document kinds instead of treating them as generic fact documents", async () => {
    const subject = await loadControlledImports();

    const request = await trustedNormalizationRequest(subject, {
      batchId: "unknown-document-kind-batch",
      envelopes: [
        callerEnvelope({
          document: paymentReceiptDocument({
            sourceDocumentKind: "unreviewed-document-kind",
          }),
        }),
      ],
    });
    expect(() => subject.prepareControlledImportBatch(request)).toThrow();
  });

  it("rejects unknown document and fact keys under the nested source grammar", async () => {
    const subject = await loadControlledImports();
    const document = paymentReceiptDocument({
      unreviewedDocumentKey: "reject-me",
      facts: [
        {
          factId: "payment-total",
          kind: "money",
          amountDecimal: "100.00",
          unreviewedFactKey: "reject-me",
        },
      ],
    });

    const request = await trustedNormalizationRequest(subject, {
      batchId: "unknown-nested-keys-batch",
      envelopes: [callerEnvelope({ document })],
    });
    expect(() => subject.prepareControlledImportBatch(request)).toThrow();
  });

  it("rejects unknown payroll voucher and source-stated-tax keys", async () => {
    const subject = await loadControlledImports();
    const payrollDocument = {
      sourceDocumentId: "payroll-001",
      logicalDocumentId: "payroll-001",
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
          unreviewedVoucherKey: "reject-me",
        },
      ],
    };
    const foreignDocument = {
      sourceDocumentId: "foreign-001",
      logicalDocumentId: "foreign-001",
      sourceDocumentKind: "foreign-workspace-invoice",
      thaiTaxDocumentStatus: "not-source-asserted",
      sourceStatedTax: {
        label: "GST",
        rateText: "0%",
        unreviewedTaxKey: "reject-me",
      },
      currency: "THB",
      facts: [
        { factId: "invoice-total", kind: "money", amountDecimal: "100.00" },
      ],
    };

    const payrollRequest = await trustedNormalizationRequest(subject, {
      batchId: "unknown-payroll-key-batch",
      envelopes: [callerEnvelope({ document: payrollDocument })],
    });
    expect(() =>
      subject.prepareControlledImportBatch(payrollRequest),
    ).toThrow();
    const taxRequest = await trustedNormalizationRequest(subject, {
      batchId: "unknown-tax-key-batch",
      envelopes: [callerEnvelope({ document: foreignDocument })],
    });
    expect(() => subject.prepareControlledImportBatch(taxRequest)).toThrow();
  });

  it("uses ambiguityGroupId for same-group variants even when logical document IDs differ", async () => {
    const subject = await loadControlledImports();
    const variant = (
      variantId: string,
      logicalDocumentId: string,
      digit: string,
    ) =>
      callerEnvelope({
        payloadDigest: digit.repeat(64),
        evidenceReference: `private-evidence://company-a/finance/sanitized/${variantId.toLowerCase()}`,
        document: {
          sourceDocumentId: `${variantId}-source`,
          logicalDocumentId,
          ambiguityGroupId: "same-ambiguity-group",
          variantId,
          sourceDocumentKind: "school-billing-invoice",
          thaiTaxDocumentStatus: "unresolved",
          currency: "THB",
          facts: [{ factId: "net", kind: "money", amountDecimal: "100.00" }],
        },
      });

    const result = subject.prepareControlledImportBatch(
      await trustedNormalizationRequest(subject, {
        batchId: "same-ambiguity-group-batch",
        envelopes: [
          variant("Term1", "logical-term-1", "1"),
          variant("Term2", "logical-term-2", "2"),
        ],
      }),
    );

    expect(result).toMatchObject({
      status: "unresolved",
      reason: "source-variant-ambiguity",
      records: [],
    });
  });

  it("keeps distinct ambiguityGroupId variants ready even when logical document IDs match", async () => {
    const subject = await loadControlledImports();
    const variant = (
      variantId: string,
      ambiguityGroupId: string,
      digit: string,
    ) =>
      callerEnvelope({
        payloadDigest: digit.repeat(64),
        evidenceReference: `private-evidence://company-a/finance/sanitized/${variantId.toLowerCase()}`,
        document: {
          sourceDocumentId: `${variantId}-source`,
          logicalDocumentId: "shared-logical-document",
          ambiguityGroupId,
          variantId,
          sourceDocumentKind: "school-billing-invoice",
          thaiTaxDocumentStatus: "unresolved",
          currency: "THB",
          facts: [{ factId: "net", kind: "money", amountDecimal: "100.00" }],
        },
      });

    const result = subject.prepareControlledImportBatch(
      await trustedNormalizationRequest(subject, {
        batchId: "distinct-ambiguity-group-batch",
        envelopes: [
          variant("Term1", "ambiguity-group-1", "3"),
          variant("Term2", "ambiguity-group-2", "4"),
        ],
      }),
    );

    expect(result).toMatchObject({ status: "ready" });
  });

  it("rejects duplicate payroll voucher record identities inside one batch", async () => {
    const subject = await loadControlledImports();
    const document = {
      sourceDocumentId: "payroll-duplicate-voucher-001",
      logicalDocumentId: "payroll-duplicate-voucher-001",
      sourceDocumentKind: "payroll-summary",
      thaiTaxDocumentStatus: "unresolved",
      currency: "THB",
      vouchers: [
        {
          voucherNumberText: "PV-DUPLICATE",
          sourceDateText: "01/07/2569",
          grossDecimal: "100.00",
          sourceStatedWhtDecimal: "0.00",
          netDecimal: "100.00",
        },
        {
          voucherNumberText: "PV-DUPLICATE",
          sourceDateText: "02/07/2569",
          grossDecimal: "200.00",
          sourceStatedWhtDecimal: "0.00",
          netDecimal: "200.00",
        },
      ],
    };

    const request = await trustedNormalizationRequest(subject, {
      batchId: "duplicate-voucher-record-id-batch",
      envelopes: [callerEnvelope({ document })],
    });
    expect(() => subject.prepareControlledImportBatch(request)).toThrow();
  });

  it("does not return accepted from the blocked public pilot contract", async () => {
    const subject = await loadControlledImports();
    const pilot = subject.runHistoricalPrivateEvidencePilot;

    if (pilot === undefined) {
      expect(pilot).toBeUndefined();
      return;
    }

    const outcome = await Promise.resolve()
      .then(() =>
        pilot({
          packetVersion: PACKET_VERSION,
          sourceSystem: "owner-attested-archive",
        }),
      )
      .then(
        (value) => ({ kind: "resolved" as const, value }),
        (error: unknown) => ({ kind: "rejected" as const, error }),
      );

    if (outcome.kind === "rejected") {
      expect(outcome.error).toBeInstanceOf(Error);
      return;
    }

    const result = outcome.value as ResultRecord;
    expect(["blocked", "not-admitted"]).toContain(result.status);
    expect(result.status).not.toBe("accepted");
  });
});
