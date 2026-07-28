import { describe, expect, it } from "vitest";

import * as publicApi from "../index.js";

describe("public barrel exports (package export regression)", () => {
  it("exports the existing-core host-proof binding contract", () => {
    expect(publicApi).toHaveProperty("EXISTING_CORE_HOST_PROOF_BINDINGS");
    expect(publicApi).toHaveProperty("EXISTING_CORE_HOST_PROOF_RECEIPTS");
    expect(publicApi).toHaveProperty("existingCoreHostProofBindingSchema");
    expect(publicApi).toHaveProperty("existingCoreHostProofCartridgeIdSchema");
    expect(publicApi).toHaveProperty("getExistingCoreHostProofBinding");
    expect(publicApi).toHaveProperty("isExistingCoreHostProofCartridge");
  });

  it("exports the established educational and completion contracts", () => {
    expect(publicApi).toHaveProperty("gameResultsSchema");
    expect(publicApi).toHaveProperty("sentenceInputSchema");
    expect(publicApi).toHaveProperty("vocabularyInputSchema");
    expect(publicApi).toHaveProperty("vocabularyItemSchema");
    expect(publicApi).toHaveProperty("normalizeSentenceInput");
    expect(publicApi).toHaveProperty("normalizeVocabularyInput");
    expect(publicApi).toHaveProperty("gameCompletionInputSchema");
    expect(publicApi).toHaveProperty("gameDifficultySchema");
    expect(publicApi).toHaveProperty("hostCompletionContextSchema");
    expect(publicApi).toHaveProperty("mapGameResultsToCompletionInput");
  });

  it("exports the APK architecture scanner", () => {
    expect(publicApi).toHaveProperty("scanAPKArchitecture");
  });
});
