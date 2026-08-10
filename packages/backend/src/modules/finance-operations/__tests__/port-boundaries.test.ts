import { describe, expect, it } from "vitest";

import type { FinanceAuthorizationEvidence } from "../contracts.js";
import {
  classifyDurableJobReplay,
  customerBillingCatalogInputSchema,
  customerBillingCatalogSnapshotSchema,
  durableJobInputSchema,
  durableJobResultSchema,
  privateEvidenceSnapshotSchema,
  privateEvidenceStorageInputSchema,
  tutorFinancialExportInputSchema,
  tutorFinancialExportSnapshotSchema,
} from "../port-contracts.js";

const digest = (character: string): string => character.repeat(64);

const scope = {
  companyId: "reading-advantage",
  schoolId: "school-0001",
};

const authorizationEvidence = {
  source: "company-identity",
  claimsVersion: "2026-08-v1",
  subjectId: "employee-0001",
  organizationId: "reading-advantage",
  appRoleIds: ["finance-operator"],
  schoolIds: ["school-0001"],
} satisfies FinanceAuthorizationEvidence;

const customerBillingCatalogInput = {
  customerId: "crm-customer-0001",
  sourceVersion: "crm-v2",
  scope,
  authorizationEvidence,
};

const tutorFinancialExportInput = {
  sourceRecordId: "tutor-export-0001",
  sourceVersion: "tutor-v1",
  scope,
  authorizationEvidence,
};

const privateEvidenceStorageInput = {
  evidenceReference:
    "private-evidence://reading-advantage/tutor/exports/0001.json",
  scope,
  authorizationEvidence,
};

const durableJobInput = {
  operation: "finance-import",
  idempotencyKey: "finance-import-0001",
  payloadDigest: digest("a"),
  scope,
  authorizationEvidence,
};

