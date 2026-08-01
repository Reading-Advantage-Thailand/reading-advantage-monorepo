import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ACCEPTED_STANDARD_PACK_BINDING,
} from "@reading-advantage/advantage-play-kit/scaffolding";
import {
  createAcceptedStandardAssetResolver,
  type StandardAssetCatalog,
} from "@reading-advantage/advantage-play-kit/assets";
import { beforeAll, describe, expect, it } from "vitest";

import {
  ENCHANTED_LIBRARY_WALK_DESCRIPTOR,
  assessPuzzleCanonicalSuitability,
  assertPuzzleCartridgePlayable,
  createPuzzleTask2CanonicalResolver,
  resolvePuzzleTitleCanonicalAssets,
} from "./puzzle-suitability.js";

describe("legacy puzzle canonical suitability", () => {
  let assessments: Awaited<ReturnType<typeof assessPuzzleCanonicalSuitability>>;

  beforeAll(async () => {
    const catalog = JSON.parse(readFileSync(
      resolve(process.cwd(), "../advantage-play-kit/assets/standard/standard-pack-release.json"),
      "utf8",
    )) as StandardAssetCatalog;
    const resolver = await createAcceptedStandardAssetResolver(catalog, ACCEPTED_STANDARD_PACK_BINDING);
    assessments = assessPuzzleCanonicalSuitability(resolver);
  }, 30_000);

  it("proves Enchanted Library walk playback from the canonical descriptor rather than a game-owned frame count", () => {
    const enchantedLibrary = assessments.find((assessment) => assessment.titleId === "enchanted-library");

    expect(ENCHANTED_LIBRARY_WALK_DESCRIPTOR.clips?.[0]).toMatchObject({
      id: "walk",
      timing: { fps: 12, loop: true },
    });
    expect(ENCHANTED_LIBRARY_WALK_DESCRIPTOR.clips?.[0]?.frames).toHaveLength(6);
    expect(enchantedLibrary?.technicalCompatibility).toMatchObject({
      animationBehavior: "pass",
      frameDirectionCompatibility: "pass",
      geometry: "pass",
      sourceReceipt: "pass",
    });
    expect(enchantedLibrary?.descriptor?.descriptorId).toBe("enchanted-library-player-walk-v1");
  });

  it("materializes the accepted title-specific v2 selected unions for Advantage Games QC only", async () => {
    const catalog = JSON.parse(readFileSync(
      resolve(process.cwd(), "../advantage-play-kit/assets/standard/standard-pack-release.json"),
      "utf8",
    )) as StandardAssetCatalog;
    const resolver = await createPuzzleTask2CanonicalResolver(catalog);

    expect(assessments.map((assessment) => assessment.titleId)).toEqual([
      "enchanted-library",
      "rune-match",
      "alchemists-synthesis",
      "potion-rush",
      "rune-forge-chamber",
    ]);
    const expectedKeys = {
      "enchanted-library": ["side-view/native/platformer-world/heroes/hero-001/hero-001-walk-source-0c1cbfb7e747"],
      "rune-match": ["ui/20x20/inventory/slot"],
      "alchemists-synthesis": ["effects/32x32/combat/hit-01"],
      "potion-rush": ["ui/16x16/controls/gamepad-buttons"],
      "rune-forge-chamber": ["top-down/32x32/characters/hero-01"],
    } as const;
    for (const assessment of assessments) {
      expect(assessment.disposition).toBe("accepted-for-advantage-games-qc");
      expect(assessment.selectedSemanticKeys).toEqual(expectedKeys[assessment.titleId]);
      const selection = await resolvePuzzleTitleCanonicalAssets(resolver, assessment.titleId);
      expect(selection.semanticKeys).toEqual(expectedKeys[assessment.titleId]);
      expect(selection.materialization).toBe("accepted-cartridge-selected-union-only");
      expect(() => assertPuzzleCartridgePlayable(assessment)).toThrow(/not playable/i);
    }
  }, 30_000);
});
