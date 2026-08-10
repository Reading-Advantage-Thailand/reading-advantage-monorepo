import { describe, expect, it } from "vitest";

import { financeSourceProvenanceSchema } from "../contracts.js";

/** Returns valid Finance source provenance with narrow adversarial overrides. */
function provenance(
  overrides: Partial<{
    readonly sourceSystem: string;
    readonly sourceVersion: string;
    readonly sourceRecordId: string;
    readonly importBatchId: string;
  }> = {},
) {
  return {
    sourceSystem: "tutor-financial-export",
    sourceVersion: "tutor-v1",
    sourceRecordId: "tutor-row-0001",
    importBatchId: "finance-import-0001",
    payloadDigest: "a".repeat(64),
    evidenceReference:
      "private-evidence://reading-advantage/finance/records/0001.json",
    ...overrides,
  };
}

describe("Finance Operations provenance whitespace boundary", () => {
  it("rejects whitespace-only source provenance at the Zod boundary", () => {
    for (const field of [
      "sourceSystem",
      "sourceVersion",
      "sourceRecordId",
      "importBatchId",
    ] as const) {
      expect(
        financeSourceProvenanceSchema.safeParse(
          provenance({ [field]: " \t\n " }),
        ).success,
        `${field} must reject whitespace-only source identity`,
      ).toBe(false);
    }
  });
});
