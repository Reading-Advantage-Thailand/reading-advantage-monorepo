import { describe, expect, expectTypeOf, it } from "vitest";

import {
  createDescriptorDrivenPresentationAdapter,
  rehydrateStandardPackAdditiveReleaseReceipt,
  rehydrateStandardPackIngestionLedgerPredecessorIndex,
  serializeStandardPackCanonicalIngestionReceiptPayload,
  serializeStandardPackSuitabilityDecisionPayload,
  serializeStandardPackSuitabilityAcceptedDecisionManifestPayload,
  serializeStandardPackSuitabilityDossierPayload,
  STANDARD_PACK_SUITABILITY_DISPOSITIONS,
  standardPackCanonicalIngestionReceiptSchema,
  standardPackSuitabilityAcceptedDecisionManifestSchema,
  standardPackSuitabilityDossierSchema,
  validateStandardPackCanonicalIngestionReceipt,
  validateStandardPackSuitabilityAcceptedDecisionManifest,
  validateStandardPackSuitabilityDossier,
} from "./index.js";
import type {
  AssetContractV2PresentationSelection,
  DescriptorDrivenPresentationAdapter,
  StandardPackCanonicalIngestionReceipt,
  StandardPackSuitabilityAcceptedDecisionManifest,
  StandardPackSuitabilityDossier,
} from "./index.js";

describe("APK assets public API", () => {
  it("exports the descriptor-driven presentation adapter and its public types", () => {
    const adapter: DescriptorDrivenPresentationAdapter =
      createDescriptorDrivenPresentationAdapter([], []);

    expect(typeof adapter.select).toBe("function");
    expectTypeOf(adapter.select).returns.toEqualTypeOf<
      AssetContractV2PresentationSelection
    >();
  });

  it("exports the suitability evidence contracts, serializers, validators, and public types", () => {
    expect(STANDARD_PACK_SUITABILITY_DISPOSITIONS).toEqual([
      "reuse-canonical",
      "ingest-canonical",
      "blocked",
    ]);
    expect(typeof standardPackSuitabilityDossierSchema.parse).toBe("function");
    expect(typeof standardPackSuitabilityAcceptedDecisionManifestSchema.parse).toBe("function");
    expect(typeof standardPackCanonicalIngestionReceiptSchema.parse).toBe("function");
    expect(typeof serializeStandardPackSuitabilityDossierPayload).toBe("function");
    expect(typeof serializeStandardPackSuitabilityAcceptedDecisionManifestPayload).toBe("function");
    expect(typeof serializeStandardPackCanonicalIngestionReceiptPayload).toBe("function");
    expect(typeof serializeStandardPackSuitabilityDecisionPayload).toBe("function");
    expect(typeof validateStandardPackSuitabilityDossier).toBe("function");
    expect(typeof validateStandardPackSuitabilityAcceptedDecisionManifest).toBe("function");
    expect(typeof validateStandardPackCanonicalIngestionReceipt).toBe("function");
    expect(typeof rehydrateStandardPackIngestionLedgerPredecessorIndex).toBe("function");
    expect(typeof rehydrateStandardPackAdditiveReleaseReceipt).toBe("function");
    expectTypeOf(validateStandardPackSuitabilityDossier).returns.toEqualTypeOf<
      Promise<StandardPackSuitabilityDossier>
    >();
    expectTypeOf(validateStandardPackSuitabilityAcceptedDecisionManifest).returns.toEqualTypeOf<
      Promise<StandardPackSuitabilityAcceptedDecisionManifest>
    >();
    expectTypeOf(validateStandardPackCanonicalIngestionReceipt).returns.toEqualTypeOf<
      Promise<StandardPackCanonicalIngestionReceipt>
    >();
  });

});
