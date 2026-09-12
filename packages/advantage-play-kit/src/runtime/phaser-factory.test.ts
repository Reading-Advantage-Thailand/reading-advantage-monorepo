import { describe, expect, it, vi } from "vitest";
import { createPhaserGameFactory } from "./phaser-factory.js";
import { createRuntimeCartridge, createRuntimeEdition } from "../testing/fixtures.js";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG, resolveResponsiveComposition } from "../responsive/responsive-composition.js";

describe("createPhaserGameFactory", () => {
  it("constructs Phaser lazily and adapts scene, sound, scale, and destroy controls", async () => {
    const destroy = vi.fn();
    let active = true;
    const pause = vi.fn(() => { active = false; });
    const resume = vi.fn(() => { active = true; });
    const refresh = vi.fn();
    const setGameSize = vi.fn();
    const pauseGame = vi.fn();
    const resumeGame = vi.fn();
    const captureResponsiveState = vi.fn(() => ({ score: 12 }));
    const restoreResponsiveState = vi.fn();
    const recompose = vi.fn();
    const render = vi.fn();
    const renderer = { preRender: vi.fn(), postRender: vi.fn() };
    const scene = {
      scene: { pause, resume },
      apkCaptureResponsiveState: captureResponsiveState,
      apkRestoreResponsiveState: restoreResponsiveState,
      apkRecompose: recompose,
    };
    const game = {
      destroy,
      scene: { getScenes: (activeOnly?: boolean) => activeOnly && !active ? [] : [scene], render },
      renderer,
      sound: { mute: false },
      pause: pauseGame,
      resume: resumeGame,
      scale: { refresh, setGameSize },
    };
    const Game = vi.fn(function MockPhaserGame() {
      return game;
    });
    const loadPhaser = vi.fn(async () => ({ AUTO: 0, Scale: { FIT: 1, CENTER_BOTH: 2 }, Game }));
    const factory = createPhaserGameFactory(loadPhaser);
    const container = document.createElement("div");
    const cartridge = createRuntimeCartridge();
    cartridge.createGameConfig = vi.fn(() => ({ width: 960, height: 540, scene: [] }));
    const composition = resolveResponsiveComposition({
      viewport: { width: 390, height: 844 },
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      inputCapabilities: { touch: true, pointer: false, keyboard: false },
      accessibility: { textScale: 1, touchScale: 1 },
      config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
    });
    if (!composition.supported) throw new Error("Expected supported composition");
    const answerAudio = {} as import("../audio/index.js").AnswerChoiceAudioController;
    const instance = await factory({
      container,
      cartridge,
      input: [{ term: "river", translation: "riviere" }],
      edition: createRuntimeEdition(),
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: { snapshot: vi.fn(), cancelActiveGesture: vi.fn(), destroy: vi.fn() },
      composition,
      answerAudio,
      seed: 7,
    });

    expect(loadPhaser).toHaveBeenCalledOnce();
    expect(cartridge.createGameConfig).toHaveBeenCalledOnce();
    expect(cartridge.createGameConfig).toHaveBeenCalledWith(expect.objectContaining({ answerAudio }));
    expect(Game).toHaveBeenCalledWith(expect.objectContaining({
      parent: container,
      type: 0,
      width: 390,
      height: 844,
    }));
    instance.pause?.();
    instance.resize?.(390, 844);
    instance.setMuted?.(true);
    const responsiveState = instance.captureResponsiveState?.();
    instance.recompose?.(composition);
    expect(renderer.preRender).toHaveBeenCalledOnce();
    expect(render).toHaveBeenCalledWith(renderer);
    expect(renderer.postRender).toHaveBeenCalledOnce();
    expect(resumeGame).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
    instance.restoreResponsiveState?.(responsiveState);
    instance.resume?.();
    instance.destroy();
    expect(pauseGame).toHaveBeenCalledOnce();
    expect(resumeGame).toHaveBeenCalledOnce();
    expect(pause).toHaveBeenCalledOnce();
    expect(resume).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(setGameSize).toHaveBeenCalledWith(390, 844);
    expect(game.sound.mute).toBe(true);
    expect(captureResponsiveState).toHaveBeenCalledOnce();
    expect(recompose).toHaveBeenCalledWith(composition);
    expect(restoreResponsiveState).toHaveBeenCalledWith({ score: 12 });
    expect(destroy).toHaveBeenCalledWith(true);
  });

  it("waits for Phaser destruction before renderer cleanup resolves", async () => {
    let finishDestroy: () => void = () => undefined;
    const destroy = vi.fn();
    const events = {
      once: vi.fn((_event: string, listener: () => void) => {
        finishDestroy = listener;
      }),
    };
    const Game = vi.fn(function MockPhaserGame() {
      return { destroy, events };
    });
    const factory = createPhaserGameFactory(async () => ({ AUTO: 0, Game }));
    const instance = await factory({
      container: document.createElement("div"),
      cartridge: createRuntimeCartridge(),
      input: [{ term: "river", translation: "riviere" }],
      edition: createRuntimeEdition(),
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: { snapshot: vi.fn(), cancelActiveGesture: vi.fn(), destroy: vi.fn() },
    });
    let settled = false;
    const cleanup = Promise.resolve(instance.destroy()).then(() => {
      settled = true;
    });

    expect(events.once).toHaveBeenCalledWith("destroy", expect.any(Function));
    expect(destroy).toHaveBeenCalledWith(true);
    await Promise.resolve();
    expect(settled).toBe(false);

    finishDestroy();
    await cleanup;
    expect(settled).toBe(true);
  });
});
