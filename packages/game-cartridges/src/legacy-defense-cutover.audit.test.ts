import { describe, expect, it } from "vitest";

import acceptedStandardAssetCatalog from "../../advantage-play-kit/assets/standard/standard-pack-release.json";
import {
  createLegacyDefenseTask2CanonicalResolver,
  createLegacyDefenseTask2SuitabilityPackage,
  type StandardAssetCatalog,
} from "@reading-advantage/advantage-play-kit/assets";

import {
  LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES,
  materializeLegacyDefenseSelectedUnion,
} from "./legacy-defense-suitability.js";
import {
  LegacyDefenseEvidenceUnavailableError,
  LEGACY_DEFENSE_QC_REGISTRY,
  loadLegacyDefenseQcCartridge,
} from "./legacy-defense-cutover-qc.js";

describe("legacy defense Tasks 2–5 audit remediation", () => {
  it("reconciles accepted v2 title-role dossiers, descriptors, and selected unions", async () => {
    const catalog = acceptedStandardAssetCatalog as unknown as StandardAssetCatalog;
    const packageResult = await createLegacyDefenseTask2SuitabilityPackage(catalog);

    expect(packageResult.descriptors).toHaveLength(5);
    expect(packageResult.dossiers).toHaveLength(16);
    expect(packageResult.selectedUnionInputs.map((input) => input.titleId)).toEqual([
      "castle-defense",
      "wizard-vs-zombie",
      "village-guardian",
      "storm-castle-tower",
    ]);
    expect(packageResult.dossiers.every((dossier) => dossier.licensing[0]?.status === "approved")).toBe(true);
    expect(packageResult.dossiers.every((dossier) => dossier.credits[0]?.required)).toBe(true);

    const resolver = await createLegacyDefenseTask2CanonicalResolver(catalog);
    for (const candidate of LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES) {
      const selection = await materializeLegacyDefenseSelectedUnion(candidate, resolver);
      expect(selection.resolved).toHaveLength(candidate.roleStateRequirements.length);
      expect(selection.resolved.every((role) => role.descriptorDigest.length === 64)).toBe(true);
      expect(selection.semanticKeys).toEqual([...selection.semanticKeys].sort());
    }
  }, 30_000);

  it("executes only source-backed Castle, Wizard, and Village rules while Storm stays fail-closed", async () => {
    const catalog = acceptedStandardAssetCatalog as unknown as StandardAssetCatalog;
    const resolver = await createLegacyDefenseTask2CanonicalResolver(catalog);
    const byId = new Map(LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES.map((candidate) => [candidate.publicId, candidate]));

    expect(LEGACY_DEFENSE_QC_REGISTRY.map((entry) => entry.id)).toEqual([
      "castle-defense",
      "wizard-vs-zombie",
      "village-guardian",
      "storm-castle-tower",
    ]);

    const storm = byId.get("storm-castle-tower");
    if (!storm) throw new Error("Missing Storm evidence candidate");
    const stormCartridge = await loadLegacyDefenseQcCartridge(storm.publicId, await materializeLegacyDefenseSelectedUnion(storm, resolver));
    expect(stormCartridge.createDeterministicMechanic().snapshot()).toMatchObject({ status: "blocked", completionSupported: false });
    expect(() => stormCartridge.createDeterministicMechanic().applyPrimaryAction()).toThrow(LegacyDefenseEvidenceUnavailableError);
  }, 30_000);
});
