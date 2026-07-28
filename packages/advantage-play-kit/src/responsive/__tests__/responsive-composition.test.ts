import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  containerPointToWorld,
  createResponsiveTransitionCoordinator,
  evaluateTextFit,
  inspectCompositionGeometry,
  resolveResponsiveComposition,
  worldPointToContainer,
} from "../responsive-composition.js";

describe("responsive composition", () => {
  it.each([
    [360, 800, "compact", "touch"],
    [390, 844, "compact", "touch"],
    [768, 1024, "compact", "touch"],
    [1024, 768, "wide", "hybrid"],
    [1440, 900, "wide", "pointer-keyboard"],
    [1920, 1080, "wide", "pointer-keyboard"],
  ] as const)("resolves %sx%s to %s independently from %s input", (width, height, profile, inputMode) => {
    const result = resolveResponsiveComposition({
      viewport: { width, height },
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      inputCapabilities: inputMode === "touch"
        ? { touch: true, pointer: false, keyboard: false }
        : inputMode === "hybrid"
          ? { touch: true, pointer: true, keyboard: true }
          : { touch: false, pointer: true, keyboard: true },
      accessibility: { textScale: 1, touchScale: 1 },
      config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
    });

    expect(result.supported).toBe(true);
    if (!result.supported) throw new Error("Expected supported composition");
    expect(result.profile).toBe(profile);
    expect(result.inputMode).toBe(inputMode);
    expect(inspectCompositionGeometry(result).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("fails closed when neither profile can meet its minimum geometry", () => {
    const result = resolveResponsiveComposition({
      viewport: { width: 300, height: 420 },
      safeArea: { top: 20, right: 0, bottom: 20, left: 0 },
      inputCapabilities: { touch: true, pointer: false, keyboard: false },
      accessibility: { textScale: 1.25, touchScale: 1.25 },
      config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
    });

    expect(result).toMatchObject({
      supported: false,
      code: "UNSUPPORTED_VIEWPORT_SIZE",
    });
  });

  it("applies safe areas and maps points through the gameplay viewport and camera", () => {
    const result = resolveResponsiveComposition({
      viewport: { width: 390, height: 844 },
      safeArea: { top: 24, right: 8, bottom: 20, left: 8 },
      inputCapabilities: { touch: true, pointer: false, keyboard: false },
      accessibility: { textScale: 1, touchScale: 1 },
      config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
    });
    if (!result.supported) throw new Error("Expected supported composition");

    expect(result.safeRect).toMatchObject({ x: 8, y: 24, width: 374, height: 800 });
    const camera = { x: 100, y: 50, zoom: 2 };
    const container = worldPointToContainer({ x: 150, y: 80 }, result.regions.gameplay, camera);
    expect(containerPointToWorld(container, result.regions.gameplay, camera)).toEqual({ x: 150, y: 80 });
  });

  it("uses hysteresis to avoid profile oscillation near the wide threshold", () => {
    const result = resolveResponsiveComposition({
      viewport: { width: 790, height: 768 },
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      inputCapabilities: { touch: false, pointer: true, keyboard: true },
      accessibility: { textScale: 1, touchScale: 1 },
      previousProfile: "wide",
      config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
    });

    expect(result.supported && result.profile).toBe("wide");
  });

  it("reports complete Thai text that cannot fit without truncating or shrinking below minimum", () => {
    const text = "การเรียนรู้คำศัพท์ภาษาอังกฤษผ่านการผจญภัย";
    const fit = evaluateTextFit({
      text,
      locale: "th",
      box: { x: 0, y: 0, width: 120, height: 48 },
      style: { fontFamily: "Noto Sans Thai", fontSize: 20, minFontSize: 18, lineHeight: 1.4, maxLines: 2 },
      measure: (value, style) => ({ width: value.length * style.fontSize, height: style.fontSize * style.lineHeight }),
    });

    expect(fit.fits).toBe(false);
    expect(fit.action).toBe("recompose");
    expect(fit.renderedText).toBe(text);
    expect(fit.diagnostics.some((diagnostic) => diagnostic.code === "TEXT_OVERFLOW")).toBe(true);
  });

  it("preserves captured state and cancels a gesture during atomic profile transitions", () => {
    const calls: string[] = [];
    const state = { score: 40, target: "dragon", timerMs: 1200 };
    const coordinator = createResponsiveTransitionCoordinator({
      captureState: () => ({ ...state }),
      restoreState: (snapshot) => {
        expect(snapshot).toEqual(state);
        calls.push("restore");
      },
      pause: () => calls.push("pause"),
      resume: () => calls.push("resume"),
      cancelGesture: () => calls.push("cancel"),
      recompose: () => calls.push("recompose"),
      diagnostic: vi.fn(),
    });
    const compact = resolveResponsiveComposition({
      viewport: { width: 390, height: 844 },
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      inputCapabilities: { touch: true, pointer: false, keyboard: false },
      accessibility: { textScale: 1, touchScale: 1 },
      config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
    });
    const wide = resolveResponsiveComposition({
      viewport: { width: 1440, height: 900 },
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      inputCapabilities: { touch: false, pointer: true, keyboard: true },
      accessibility: { textScale: 1, touchScale: 1 },
      config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
    });
    if (!compact.supported || !wide.supported) throw new Error("Expected supported compositions");

    coordinator.transition(compact, wide, "orientation");
    expect(calls).toEqual(["pause", "cancel", "recompose", "restore", "resume"]);
  });
});
