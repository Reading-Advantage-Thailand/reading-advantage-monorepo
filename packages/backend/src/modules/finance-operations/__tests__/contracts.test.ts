import { describe, expect, it } from "vitest";

import {
  appendOnlyCorrectionInputSchema,
  classifySourceReplay,
  financeMoneyInputSchema,
  financeOperationAuthorizationInputSchema,
  financeSourceProvenanceSchema,
  type FinanceAuthorizationEvidence,
  type FinanceOperationAuthorizationInput,
} from "../contracts.js";
import type {
  CompanyIdentityAuthorizationPort,
  CustomerBillingCatalogPort,
  DurableJobPort,
  PrivateEvidenceStoragePort,
  TutorFinancialExportPort,
} from "../ports.js";

const digest = (character: string): string => character.repeat(64);

const provenance = {
  sourceSystem: "tutor-financial-export",
  sourceVersion: "2026-08-v1",
  sourceRecordId: "tutor-export-0001",
  importBatchId: "finance-import-0001",
  payloadDigest: digest("a"),
  evidenceReference: "private-evidence://tutor/exports/0001.json",
};

const authorizationEvidence = {
  source: "company-identity",
  claimsVersion: "2026-08-v1",
  subjectId: "employee-0001",
  organizationId: "reading-advantage",
  appRoleIds: ["finance-operator"],
  schoolIds: ["school-0001"],
} satisfies FinanceAuthorizationEvidence;

const authorizationInput = {
  operation: "financial-record:import",
  scope: {
    companyId: "reading-advantage",
    schoolId: "school-0001",
  },
  authorizationEvidence,
} satisfies FinanceOperationAuthorizationInput;

