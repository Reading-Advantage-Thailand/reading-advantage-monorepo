import { describe, expect, it } from "vitest";

import {
  buildExemplarCartridgeDefinition,
  buildExemplarPublicApiSurface,
  EXEMPLAR_CARTRIDGE_ID,
  EXEMPLAR_SIX_FRAME_WALK_DESCRIPTOR,
  EXEMPLAR_WALK_SEMANTIC_REQUIREMENT,
  runExemplarSimulation,
} from "../exemplar.js";

describe("exemplar cartridge built through public APK APIs", () => {
  it("declares only accepted capabilities and pins the accepted standard-pack release", () => {
    const definition = buildExemplarCartridgeDefinition();

    expect(definition.manifest.id).toBe(EXEMPLAR_CARTRIDGE_ID);
    expect(definition.manifest.capabilities).toContain("capability:nonempty-content-precondition");
    expect(definition.manifest.capabilities).toContain("capability:language-target-progression");
    expect(definition.manifest.capabilities).toContain("capability:single-completion-emission");
    expect(definition.manifest.capabilities).toContain("capability:result-accounting");
    expect(definition.manifest.standardPackBinding.version).toBe("2026.07.23");
    expect(definition.manifest.attributionRegistration.requiredCredit).toBe(
      "Pixel art assets by ElvGames",
    );
  });

  it("does not recreate lifecycle, input, responsive, UI, asset, or test infrastructure", () => {
    const definition = buildExemplarCartridgeDefinition();

    expect(definition.manifest.capabilities).not.toContain("capability:title-specific-mechanic");
    expect(definition.bespokeLogicLineCount).toBeLessThan(60);
    expect(definition.reusesSharedSystems).toBe(true);
  });

  it("runs a deterministic simulation that completes exactly once with the unchanged result contract", () => {
    const result = runExemplarSimulation([
      { term: "cat", translation: "แมว" },
      { term: "dog", translation: "หมา" },
    ]);

    expect(result.completionCount).toBe(1);
    expect(result.results.accuracy).toBe(1);
    expect(result.results.correctAnswers).toBe(2);
    expect(result.results.totalAttempts).toBe(2);
    expect(result.results.xp).toBeGreaterThan(0);
    expect(Number.isInteger(result.results.xp)).toBe(true);
    expect(Number.isInteger(result.results.score)).toBe(true);
  });

  it("fails closed when given empty content rather than running the simulation", () => {
    expect(() => runExemplarSimulation([])).toThrow(/empty/i);
  });

  it("records a wrong attempt without advancing the progression and still completes exactly once", () => {
    const result = runExemplarSimulation([
      { term: "cat", translation: "แมว" },
      { term: "dog", translation: "หมา" },
    ], { wrongCandidateFirst: true });

    expect(result.completionCount).toBe(1);
    expect(result.results.totalAttempts).toBe(3);
    expect(result.results.correctAnswers).toBe(2);
    expect(result.results.accuracy).toBeCloseTo(2 / 3, 10);
  });

  it("uses a descriptor-owned six-frame walk clip without a legacy frame-count assumption", () => {
    expect(EXEMPLAR_WALK_SEMANTIC_REQUIREMENT).toEqual({ role: "player", state: "walk" });
    const walkClip = EXEMPLAR_SIX_FRAME_WALK_DESCRIPTOR.clips?.find((clip) => clip.id === "walk-down");

    expect(walkClip?.frames).toHaveLength(6);
    expect(walkClip?.frames).toEqual([
      { column: 0, row: 0 },
      { column: 1, row: 0 },
      { column: 2, row: 0 },
      { column: 3, row: 0 },
      { column: 4, row: 0 },
      { column: 5, row: 0 },
    ]);
    expect(walkClip?.timing).toEqual({ fps: 12, loop: true });
  });

  it("emits the required ElvGames attribution in its end-screen contract", () => {
    const definition = buildExemplarCartridgeDefinition();
    expect(definition.endScreenAttribution).toBe("Pixel art assets by ElvGames");
  });

  it("publishes responsive, semantic asset, QC, and browser fixture defaults through public APIs", () => {
    const surface = buildExemplarPublicApiSurface();
    const compact = surface.resolveComposition({
      viewport: { width: 390, height: 844 },
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      inputCapabilities: { touch: true, pointer: false, keyboard: false },
      accessibility: { textScale: 1, touchScale: 1 },
    });

    expect(compact.supported && compact.profile).toBe("compact");
    expect(surface.semanticAssetRequirements).toEqual([
      { role: "player", state: "idle" },
      { role: "feedback", state: "correct" },
      { role: "control", state: "confirm" },
    ]);
    expect(surface.qcControls.profile).toBe("auto");
    expect(surface.browserViewports).toContainEqual({ width: 1440, height: 900 });
  });
});
