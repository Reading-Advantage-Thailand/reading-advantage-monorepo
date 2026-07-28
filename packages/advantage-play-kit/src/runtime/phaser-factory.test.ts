import { describe, expect, it, vi } from "vitest";
import { createPhaserGameFactory } from "./phaser-factory.js";
import { createRuntimeCartridge, createRuntimeEdition } from "../testing/fixtures.js";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG, resolveResponsiveComposition } from "../responsive/responsive-composition.js";

describe("createPhaserGameFactory", () => {
  it("constructs Phaser lazily and adapts scene, sound, scale, and destroy controls", async () => {
    const destroy = vi.fn();
    const pause = vi.fn();
    const resume = vi.fn();
    const refresh = vi.fn();
    const captureResponsiveState = vi.fn(() => ({ score: 12 }));
    const restoreResponsiveState = vi.fn();
    const recompose = vi.fn();
    const scene = {
      scene: { pause, resume },
      apkCaptureResponsiveState: captureResponsiveState,
      apkRestoreResponsiveState: restoreResponsiveState,
      apkRecompose: recompose,
    };
    const game = {
      destroy,
      scene: { getScenes: () => [scene] },
      sound: { mute: false },
      scale: { refresh },
    };
    const Game = vi.fn(function MockPhaserGame() {
      return game;
    });
    const loadPhaser = vi.fn(async () => ({ AUTO: 0, Scale: { FIT: 1, CENTER_BOTH: 2 }, Game }));
    const factory = createPhaserGameFactory(loadPhaser);
    const container = document.createElement("div");
    const cartridge = createRuntimeCartridge();
    cartridge.createGameConfig = vi.fn(() => ({ scene: [] }));
    const composition = resolveResponsiveComposition({
      viewport: { width: 390, height: 844 },
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      inputCapabilities: { touch: true, pointer: false, keyboard: false },
      accessibility: { textScale: 1, touchScale: 1 },
      config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
    });
    if (!composition.supported) throw new Error("Expected supported composition");
    const instance = await factory({
      container,
      cartridge,
      input: [{ term: "river", translation: "riviere" }],
      edition: createRuntimeEdition(),
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: { snapshot: vi.fn(), cancelActiveGesture: vi.fn(), destroy: vi.fn() },
      composition,
      seed: 7,
    });

    expect(loadPhaser).toHaveBeenCalledOnce();
    expect(cartridge.createGameConfig).toHaveBeenCalledOnce();
    expect(Game).toHaveBeenCalledWith(expect.objectContaining({ parent: container, type: 0 }));
    instance.pause?.();
    instance.resume?.();
    instance.resize?.(390, 844);
    instance.setMuted?.(true);
    const responsiveState = instance.captureResponsiveState?.();
    instance.recompose?.(composition);
    instance.restoreResponsiveState?.(responsiveState);
    instance.destroy();
    expect(pause).toHaveBeenCalledOnce();
    expect(resume).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(game.sound.mute).toBe(true);
    expect(captureResponsiveState).toHaveBeenCalledOnce();
    expect(recompose).toHaveBeenCalledWith(composition);
    expect(restoreResponsiveState).toHaveBeenCalledWith({ score: 12 });
    expect(destroy).toHaveBeenCalledWith(true);
  });
});
