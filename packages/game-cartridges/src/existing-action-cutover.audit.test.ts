import { describe, expect, it } from "vitest";

import acceptedStandardAssetCatalog from "../../advantage-play-kit/assets/standard/standard-pack-release.json";
import {
  createExistingActionTask2CanonicalResolver,
  createExistingActionTask2SuitabilityPackage,
} from "@reading-advantage/advantage-play-kit/assets";
import type { StandardAssetCatalog } from "@reading-advantage/advantage-play-kit/assets";

import {
  EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES,
  materializeExistingActionCandidateSelectedUnion,
} from "./existing-action-cutover-semantic-candidates.js";
import {
  ExistingActionEvidenceUnavailableError,
  loadExistingActionQcCartridge,
  type ExistingActionEvidenceAction,
} from "./existing-action-cutover-qc.js";

describe("existing action audit remediation", () => {
  it("carries resolver-issued Asset Contract v2 descriptors and their integrity digests per title role", async () => {
    const catalog = acceptedStandardAssetCatalog as unknown as StandardAssetCatalog;
    const resolver = await createExistingActionTask2CanonicalResolver(catalog);
    const suitability = await createExistingActionTask2SuitabilityPackage(catalog);

    for (const candidate of EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES) {
      const selection = await materializeExistingActionCandidateSelectedUnion(candidate, resolver);
      expect(selection.resolved).toHaveLength(candidate.roleStateRequirements.length);
      expect(selection.resolved.every((role) => role.titleRole.startsWith(`${candidate.publicId}-`))).toBe(true);
      expect(selection.resolved.every((role) => role.descriptorDigest.length === 64)).toBe(true);
      expect(selection.resolved.every((role) => role.sourceReceiptLocator.startsWith("CURATED-RECEIPT.tsv:"))).toBe(true);
      expect(selection.resolved.every((role) => role.evidenceClaim.locator.includes(role.evidenceClaim.claimId))).toBe(true);
      expect(selection.resolved.every((role) => ["historical-source-only", "unknown"].includes(role.evidenceClaim.temporalScope))).toBe(true);
    }

    expect(suitability.dossiers.every((dossier) => dossier.decision.decisionDigest.length === 64)).toBe(true);
  }, 30_000);

  it("rejects synthetic mechanic progression and completion when all title evidence is historical or unknown", async () => {
    const catalog = acceptedStandardAssetCatalog as unknown as StandardAssetCatalog;
    const resolver = await createExistingActionTask2CanonicalResolver(catalog);

    for (const candidate of EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES) {
      const selection = await materializeExistingActionCandidateSelectedUnion(candidate, resolver);
      const cartridge = await loadExistingActionQcCartridge(candidate.publicId, selection);
      const mechanic = cartridge.createDeterministicMechanic();

      expect(mechanic.snapshot()).toMatchObject({ status: "blocked", progress: 0, completions: 0 });
      expect(() => mechanic.applyEvidenceAction(candidate.mechanicEvidence[0]!.action as ExistingActionEvidenceAction)).toThrow(
        ExistingActionEvidenceUnavailableError,
      );

      const session = cartridge.createQcSession();
      session.dispatchPhysicalInput({ modality: "keyboard", key: "Enter", intent: "primary" });
      expect(session.snapshot()).toMatchObject({ completionCount: 0, blockedInteractionCount: 1 });
      expect(() => session.completeProof()).toThrow(ExistingActionEvidenceUnavailableError);
    }
  }, 30_000);
});
