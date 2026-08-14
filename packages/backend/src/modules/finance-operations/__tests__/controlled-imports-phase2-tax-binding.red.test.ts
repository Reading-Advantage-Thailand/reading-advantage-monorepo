import { expect, it, vi } from "vitest";

const scope = {
  companyId: "company-foreign-workspace",
  schoolId: "school-foreign-workspace",
} as const;
const evidenceReference =
  "private-evidence://company-foreign-workspace/finance/foreign-workspace-invoice-001";
const payloadDigest = "a".repeat(64);

interface FinanceScope {
  readonly companyId: string;
  readonly schoolId?: string;
}

interface ControlledImportsModule {
  readonly createHistoricalPrivateEvidenceImportCommand: (input: {
    readonly companyIdentityAttestor: {
      readonly attest: (input: unknown) => Promise<unknown>;
    };
    readonly privateEvidenceBindingPort: {
      readonly verify: (input: unknown) => Promise<unknown>;
    };
  }) => {
    readonly prepare: (input: unknown) => Promise<unknown>;
  };
  readonly prepareControlledImportBatch: (input: unknown) => unknown;
}

/** Loads the public controlled-import boundary. */
async function loadControlledImports(): Promise<ControlledImportsModule> {
  return (await import("../index.js")) as unknown as ControlledImportsModule;
}

/** Builds the complete intended packet facts for one foreign-workspace invoice. */
function trustedForeignInvoiceFacts(): readonly Record<string, unknown>[] {
  return [
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
      factCategory: "document-class",
      factId: "document-class:foreign-workspace-invoice",
      label: "Foreign invoice class as stated",
      value: "foreign-workspace-invoice",
    },
    {
      factCategory: "document-reference",
      factId: "document-reference:source-record",
      label: "Source record as stated",
      value: "foreign-workspace-invoice-001",
    },
    {
      factCategory: "tax-label",
      factId: "tax-label:gst",
      label: "GST",
      value: "0%",
    },
    {
      factCategory: "currency",
      factId: "currency:document-currency",
      label: "Document currency as stated",
      value: "THB",
    },
    {
      factCategory: "document-status",
      factId: "document-status:thai-tax-document-status",
      label: "Thai tax document status as stated",
      value: "not-source-asserted",
    },
  ];
}

/** Prepares a real Phase 1 packet with the complete source-stated fact set. */
async function trustedForeignInvoicePreparation(
  subject: ControlledImportsModule,
): Promise<unknown> {
  const attestor = {
    attest: vi.fn(async (input: unknown) => {
      const request = input as { readonly scope: FinanceScope };
      return {
        decision: "allow" as const,
        evidence: {
          source: "company-identity" as const,
          claimsVersion: "company-identity-claims-v1",
          policyVersion: "finance-historical-import-role-policy-v1",
          subjectId: "employee-foreign-workspace-importer",
          organizationId: request.scope.companyId,
          appRoleIds: ["role-historical-private-evidence-import"],
          schoolIds: [request.scope.schoolId],
        },
      };
    }),
  };
  const binding = {
    verify: vi.fn(async (input: unknown) => {
      const request = input as {
        readonly evidenceReference: string;
        readonly scope: FinanceScope;
        readonly expectedPayloadDigest: string;
      };
      return {
        evidenceReference: request.evidenceReference,
        scope: request.scope,
        payloadDigest: request.expectedPayloadDigest,
      };
    }),
  };
  const command = subject.createHistoricalPrivateEvidenceImportCommand({
    companyIdentityAttestor: attestor,
    privateEvidenceBindingPort: binding,
  });
  return command.prepare({
    packet: {
      packetVersion: "historical-private-evidence-packet.v1",
      scope,
      source: {
        sourceSystem: "foreign-workspace-archive",
        sourceVersion: "archive-v1",
        sourceIdentity: "foreign-workspace-invoice-001",
        payloadDigest,
        evidenceReference,
      },
      facts: trustedForeignInvoiceFacts().map((fact) => ({
        ...fact,
        kind: "source-stated-value" as const,
      })),
    },
    credential: { kind: "token", value: "owner-token" },
    audit: {
      eventId: "finance-attestation-event-001",
      objectId: "foreign-workspace-invoice-001",
      occurredAt: "2026-08-14T01:02:03.000Z",
      requestId: "finance-import-request-001",
      correlationId: "finance-import-correlation-001",
    },
  });
}

