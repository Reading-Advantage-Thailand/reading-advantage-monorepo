import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { StandardAssetCatalog } from "@reading-advantage/advantage-play-kit/assets";
import { describe, expect, it } from "vitest";

import { PUZZLE_TITLE_BINDINGS, createPuzzleTask2CanonicalResolver } from "./puzzle-suitability.js";
import { loadPuzzleQcCartridge } from "./puzzle-cutover-qc.js";

describe("Legacy Puzzle Advantage Games QC registration", () => {
  it("loads only the five accepted v2 title unions into QC while blocking every production surface", async () => {
    const catalog = JSON.parse(readFileSync(
      resolve(process.cwd(), "../advantage-play-kit/assets/standard/standard-pack-release.json"),
      "utf8",
    )) as StandardAssetCatalog;
    const resolver = await createPuzzleTask2CanonicalResolver(catalog);

    for (const binding of PUZZLE_TITLE_BINDINGS) {
      const cartridge = await loadPuzzleQcCartridge(binding.titleId, {
        titleId: binding.titleId,
        selection: resolver.select([binding.semantic]),
        claimIds: binding.claimIds,
      });
      const session = cartridge.createQcSession();
      const compact = session.resize({ width: 390, height: 844 });
      const wide = session.resize({ width: 1440, height: 900 });

      expect(compact.supported && compact.profile).toBe("compact");
      expect(wide.supported && wide.profile).toBe("wide");
      session.dispatch("keyboard");
      session.dispatch("pointer");
      session.dispatch("touch");
      expect(session.snapshot()).toMatchObject({
        inputCounts: { keyboard: 1, pointer: 1, touch: 1 },
        claimIds: binding.claimIds,
      });
      expect(cartridge.descriptorSelection.semanticKeys).toEqual([binding.semanticKey]);
      expect(cartridge.scope).toMatchObject({
        registration: "advantage-games-qc-only",
        playable: false,
        productionCatalogExposed: false,
        readingIntegration: false,
        primaryIntegration: false,
        retirementComplete: false,
      });
    }
  }, 30_000);

  it("rejects a selected union substituted for another title", async () => {
    const catalog = JSON.parse(readFileSync(
      resolve(process.cwd(), "../advantage-play-kit/assets/standard/standard-pack-release.json"),
      "utf8",
    )) as StandardAssetCatalog;
    const resolver = await createPuzzleTask2CanonicalResolver(catalog);
    const runeMatch = PUZZLE_TITLE_BINDINGS.find((binding) => binding.titleId === "rune-match")!;

    await expect(loadPuzzleQcCartridge("enchanted-library", {
      titleId: "enchanted-library",
      selection: resolver.select([runeMatch.semantic]),
      claimIds: runeMatch.claimIds,
    })).rejects.toThrow(/selected union drifted/i);
  }, 30_000);
});
