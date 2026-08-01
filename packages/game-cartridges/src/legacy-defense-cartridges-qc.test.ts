import { describe, expect, it } from "vitest";

import { inspectCompositionGeometry } from "@reading-advantage/advantage-play-kit/responsive";
import { createLegacyDefenseTask2CanonicalResolver } from "@reading-advantage/advantage-play-kit/assets";
import type { StandardAssetCatalog } from "@reading-advantage/advantage-play-kit/assets";

import acceptedStandardAssetCatalog from "../../advantage-play-kit/assets/standard/standard-pack-release.json";
import { LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES, materializeLegacyDefenseSelectedUnion } from "./legacy-defense-suitability.js";
import { LEGACY_DEFENSE_QC_REGISTRY, loadLegacyDefenseQcCartridge } from "./legacy-defense-cutover-qc.js";

describe("legacy defense Task 5 QC lifecycle", () => {
  it("exposes exactly four resolver-issued title adapters only in the QC registry", async () => {
    const resolver = await createLegacyDefenseTask2CanonicalResolver(acceptedStandardAssetCatalog as StandardAssetCatalog);
    expect(LEGACY_DEFENSE_QC_REGISTRY.map((entry) => entry.id)).toEqual(LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES.map((candidate) => candidate.publicId));

    for (const candidate of LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES) {
      const cartridge = await loadLegacyDefenseQcCartridge(candidate.publicId, await materializeLegacyDefenseSelectedUnion(candidate, resolver));
      const session = cartridge.createQcSession();
      const compact = session.resize({ width: 390, height: 844 });
      const wide = session.resize({ width: 1440, height: 900 });
      expect(compact.supported && compact.profile).toBe("compact");
      expect(wide.supported && wide.profile).toBe("wide");
      if (compact.supported) expect(inspectCompositionGeometry(compact)).toEqual([]);
      if (wide.supported) expect(inspectCompositionGeometry(wide)).toEqual([]);
      session.dispatchPhysicalInput({ modality: "keyboard", key: "Enter", intent: "primary" });
      session.dispatchPhysicalInput({ modality: "pointer", button: 0, x: 160, y: 120, intent: "secondary" });
      session.dispatchPhysicalInput({ modality: "touch", touchCount: 1, x: 160, y: 120, intent: "primary" });
      expect(session.snapshot().inputCounts).toEqual({ keyboard: 1, pointer: 1, touch: 1 });
      expect(session.snapshot().completionCount).toBe(0);
      expect(cartridge.taskScope).toMatchObject({ registration: "advantage-games-qc-only", consumable: false, productionCatalogExposed: false, readingIntegration: false, primaryIntegration: false, completionSupported: false });
    }
  }, 30_000);
});
