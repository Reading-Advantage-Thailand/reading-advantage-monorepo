import { describe, expect, it } from "vitest";

import {
  generateCartridgeScaffold,
  type ScaffoldOptions,
} from "../scaffold.js";

describe("noninteractive cartridge scaffold generator", () => {
  const options: ScaffoldOptions = {
    id: "scaffolded-vocab-game",
    title: "Scaffolded Vocabulary Game",
    description: "A scaffolded cartridge generated without copying another game's source tree.",
    inputMode: "vocabulary",
    capabilities: [
      "capability:nonempty-content-precondition",
      "capability:language-target-progression",
      "capability:single-completion-emission",
      "capability:result-accounting",
    ],
    semanticAssetRequirements: ["ui/16x16/icons/coin"],
  };

  it("generates a validated manifest pinning the accepted standard-pack release", () => {
    const scaffold = generateCartridgeScaffold(options);

    expect(scaffold.manifest.id).toBe("scaffolded-vocab-game");
    expect(scaffold.manifest.standardPackBinding.version).toBe("2026.07.23");
    expect(scaffold.manifest.attributionRegistration.requiredCredit).toBe(
      "Pixel art assets by ElvGames",
    );
    expect(scaffold.manifest.selectedUnionMaterialization).toBe(
      "accepted-cartridge-selected-union-only",
    );
  });

  it("generates file contents without copying another game's source tree", () => {
    const scaffold = generateCartridgeScaffold(options);

    expect(scaffold.files.map((f) => f.path)).toEqual([
      "manifest.json",
      "logic.ts",
      "scene.ts",
      "responsive.ts",
      "presentation.tsx",
      "assets.ts",
      "attribution.ts",
      "logic.test.ts",
      "browser.test.ts",
      "qc-registration.json",
    ]);
    expect(scaffold.copiedSourceTree).toBe(false);
  });

  it("generates real compact/wide responsive composition through the public API", () => {
    const scaffold = generateCartridgeScaffold(options);
    const responsive = scaffold.files.find((f) => f.path === "responsive.ts");

    expect(responsive?.content).toMatch(/resolveResponsiveComposition/);
    expect(responsive?.content).toMatch(/DEFAULT_RESPONSIVE_LAYOUT_CONFIG/);
  });

  it("generates an attribution module that registers the required ElvGames credit", () => {
    const scaffold = generateCartridgeScaffold(options);
    const attribution = scaffold.files.find((f) => f.path === "attribution.ts");

    expect(attribution?.content).toMatch(/Pixel art assets by ElvGames/);
  });

  it("generates a logic module that uses only public APK shared systems", () => {
    const scaffold = generateCartridgeScaffold(options);
    const logic = scaffold.files.find((f) => f.path === "logic.ts");

    expect(logic?.content).toMatch(/@reading-advantage\/advantage-play-kit/);
    expect(logic?.content).not.toMatch(/phaser/i);
    expect(logic?.content).toMatch(/validateNonEmptyContent|createLanguageTargetProgression/);
  });

  it("generates a QC registration that records the cartridge for the QC host", () => {
    const scaffold = generateCartridgeScaffold(options);
    const qc = scaffold.files.find((f) => f.path === "qc-registration.json");

    expect(qc?.content).toMatch(/scaffolded-vocab-game/);
    expect(qc?.content).toMatch(/\/qc/);
  });

  it("rejects a scaffold request with an unsupported capability", () => {
    expect(() =>
      generateCartridgeScaffold({
        ...options,
        capabilities: ["capability:title-specific-boss-fight"],
      }),
    ).toThrow(/validation failed|capability/i);
  });

  it("rejects a scaffold request with a physical path in semantic requirements", () => {
    expect(() =>
      generateCartridgeScaffold({
        ...options,
        semanticAssetRequirements: ["ui/16x16/icons/coin.png"],
      }),
    ).toThrow(/semantic/i);
  });
});
