import { describe, expect, it } from "vitest";

import { validateRuntimeCartridgeManifest } from "@reading-advantage/advantage-play-kit/runtime";

import {
  cartridgeCatalog,
  cartridgeLoaders,
  getCartridgeCatalogEntry,
  listCartridgeCatalog,
} from "./catalog";

describe("public APK cartridge catalog", () => {
  it("exposes the 28 immutable entries and matching lazy loaders", async () => {
    const expectedIds = [
      "dragon-flight",
      "astral-mage",
      "sorcerer-ziggurat",
      "dragon-rider",
      "spellweavers-run",
      "shadow-gate-dungeon",
      "labyrinth-goblin-king",
      "griffin-riders-escape",
      "castle-defense",
      "magic-defense",
      "rpg-battle",
      "wizard-vs-zombie",
      "enchanted-library",
      "rune-match",
      "alchemists-synthesis",
      "potion-rush",
      "dungeon-liberator",
      "rune-forge-chamber",
      "village-guardian",
      "abyssal-well",
      "archers-revenge",
      "storm-castle-tower",
      "griffin-sky-joust",
      "realm-carver",
      "paladins-twin-soul",
      "devourer-slime",
      "haunted-library",
      "gryphon-patrol",
    ] as const;

    expect(listCartridgeCatalog()).toBe(cartridgeCatalog);
    const catalogIds = cartridgeCatalog.map((entry) => entry.id);
    expect(catalogIds).toEqual(expectedIds);
    expect(cartridgeCatalog).toHaveLength(28);
    expect(new Set(catalogIds).size).toBe(28);
    expect(Object.isFrozen(cartridgeCatalog)).toBe(true);
    expect(Object.keys(cartridgeLoaders)).toEqual(expectedIds);
    expect(Object.values(cartridgeLoaders).every((loader) => typeof loader === "function")).toBe(true);
    for (const entry of cartridgeCatalog) {
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.requiredAssetBindings)).toBe(true);
      expect(Object.isFrozen(entry.capabilities)).toBe(true);
    }

    expect(getCartridgeCatalogEntry("magic-defense")).toEqual({
      id: "magic-defense",
      title: "Magic Defense",
      description: "Choose translation lanes to protect the castle from incoming magic.",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
      requiredAssetBindings: ["legacy-catalog/magic-defense/arcane-castle"],
      capabilities: [
        "capability:three-answer-lanes",
        "capability:spell-energy-cost",
        "capability:castle-ward-hazards",
      ],
    });
    expect(getCartridgeCatalogEntry("castle-defense")).toEqual({
      id: "castle-defense",
      title: "Castle Defense",
      description: "Build a castle defense by placing sentence words in order.",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["legacy-catalog/castle-defense/fortress"],
      capabilities: [
        "capability:four-direction-defense",
        "capability:sentence-chain-reset",
        "capability:castle-health-hazards",
      ],
    });

    const [magicDefense, castleDefense] = await Promise.all([
      cartridgeLoaders["magic-defense"](),
      cartridgeLoaders["castle-defense"](),
    ]);
    expect(magicDefense).toMatchObject({
      manifest: { id: "magic-defense", inputMode: "vocabulary" },
    });
    expect(castleDefense).toMatchObject({
      manifest: { id: "castle-defense", inputMode: "sentence" },
    });
    expect(getCartridgeCatalogEntry("missing-cartridge")).toBeUndefined();
  }, 30_000);

  it("keeps catalog metadata aligned with every loaded manifest", async () => {
    const loaders = Object.entries(cartridgeLoaders);
    expect(loaders).toHaveLength(28);

    for (const [loaderId, load] of loaders) {
      const { manifest } = await load();
      const catalogEntry = getCartridgeCatalogEntry(loaderId);

      expect(catalogEntry).toEqual({
        id: manifest.id,
        title: manifest.title,
        description: manifest.description,
        runtimeApiVersion: manifest.runtimeApiVersion,
        inputMode: manifest.inputMode,
        requiredAssetBindings: manifest.requiredAssetBindings,
        capabilities: manifest.capabilities,
      });
    }
  }, 30_000);

  it("passes the load-path manifest contract that mountCartridge enforces", async () => {
    const loaders = Object.entries(cartridgeLoaders);
    expect(loaders).toHaveLength(28);

    for (const [loaderId, load] of loaders) {
      const { manifest } = await load();
      expect(() => validateRuntimeCartridgeManifest(manifest), loaderId).not.toThrow();
    }
  }, 30_000);
});