/** Builds an accepted-envelope candidate for one foreign-workspace invoice. */
function foreignInvoiceEnvelope(input: {
  readonly sourceStatedTax: {
    readonly label: string;
    readonly rateText: string;
  };
  readonly currency: string;
}): Record<string, unknown> {
  return {
    envelopeVersion: "finance-controlled-source-envelope-v1",
    scope,
    sourceSystem: "foreign-workspace-archive",
    sourceVersion: "archive-v1",
    sourceRecordId: "foreign-workspace-invoice-001",
    sourceAcceptance: {
      port: "private-evidence-storage",
      snapshot: { evidenceReference, payloadDigest },
    },
    evidenceAuthorization: { evidenceReference, payloadDigest },
    document: {
      sourceDocumentId: "foreign-workspace-invoice-001",
      logicalDocumentId: "foreign-workspace-invoice-001",
      sourceDocumentKind: "foreign-workspace-invoice",
      thaiTaxDocumentStatus: "not-source-asserted",
      sourceStatedTax: input.sourceStatedTax,
      currency: input.currency,
      facts: [
        { factId: "invoice-total", kind: "money", amountDecimal: "100.00" },
      ],
    },
  };
}

/** Returns snapshots from either normalizer outcome. */
function normalizedSnapshots(result: unknown):
  | readonly {
      readonly sourceStatedTax?: Readonly<Record<string, string>>;
      readonly facts?: readonly { readonly currency?: string }[];
    }[]
  | undefined {
  const normalized = result as {
    readonly status: string;
    readonly snapshots?: readonly {
      readonly sourceStatedTax?: Readonly<Record<string, string>>;
      readonly facts?: readonly { readonly currency?: string }[];
    }[];
    readonly variants?: readonly {
      readonly sourceStatedTax?: Readonly<Record<string, string>>;
      readonly facts?: readonly { readonly currency?: string }[];
    }[];
  };
  return normalized.status === "unresolved"
    ? normalized.variants
    : normalized.snapshots;
}

it("rejects caller tax that contradicts the packet tax-label:gst fact", async () => {
  const subject = await loadControlledImports();
  const preparation = await trustedForeignInvoicePreparation(subject);
  const envelope = foreignInvoiceEnvelope({
    sourceStatedTax: { label: "WHT", rateText: "99%" },
    currency: "THB",
  });

  let result: unknown;
  try {
    result = subject.prepareControlledImportBatch({
      normalizationVersion: "finance-controlled-import-normalization-v1",
      scope,
      batchId: "foreign-workspace-tax-binding-001",
      acceptedSourceEnvelopes: [envelope],
      trustedPreparation: preparation,
    });
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    return;
  }

  const snapshots = normalizedSnapshots(result);
  expect(snapshots).toHaveLength(1);
  expect(snapshots?.[0]?.sourceStatedTax).toEqual({
    label: "GST",
    rateText: "0%",
  });
});

it("rejects caller USD when the packet document-currency fact states THB", async () => {
  const subject = await loadControlledImports();
  const preparation = await trustedForeignInvoicePreparation(subject);
  const envelope = foreignInvoiceEnvelope({
    sourceStatedTax: { label: "GST", rateText: "0%" },
    currency: "USD",
  });

  let result: unknown;
  try {
    result = subject.prepareControlledImportBatch({
      normalizationVersion: "finance-controlled-import-normalization-v1",
      scope,
      batchId: "foreign-workspace-currency-binding-001",
      acceptedSourceEnvelopes: [envelope],
      trustedPreparation: preparation,
    });
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    return;
  }

  const snapshots = normalizedSnapshots(result);
  expect(snapshots).toHaveLength(1);
  const normalizedCurrencies = snapshots?.[0]?.facts?.map(
    (fact) => fact.currency,
  );
  expect(normalizedCurrencies).toContain("THB");
  expect(normalizedCurrencies).not.toContain("USD");
});
