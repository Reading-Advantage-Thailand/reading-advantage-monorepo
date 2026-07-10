import { describe, expect, it, vi } from "vitest";
import { createPhaserGameFactory } from "./phaser-factory.js";
import { createRuntimeCartridge, createRuntimeEdition } from "../testing/fixtures.js";

describe("createPhaserGameFactory", () => {
  it("constructs Phaser lazily and adapts scene, sound, scale, and destroy controls", async () => {
    const destroy = vi.fn();
    const pause = vi.fn();
    const resume = vi.fn();
    const refresh = vi.fn();
    const game = {
      destroy,
      scene: { getScenes: () => [{ scene: { pause, resume } }] },
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
    const instance = await factory({
      container,
      cartridge,
      input: [{ term: "river", translation: "riviere" }],
      edition: createRuntimeEdition(),
      complete: vi.fn(),
      diagnostic: vi.fn(),
      seed: 7,
    });

    expect(loadPhaser).toHaveBeenCalledOnce();
    expect(cartridge.createGameConfig).toHaveBeenCalledOnce();
    expect(Game).toHaveBeenCalledWith(expect.objectContaining({ parent: container, type: 0 }));
    instance.pause?.();
    instance.resume?.();
    instance.resize?.(390, 844);
    instance.setMuted?.(true);
    instance.destroy();
    expect(pause).toHaveBeenCalledOnce();
    expect(resume).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
    expect(game.sound.mute).toBe(true);
    expect(destroy).toHaveBeenCalledWith(true);
  });
});