describe("finance operations port boundaries", () => {
  it("requires every data-port input to carry an authorized, explicit Finance scope", () => {
    const cases = [
      {
        name: "CustomerBillingCatalog",
        schema: customerBillingCatalogInputSchema,
        input: customerBillingCatalogInput,
      },
      {
        name: "TutorFinancialExport",
        schema: tutorFinancialExportInputSchema,
        input: tutorFinancialExportInput,
      },
      {
        name: "PrivateEvidenceStorage",
        schema: privateEvidenceStorageInputSchema,
        input: privateEvidenceStorageInput,
      },
      {
        name: "DurableJob",
        schema: durableJobInputSchema,
        input: durableJobInput,
      },
    ];

    for (const { name, schema, input } of cases) {
      expect(schema.safeParse(input).success, name).toBe(true);
      expect(
        schema.safeParse({ ...input, scope: undefined }).success,
        name,
      ).toBe(false);
      expect(
        schema.safeParse({
          ...input,
          authorizationEvidence: undefined,
        }).success,
        name,
      ).toBe(false);
      expect(
        schema.safeParse({
          ...input,
          scope: { ...scope, companyId: "" },
        }).success,
        name,
      ).toBe(false);
      expect(
        schema.safeParse({
          ...input,
          authorizationEvidence: {
            ...authorizationEvidence,
            organizationId: "another-company",
          },
        }).success,
        name,
      ).toBe(false);
      expect(
        schema.safeParse({ ...input, untrusted: true }).success,
        name,
      ).toBe(false);
    }
  });

  it("rejects empty identities, invalid payload digests, and unknown fields at port boundaries", () => {
    expect(
      customerBillingCatalogInputSchema.safeParse({
        ...customerBillingCatalogInput,
        customerId: "",
      }).success,
    ).toBe(false);
    expect(
      tutorFinancialExportInputSchema.safeParse({
        ...tutorFinancialExportInput,
        sourceRecordId: "",
      }).success,
    ).toBe(false);
    expect(
      durableJobInputSchema.safeParse({
        ...durableJobInput,
        operation: "",
      }).success,
    ).toBe(false);
    expect(
      durableJobInputSchema.safeParse({
        ...durableJobInput,
        idempotencyKey: "",
      }).success,
    ).toBe(false);
    expect(
      durableJobInputSchema.safeParse({
        ...durableJobInput,
        payloadDigest: "not-a-digest",
      }).success,
    ).toBe(false);

    const snapshotCases = [
      {
        name: "CustomerBillingCatalogSnapshot",
        schema: customerBillingCatalogSnapshotSchema,
        snapshot: {
          customerId: "crm-customer-0001",
          sourceVersion: "crm-v2",
          payloadDigest: digest("b"),
        },
      },
      {
        name: "TutorFinancialExportSnapshot",
        schema: tutorFinancialExportSnapshotSchema,
        snapshot: {
          sourceRecordId: "tutor-export-0001",
          sourceVersion: "tutor-v1",
          payloadDigest: digest("c"),
          evidenceReference:
            "private-evidence://reading-advantage/tutor/exports/0001.json",
        },
      },
      {
        name: "PrivateEvidenceSnapshot",
        schema: privateEvidenceSnapshotSchema,
        snapshot: {
          evidenceReference:
            "private-evidence://reading-advantage/tutor/exports/0001.json",
          payloadDigest: digest("d"),
        },
      },
    ];

    for (const { name, schema, snapshot } of snapshotCases) {
      expect(schema.safeParse(snapshot).success, name).toBe(true);
      expect(
        schema.safeParse({ ...snapshot, payloadDigest: "invalid" }).success,
        name,
      ).toBe(false);
      expect(
        schema.safeParse({ ...snapshot, untrusted: true }).success,
        name,
      ).toBe(false);
    }

    expect(
      customerBillingCatalogSnapshotSchema.safeParse({
        customerId: "",
        sourceVersion: "crm-v2",
        payloadDigest: digest("b"),
      }).success,
    ).toBe(false);
    expect(
      tutorFinancialExportSnapshotSchema.safeParse({
        sourceRecordId: "",
        sourceVersion: "tutor-v1",
        payloadDigest: digest("c"),
        evidenceReference:
          "private-evidence://reading-advantage/tutor/exports/0001.json",
      }).success,
    ).toBe(false);
  });

  it("accepts only scoped private evidence references and rejects provider or public URLs", () => {
    expect(
      privateEvidenceStorageInputSchema.safeParse(privateEvidenceStorageInput)
        .success,
    ).toBe(true);

    for (const evidenceReference of [
      "https://storage.example.com/reading-advantage/exports/0001.json",
      "s3://finance-evidence/reading-advantage/exports/0001.json",
      "gs://finance-evidence/reading-advantage/exports/0001.json",
      "private-evidence://reading-advantage/tutor/../exports/0001.json",
      "private-evidence://another-company/tutor/exports/0001.json",
    ]) {
      expect(
        privateEvidenceStorageInputSchema.safeParse({
          ...privateEvidenceStorageInput,
          evidenceReference,
        }).success,
        evidenceReference,
      ).toBe(false);
    }

    for (const evidenceReference of [
      "https://storage.example.com/reading-advantage/exports/0001.json",
      "s3://finance-evidence/reading-advantage/exports/0001.json",
      "gs://finance-evidence/reading-advantage/exports/0001.json",
      "private-evidence://reading-advantage/tutor/../exports/0001.json",
    ]) {
      expect(
        tutorFinancialExportSnapshotSchema.safeParse({
          sourceRecordId: "tutor-export-0001",
          sourceVersion: "tutor-v1",
          payloadDigest: digest("e"),
          evidenceReference,
        }).success,
        evidenceReference,
      ).toBe(false);
      expect(
        privateEvidenceSnapshotSchema.safeParse({
          evidenceReference,
          payloadDigest: digest("e"),
        }).success,
        evidenceReference,
      ).toBe(false);
    }
  });

  it("classifies durable jobs as accepted, replay, or conflict without mutating the accepted receipt", () => {
    const receipt = {
      jobId: "finance-job-0001",
      idempotencyKey: durableJobInput.idempotencyKey,
    };
    const accepted = {
      input: durableJobInput,
      receipt,
    };
    const acceptedBeforeReplay = structuredClone(accepted);

    expect(
      durableJobResultSchema.safeParse({ status: "accepted", receipt }).success,
    ).toBe(true);
    expect(
      durableJobResultSchema.safeParse({ status: "replay", receipt }).success,
    ).toBe(true);
    expect(
      durableJobResultSchema.safeParse({
        status: "conflict",
        receipt,
        reason: "payload-digest-mismatch",
      }).success,
    ).toBe(true);
    expect(
      durableJobResultSchema.safeParse({
        status: "accepted",
        receipt,
        extra: true,
      }).success,
    ).toBe(false);
    expect(
      durableJobResultSchema.safeParse({
        status: "conflict",
        receipt,
      }).success,
    ).toBe(false);

    expect(
      classifyDurableJobReplay({
        existing: accepted,
        incoming: { ...durableJobInput },
      }),
    ).toEqual({ status: "replay", receipt });
    expect(accepted).toEqual(acceptedBeforeReplay);

    expect(
      classifyDurableJobReplay({
        existing: accepted,
        incoming: { ...durableJobInput, operation: "finance-close" },
      }),
    ).toEqual({
      status: "conflict",
      receipt,
      reason: "operation-mismatch",
    });
    expect(accepted).toEqual(acceptedBeforeReplay);

    expect(
      classifyDurableJobReplay({
        existing: accepted,
        incoming: { ...durableJobInput, payloadDigest: digest("f") },
      }),
    ).toEqual({
      status: "conflict",
      receipt,
      reason: "payload-digest-mismatch",
    });
    expect(accepted).toEqual(acceptedBeforeReplay);
  });
});
