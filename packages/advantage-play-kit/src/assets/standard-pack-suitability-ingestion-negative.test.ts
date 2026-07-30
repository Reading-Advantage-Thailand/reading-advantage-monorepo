import { describe, expect, it } from "vitest";

import {
  CANONICAL_INGESTION_NEGATIVE_FIXTURES,
  createCanonicalIngestionReceiptFixture,
} from "./standard-pack-suitability-ingestion-negative-fixtures.test-support.js";
import {
  standardPackCanonicalIngestionReceiptSchema,
  validateStandardPackCanonicalIngestionReceipt,
} from "./standard-pack-suitability.js";

describe("standard-pack canonical-ingestion negative evidence fixtures", () => {
  it("starts from a digest-valid evidence-only receipt with no production authority", async () => {
    const receipt = await createCanonicalIngestionReceiptFixture();

    await expect(validateStandardPackCanonicalIngestionReceipt(receipt)).resolves.toEqual(receipt);
    expect(receipt.authorization).toEqual({
      productionUseAuthorized: false,
      migrationAuthorized: false,
      cutoverAuthorized: false,
      deploymentAuthorized: false,
    });
  });

  it.each(CANONICAL_INGESTION_NEGATIVE_FIXTURES)(
    "rejects $label",
    async ({ create, expectedPath }) => {
      const receipt = await createCanonicalIngestionReceiptFixture();
      const candidate = create(receipt);
      const result = standardPackCanonicalIngestionReceiptSchema.safeParse(candidate);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(
          (issue) => issue.path.join(".").startsWith(expectedPath),
        )).toBe(true);
      }
      await expect(validateStandardPackCanonicalIngestionReceipt(candidate)).rejects.toThrow();
    },
  );

  it("rejects any attempt to turn the evidence receipt into production authority", async () => {
    const receipt = await createCanonicalIngestionReceiptFixture();

    expect(standardPackCanonicalIngestionReceiptSchema.safeParse({
      ...receipt,
      authorization: {
        ...receipt.authorization,
        productionUseAuthorized: true,
      },
    }).success).toBe(false);
  });
});
