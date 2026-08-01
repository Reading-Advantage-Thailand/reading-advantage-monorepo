import { describe, expect, it } from "vitest";

import type { StandardAssetCatalog } from "@reading-advantage/advantage-play-kit/assets";

import acceptedStandardAssetCatalog from "../../advantage-play-kit/assets/standard/standard-pack-release.json";

import {
  LEGACY_DEFENSE_CANONICAL_DESCRIPTORS,
  LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES,
  createLegacyDefenseCanonicalResolver,
  getLegacyDefenseSelectedSemanticKeys,
  materializeLegacyDefenseSelectedUnion,
  resolveLegacyDefenseTitleCanonicalAssets,
} from "./legacy-defense-suitability.js";

describe("legacy defense canonical suitability", () => {
  it("freezes four non-consumable title-specific role sets with no legacy fallback", () => {
    expect(LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES.map((candidate) => ({
      id: candidate.publicId,
      inputMode: candidate.inputMode,
      roles: candidate.roleStateRequirements.map((role) => `${role.role}:${role.state}`),
      consumable: candidate.consumable,
    }))).toEqual([
      { id: "castle-defense", inputMode: "sentence", roles: ["player:idle", "enemy:idle", "feedback:correct", "control:confirm"], consumable: false },
      { id: "wizard-vs-zombie", inputMode: "vocabulary", roles: ["player:idle", "enemy:idle", "feedback:correct", "control:confirm", "audio-feedback:correct"], consumable: false },
      { id: "village-guardian", inputMode: "sentence", roles: ["player:idle", "enemy:idle", "feedback:correct", "control:confirm"], consumable: false },
      { id: "storm-castle-tower", inputMode: "sentence", roles: ["player:idle", "feedback:correct", "control:confirm"], consumable: false },
    ]);
  });

  it("resolves every selected union through accepted Asset Contract v2 registrations without physical paths", async () => {
    const resolver = await createLegacyDefenseCanonicalResolver(acceptedStandardAssetCatalog as StandardAssetCatalog);

    for (const candidate of LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES) {
      const selection = resolveLegacyDefenseTitleCanonicalAssets(resolver, candidate.publicId);
      const materialized = await materializeLegacyDefenseSelectedUnion(candidate, resolver);
      expect(selection).toMatchObject({ contractVersion: 2, materialization: "accepted-cartridge-selected-union-only", semanticKeys: getLegacyDefenseSelectedSemanticKeys(candidate.publicId) });
      expect(materialized.resolved).toHaveLength(candidate.roleStateRequirements.length);
      expect(JSON.stringify(materialized)).not.toMatch(/\bpath\b|\/public\//iu);
      expect(materialized.resolved.every((role) => role.descriptorDigest.length === 64)).toBe(true);
    }
    expect(LEGACY_DEFENSE_CANONICAL_DESCRIPTORS).toHaveLength(5);
  });

  it("fails closed outside the four-title defense cohort", () => {
    expect(() => getLegacyDefenseSelectedSemanticKeys("not-a-defense-title")).toThrow(/unknown legacy-defense title/i);
  });
});