describe("finance operations foundation contracts", () => {
  it("accepts signed base-10 integer minor units and uppercase three-letter currencies only", () => {
    for (const amountMinor of ["0", "250", "-250"]) {
      expect(
        financeMoneyInputSchema.safeParse({ amountMinor, currency: "THB" })
          .success,
      ).toBe(true);
    }

    for (const amountMinor of [
      250,
      12.5,
      "+250",
      "01",
      "-0",
      " 250",
      "250 ",
      "\t250\n",
      "12.5",
      "1e2",
    ]) {
      expect(
        financeMoneyInputSchema.safeParse({ amountMinor, currency: "THB" })
          .success,
      ).toBe(false);
    }

    for (const currency of ["thb", "TH", "THBB", "TH$"]) {
      expect(
        financeMoneyInputSchema.safeParse({ amountMinor: "250", currency })
          .success,
      ).toBe(false);
    }
  });

  it("requires complete source provenance and an immutable evidence reference", () => {
    expect(financeSourceProvenanceSchema.safeParse(provenance).success).toBe(
      true,
    );

    for (const missingField of [
      "sourceSystem",
      "sourceVersion",
      "sourceRecordId",
      "importBatchId",
      "payloadDigest",
      "evidenceReference",
    ] as const) {
      const incomplete: Partial<typeof provenance> = { ...provenance };
      delete incomplete[missingField];
      expect(financeSourceProvenanceSchema.safeParse(incomplete).success).toBe(
        false,
      );
    }
  });

  it("classifies an identical source identity and digest as a replay without altering accepted data", () => {
    const accepted = {
      recordId: "finance-record-0001",
      provenance,
    };
    const acceptedBeforeReplay = structuredClone(accepted);

    expect(
      classifySourceReplay({ existing: accepted, incoming: { ...provenance } }),
    ).toEqual({
      status: "replay",
      acceptedRecordId: "finance-record-0001",
    });
    expect(
      classifySourceReplay({
        existing: accepted,
        incoming: { ...provenance, importBatchId: "finance-import-0002" },
      }),
    ).toEqual({
      status: "replay",
      acceptedRecordId: "finance-record-0001",
    });
    expect(
      classifySourceReplay({
        existing: accepted,
        incoming: {
          ...provenance,
          evidenceReference: "private-evidence://tutor/exports/alternate.json",
        },
      }),
    ).toEqual({
      status: "replay",
      acceptedRecordId: "finance-record-0001",
    });
    expect(accepted).toEqual(acceptedBeforeReplay);
  });

  it("rejects a conflicting payload digest without changing the accepted record", () => {
    const accepted = {
      recordId: "finance-record-0001",
      provenance,
    };
    const acceptedBeforeConflict = structuredClone(accepted);

    expect(
      classifySourceReplay({
        existing: accepted,
        incoming: { ...provenance, payloadDigest: digest("b") },
      }),
    ).toEqual({
      status: "conflict",
      acceptedRecordId: "finance-record-0001",
      reason: "payload-digest-mismatch",
    });
    expect(accepted).toEqual(acceptedBeforeConflict);
  });

  it("rejects a changed source identity even when the payload digest matches", () => {
    const accepted = {
      recordId: "finance-record-0001",
      provenance,
    };
    const acceptedBeforeConflict = structuredClone(accepted);

    expect(
      classifySourceReplay({
        existing: accepted,
        incoming: { ...provenance, sourceRecordId: "tutor-export-0002" },
      }),
    ).toEqual({
      status: "conflict",
      acceptedRecordId: "finance-record-0001",
      reason: "source-identity-mismatch",
    });
    expect(accepted).toEqual(acceptedBeforeConflict);
  });

  it("allows only append-only corrections with an explicit superseded record and reason", () => {
    const correction = {
      operation: "append-correction",
      correctionRecordId: "finance-record-0002",
      supersedesRecordId: "finance-record-0001",
      reason: "The source export duplicated one adjustment.",
    };

    expect(appendOnlyCorrectionInputSchema.safeParse(correction).success).toBe(
      true,
    );
    expect(
      appendOnlyCorrectionInputSchema.safeParse({
        ...correction,
        operation: "update",
      }).success,
    ).toBe(false);
    expect(
      appendOnlyCorrectionInputSchema.safeParse({
        ...correction,
        supersedesRecordId: undefined,
      }).success,
    ).toBe(false);
    expect(
      appendOnlyCorrectionInputSchema.safeParse({ ...correction, reason: "" })
        .success,
    ).toBe(false);
  });

  it("requires explicit Company Identity authorization evidence for finance operations", () => {
    expect(
      financeOperationAuthorizationInputSchema.safeParse(authorizationInput)
        .success,
    ).toBe(true);
    expect(
      financeOperationAuthorizationInputSchema.safeParse({
        operation: authorizationInput.operation,
        scope: authorizationInput.scope,
      }).success,
    ).toBe(false);
  });

  it("defines Company Identity, CRM, Tutor, private storage, and jobs as internal ports", async () => {
    let receivedAuthorization: FinanceOperationAuthorizationInput | undefined;
    const companyIdentityPort = {
      authorizeFinanceOperation: async (input) => {
        receivedAuthorization = input;
        return { decision: "allow" as const };
      },
    } satisfies CompanyIdentityAuthorizationPort;
    const customerBillingCatalogPort = {
      readCustomerBillingCatalog: async (input) => ({
        customerId: input.customerId,
        sourceVersion: input.sourceVersion,
        payloadDigest: digest("c"),
      }),
    } satisfies CustomerBillingCatalogPort;
    const tutorFinancialExportPort = {
      readFinancialExport: async (input) => ({
        sourceRecordId: input.sourceRecordId,
        sourceVersion: input.sourceVersion,
        payloadDigest: digest("d"),
        evidenceReference:
          "private-evidence://reading-advantage/tutor/exports/0001.json",
      }),
    } satisfies TutorFinancialExportPort;
    const privateEvidenceStoragePort = {
      readAuthorizedEvidence: async (input) => ({
        evidenceReference: input.evidenceReference,
        payloadDigest: digest("e"),
      }),
    } satisfies PrivateEvidenceStoragePort;
    const durableJobPort = {
      enqueue: async (input) => ({
        status: "accepted" as const,
        receipt: {
          jobId: "finance-job-0001",
          idempotencyKey: input.idempotencyKey,
        },
      }),
    } satisfies DurableJobPort;

    await expect(
      companyIdentityPort.authorizeFinanceOperation(authorizationInput),
    ).resolves.toEqual({
      decision: "allow",
    });
    expect(receivedAuthorization).toEqual(authorizationInput);
    await expect(
      customerBillingCatalogPort.readCustomerBillingCatalog({
        customerId: "crm-customer-0001",
        sourceVersion: "crm-v2",
        scope: authorizationInput.scope,
        authorizationEvidence,
      }),
    ).resolves.toMatchObject({
      customerId: "crm-customer-0001",
      sourceVersion: "crm-v2",
    });
    await expect(
      tutorFinancialExportPort.readFinancialExport({
        sourceRecordId: "tutor-export-0001",
        sourceVersion: "2026-08-v1",
        scope: authorizationInput.scope,
        authorizationEvidence,
      }),
    ).resolves.toMatchObject({ sourceRecordId: "tutor-export-0001" });
    await expect(
      privateEvidenceStoragePort.readAuthorizedEvidence({
        evidenceReference:
          "private-evidence://reading-advantage/tutor/exports/0001.json",
        scope: authorizationInput.scope,
        authorizationEvidence,
      }),
    ).resolves.toMatchObject({
      evidenceReference:
        "private-evidence://reading-advantage/tutor/exports/0001.json",
    });
    await expect(
      durableJobPort.enqueue({
        operation: "finance-import",
        idempotencyKey: "finance-import-0001",
        payloadDigest: provenance.payloadDigest,
        scope: authorizationInput.scope,
        authorizationEvidence,
      }),
    ).resolves.toMatchObject({
      status: "accepted",
      receipt: { idempotencyKey: "finance-import-0001" },
    });
  });
});
