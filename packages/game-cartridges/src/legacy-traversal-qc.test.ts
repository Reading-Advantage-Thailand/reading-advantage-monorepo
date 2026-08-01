import { describe, expect, it } from "vitest";

import type { StandardAssetCatalog } from "@reading-advantage/advantage-play-kit/assets";

import acceptedStandardAssetCatalog from "../../advantage-play-kit/assets/standard/standard-pack-release.json";

import {
  LEGACY_TRAVERSAL_QC_REGISTRY,
  loadLegacyTraversalQcCartridge,
} from "./legacy-traversal-qc.js";
import {
  TRAVERSAL_TITLE_IDS,
  createTraversalCanonicalResolver,
  resolveTraversalTitleCanonicalAssets,
} from "./traversal-suitability.js";

describe("legacy traversal QC quarantine", () => {
  it("loads every title only with its own resolver-issued selected union and no host integration", async () => {
    const resolver = await createTraversalCanonicalResolver(
      acceptedStandardAssetCatalog as unknown as StandardAssetCatalog,
    );

    expect(LEGACY_TRAVERSAL_QC_REGISTRY.map((entry) => entry.id)).toEqual(TRAVERSAL_TITLE_IDS);
    for (const id of TRAVERSAL_TITLE_IDS) {
      const selection = Object.freeze({ id, ...resolveTraversalTitleCanonicalAssets(resolver, id) });
      const cartridge = await loadLegacyTraversalQcCartridge(id, selection);
      const session = cartridge.createQcSession();

      const compact = session.resize({ width: 390, height: 844 });
      session.dispatch("keyboard", "right");
      session.dispatch("pointer", "primary");
      session.dispatch("touch", "left");
      const wide = session.resize({ width: 1440, height: 900 });

      expect(cartridge.manifest.qcRegistration.route).toBe("/qc");
      expect(cartridge.taskScope).toEqual({
        registration: "advantage-games-qc-only",
        productionCatalogExposed: false,
        readingIntegration: false,
        primaryIntegration: false,
        completionPersistence: false,
      });
      expect(compact.supported && compact.profile).toBe("compact");
      expect(wide.supported && wide.profile).toBe("wide");
      expect(session.snapshot()).toMatchObject({
        inputCounts: { keyboard: 1, pointer: 1, touch: 1 },
        hostCompletionEmissions: 0,
        mechanic: { claimIds: expect.any(Array) },
      });
    }
  }, 30_000);
});
