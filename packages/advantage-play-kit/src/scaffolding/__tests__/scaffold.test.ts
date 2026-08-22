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
    requiredAssetBindings: ["ui/16x16/icons/coin"],
    semanticStateRequirements: [{ role: "player", state: "walk" }],
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
    expect(scaffold.manifest.tutorial).toMatchObject({
      schemaVersion: 1,
      lifecycle: {
        complete: { to: "playing" },
        productionEffects: {
          emitGameResults: false,
          persistProgress: false,
        },
      },
    });
  });

  it("generates file contents without copying another game's source tree", () => {
    const scaffold = generateCartridgeScaffold(options);

    expect(scaffold.files.map((f) => f.path)).toEqual([
      "manifest.json",
      "logic.ts",
      "scene.ts",
      "responsive.ts",
      "presentation.tsx",
      "experience.ts",
      "cartridge.ts",
      "index.ts",
      "assets.ts",
      "attribution.ts",
      "logic.test.ts",
      "experience.test.ts",
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

  it("generates runnable Phaser scene and config code without placeholder boundaries", () => {
    const scaffold = generateCartridgeScaffold(options);
    const scene = scaffold.files.find((file) => file.path === "scene.ts");
    const runtimeSource = scaffold.files
      .filter((file) => !file.path.endsWith(".test.ts") && !file.path.endsWith(".test.tsx"))
      .map((file) => file.content)
      .join("\n");

    expect(runtimeSource).not.toMatch(/TODO|goes here|scene stub|placeholder|throw new Error/i);
    expect(runtimeSource).not.toMatch(/from\s+["'][^"']*(?:^|\/)(?:next|app|database)(?:\/|["'])/i);
    expect(scene?.content).toContain('import type Phaser from "phaser";');
    expect(scene?.content).toMatch(/Phaser\.Types\.Core\.GameConfig/);
    expect(scene?.content).toMatch(/createScaffoldedVocabGameConfig/);
    expect(scene?.content).toMatch(/scene:\s*createScaffoldedVocabGameScene/);
    expect(scene?.content).toMatch(/add\.text/);
    expect(scene?.content).toMatch(/setInteractive/);
    expect(scene?.content).toMatch(/pointerdown/);
    expect(scene?.content).toMatch(/keydown/);
    expect(scene?.content).toMatch(/keyboard:\s*true/);
    expect(scene?.content).toMatch(/mouse:\s*true/);
    expect(scene?.content).toMatch(/touch:\s*true/);
    expect(scene?.content).toMatch(/currentIndex % choices\.length/);
    expect(scene?.content).toMatch(/events\.once\("shutdown"/);
    expect(scene?.content).toMatch(/keyboard\?\.off\("keydown"/);
    expect(scene?.content).toMatch(/completion\.sealWithoutDelivery\(\)/);
  });

  it("generates shared attempt accounting and exactly-once GameResults wiring", () => {
    const scaffold = generateCartridgeScaffold(options);
    const scene = scaffold.files.find((file) => file.path === "scene.ts");

    expect(scene?.content).toMatch(/createLanguageTargetProgression/);
    expect(scene?.content).toMatch(/items\.map\(\(item\) => item\.translation\)/);
    expect(scene?.content).toMatch(/createResultAccountant/);
    expect(scene?.content).toMatch(/recordAttempt\(\{ correct: isCorrect \}\)/);
    expect(scene?.content).toMatch(/correctAnswers/);
    expect(scene?.content).toMatch(/totalAttempts/);
    expect(scene?.content).toMatch(/createCompletionLatch<GameResults>/);
    expect(scene?.content).toMatch(/completion\.complete\(result\)/);
    expect(scene?.content).toMatch(/context\.complete/);
  });

  it("generates a loadable cartridge entry point and complete standard experience", () => {
    const scaffold = generateCartridgeScaffold(options);
    const experience = scaffold.files.find((file) => file.path === "experience.ts");
    const cartridge = scaffold.files.find((file) => file.path === "cartridge.ts");
    const index = scaffold.files.find((file) => file.path === "index.ts");

    expect(experience?.content).toMatch(/STANDARD_EXPERIENCE/);
    expect(experience?.content).toMatch(/briefing/);
    expect(experience?.content).toMatch(/tutorial/);
    expect(experience?.content).toMatch(/debrief/);
    expect(experience?.content).toMatch(/createScaffoldedVocabGameStandardExperience/);
    expect(experience?.content).toMatch(/createTutorialActionDriver/);
    expect(cartridge?.content).toMatch(/StandardExperienceCartridge/);
    expect(cartridge?.content).toMatch(/createScaffoldedVocabGameCartridge/);
    expect(cartridge?.content).toMatch(/standardExperience/);
    expect(cartridge?.content).toMatch(/createScaffoldedVocabGameConfig/);
    expect(index?.content).toMatch(/\.\/cartridge\.js/);
    expect(index?.content).toMatch(/\.\/experience\.js/);
  });

  it("generates descriptor-driven asset selection from semantic role/state requests", () => {
    const scaffold = generateCartridgeScaffold(options);
    const assets = scaffold.files.find((file) => file.path === "assets.ts");
    const scene = scaffold.files.find((file) => file.path === "scene.ts");

    expect(assets?.content).toMatch(/SEMANTIC_STATE_REQUIREMENTS/);
    expect(assets?.content).toContain('{"role":"player","state":"walk"}');
    expect(assets?.content).toMatch(/descriptor-driven/);
    expect(scene?.content).toMatch(/AssetContractV2SemanticRegistration/);
    expect(scene?.content).toMatch(/createDescriptorDrivenPresentationAdapter/);
    expect(scene?.content).toMatch(/descriptor.clips/);
    expect(scene?.content).not.toMatch(/frames.slice(0, 3)|frames.lengths*===s*3/);
  });

  it("generates a QC registration that records the cartridge for the QC host", () => {
    const scaffold = generateCartridgeScaffold(options);
    const qc = scaffold.files.find((f) => f.path === "qc-registration.json");

    expect(qc?.content).toMatch(/scaffolded-vocab-game/);
    expect(qc?.content).toMatch(/\/qc/);
  });

  it("rejects a scaffold request with a malformed capability id", () => {
    expect(() =>
      generateCartridgeScaffold({ ...options, capabilities: ["arcade-physics"] }),
    ).toThrow(/capability/i);
  });

  it("rejects a scaffold request with a physical path in semantic requirements", () => {
    expect(() =>
      generateCartridgeScaffold({
        ...options,
        requiredAssetBindings: ["ui/16x16/icons/coin.png"],
      }),
    ).toThrow(/semantic/i);
  });

  it("rejects a scaffold request with a physical path in semantic state requirements", () => {
    expect(() =>
      generateCartridgeScaffold({
        ...options,
        semanticStateRequirements: [{ role: "player", state: "walk.png" }],
      }),
    ).toThrow(/semantic state requirements/i);
  });
});
