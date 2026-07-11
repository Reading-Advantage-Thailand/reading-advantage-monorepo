import { describe, expect, it, vi } from "vitest";
import { arenaWaveBlueprints } from "../arena-wave-blueprints";
import { cartridgeLoaders } from "../catalog";

describe("W4 dual-edition arena cartridges", () => {
  it.each(arenaWaveBlueprints)("loads $id with its frozen manifest and shared scene", async (blueprint) => {
    const cartridge = await cartridgeLoaders[blueprint.id]();
    expect(cartridge.manifest).toMatchObject({ id: blueprint.id, inputMode: blueprint.inputMode, requiredAssetSlots: blueprint.requiredAssetSlots });
    const config = cartridge.createGameConfig({
      input: blueprint.contentFixture,
      edition: { id: "test", title: "Test", runtimeApiVersion: "1.0.0", assets: {}, palette: { background: 0, player: 1, friendly: 2, hostile: 3, accent: 4, text: "#fff" }, tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 1 } },
      inputController: { snapshot: () => ({ keys: [], pointer: { down: false, cancelled: false, id: null, kind: null, startX: 0, startY: 0, x: 0, y: 0 }, destroyed: false }), destroy: vi.fn() },
      complete: vi.fn(), diagnostic: vi.fn(), seed: 29,
    });
    expect(config).toMatchObject({ width: 960, height: 540, scene: { preload: expect.any(Function), create: expect.any(Function) } });
  });
});
