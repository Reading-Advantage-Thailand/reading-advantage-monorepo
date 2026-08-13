import { describe, expect, it, vi } from "vitest";

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

it("rejects caller tax that contradicts the packet tax-label:gst fact", async () => {
  const subject = await loadControlledImports();
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
  const preparation = await command.prepare({
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
      facts: [
        {
          factCategory: "document-total",
          factId: "document-total:invoice-total",
          kind: "source-stated-value",
          label: "Invoice total as stated",
          value: "100.00",
        },
        {
          factCategory: "tax-label",
          factId: "tax-label:gst",
          kind: "source-stated-value",
          label: "GST",
          value: "0%",
        },
      ],
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
  const envelope = {
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
      sourceStatedTax: { label: "WHT", rateText: "99%" },
      currency: "THB",
      facts: [
        { factId: "invoice-total", kind: "money", amountDecimal: "100.00" },
      ],
    },
  };

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

  const normalized = result as {
    readonly status: string;
    readonly snapshots?: readonly [
      { readonly sourceStatedTax?: Readonly<Record<string, string>> },
      ...ReadonlyArray<{ readonly sourceStatedTax?: Readonly<Record<string, string>> }>,
    ];
  };
  if (normalized.status === "unresolved") {
    expect(JSON.stringify(normalized)).not.toContain("WHT");
    expect(JSON.stringify(normalized)).not.toContain("99%");
    return;
  }

  expect(normalized.status).toBe("ready");
  expect(normalized.snapshots?.[0]?.sourceStatedTax).toEqual({
    label: "GST",
    rateText: "0%",
  });
});
