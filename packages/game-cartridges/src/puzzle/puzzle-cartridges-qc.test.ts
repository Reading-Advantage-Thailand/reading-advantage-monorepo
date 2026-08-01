import { describe, expect, it } from "vitest";

import { inspectCompositionGeometry } from "@reading-advantage/advantage-play-kit/responsive";

import { buildAlchemistsSynthesisPuzzleCartridge } from "./alchemists-synthesis-cartridge.js";
import { buildEnchantedLibraryPuzzleCartridge } from "./enchanted-library-cartridge.js";
import { buildPotionRushPuzzleCartridge } from "./potion-rush-cartridge.js";
import { buildRuneForgeChamberPuzzleCartridge } from "./rune-forge-chamber-cartridge.js";
import { buildRuneMatchPuzzleCartridge } from "./rune-match-cartridge.js";

describe("legacy puzzle candidate cartridge QC", () => {
  it("provides compact/wide composition, accessibility instructions, real normalized input, and only accepted title-selected output for every QC-only title", () => {
    const cartridges = [
      { cartridge: buildEnchantedLibraryPuzzleCartridge(), session: () => buildEnchantedLibraryPuzzleCartridge().createSession([{ term: "moon", translation: "luna" }]), input: { modality: "keyboard" as const, code: "KeyD" }, expectedAction: "move-right", selectedKey: "side-view/native/platformer-world/heroes/hero-001/hero-001-walk-source-0c1cbfb7e747" },
      { cartridge: buildRuneMatchPuzzleCartridge(), session: () => buildRuneMatchPuzzleCartridge().createSession([{ term: "moon", translation: "luna" }]), input: { modality: "keyboard" as const, code: "Enter" }, expectedAction: "confirm", selectedKey: "ui/20x20/inventory/slot" },
      { cartridge: buildAlchemistsSynthesisPuzzleCartridge(), session: () => buildAlchemistsSynthesisPuzzleCartridge().createSession([{ term: "moon", translation: "luna" }], "easy"), input: { modality: "keyboard" as const, code: "Enter" }, expectedAction: "confirm", selectedKey: "effects/32x32/combat/hit-01" },
      { cartridge: buildPotionRushPuzzleCartridge(), session: () => buildPotionRushPuzzleCartridge().createSession([{ term: "moon potion", translation: "pocion luna" }]), input: { modality: "keyboard" as const, code: "KeyD" }, expectedAction: "move-right", selectedKey: "ui/16x16/controls/gamepad-buttons" },
      { cartridge: buildRuneForgeChamberPuzzleCartridge(), session: () => buildRuneForgeChamberPuzzleCartridge().createSession([{ term: "moon rune", translation: "runa luna" }]), input: { modality: "keyboard" as const, code: "Enter" }, expectedAction: "confirm", selectedKey: "top-down/32x32/characters/hero-01" },
    ];

    for (const { cartridge, session: createSession, input, expectedAction, selectedKey } of cartridges) {
      const session = createSession();
      const compact = session.resolveQcComposition({ width: 390, height: 844 });
      const wide = session.resolveQcComposition({ width: 1440, height: 900 });
      expect(compact.profile).toBe("compact");
      expect(wide.profile).toBe("wide");
      expect(inspectCompositionGeometry(compact)).toEqual([]);
      expect(inspectCompositionGeometry(wide)).toEqual([]);
      expect(cartridge.accessibilityText).toMatch(/keyboard|pointer|tap/i);
      expect(session.dispatchPhysicalInput(input)).toEqual([expectedAction]);
      expect(() => session.resolveQcComposition({ width: 1, height: 1 })).toThrow(
        /UNSUPPORTED_VIEWPORT_SIZE.*Increase the game area/i,
      );
      expect(cartridge.scope.selectedSemanticKeys).toEqual([selectedKey]);
      expect(cartridge.manifest.semanticAssetRequirements).toEqual([selectedKey]);
      expect(cartridge.scope.playable).toBe(false);
      expect(cartridge.scope.qcPlayable).toBe(true);
      expect(cartridge.scope.registration).toBe("advantage-games-qc-only");
      expect(cartridge.scope.productionCatalogExposed).toBe(false);
      expect(cartridge.scope.readingIntegration).toBe(false);
      expect(cartridge.scope.primaryIntegration).toBe(false);
    }
  });

  it("rejects empty playable content before any puzzle state can be created", () => {
    expect(() => buildEnchantedLibraryPuzzleCartridge().createSession([])).toThrow(/nonempty/i);
    expect(() => buildRuneMatchPuzzleCartridge().createSession([])).toThrow(/nonempty/i);
    expect(() => buildAlchemistsSynthesisPuzzleCartridge().createSession([], "easy")).toThrow(/nonempty/i);
    expect(() => buildPotionRushPuzzleCartridge().createSession([])).toThrow(/nonempty/i);
    expect(() => buildRuneForgeChamberPuzzleCartridge().createSession([])).toThrow(/nonempty/i);
  });
});
