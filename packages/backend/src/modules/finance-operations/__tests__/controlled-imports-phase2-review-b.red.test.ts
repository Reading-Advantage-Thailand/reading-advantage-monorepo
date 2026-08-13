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
async function trustedPreparationFor(
  subject: ControlledImportsReviewModule,
  scope: FinanceOperationScope,
  evidenceReference: string,
  options: {
    readonly sourceIdentity?: string;
    readonly payloadDigest?: string;
  } = {},
): Promise<unknown> {
  const sourceIdentity = options.sourceIdentity ?? "receipt-001";
  const payloadDigest = options.payloadDigest ?? "a".repeat(64);
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
  return command.prepare({
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
