import { describe, expect, it, vi } from "vitest";

import {
  cartridgeCatalog,
  cartridgeLoaders,
  getCartridgeCatalogEntry,
} from "../catalog";
import { primaryChibiEdition } from "../editions";

describe("cartridge catalog", () => {
  it("publishes the three representative Phaser-native mechanics", () => {
    expect(cartridgeCatalog.map((entry) => entry.id)).toEqual([
      "dragon-flight",
      "dungeon-liberator",
      "magic-defense",
    ]);
    expect(cartridgeCatalog.map((entry) => entry.mechanic)).toEqual([
      "gate-runner",
      "sentence-order-collection",
      "typing-defense",
    ]);
  });

  it("keeps catalog metadata independent from eager cartridge imports", () => {
    expect(Object.keys(cartridgeLoaders)).toEqual([
      "dragon-flight",
      "dungeon-liberator",
      "magic-defense",
    ]);
    for (const loader of Object.values(cartridgeLoaders)) {
      expect(loader).toBeTypeOf("function");
    }
  });

  it("loads each cartridge through a literal dynamic import", async () => {
    expect(Object.keys(cartridgeLoaders)).toEqual(
      cartridgeCatalog.map(({ id }) => id),
    );

    for (const entry of cartridgeCatalog) {
      const cartridge = await cartridgeLoaders[entry.id]();
      expect(cartridge.manifest).toMatchObject({
        id: entry.id,
        title: entry.title,
        description: entry.description,
        inputMode: entry.inputMode,
      });
      expect(cartridge.manifest.runtimeApiVersion).toBe("1.0.0");
      expect(cartridge.createGameConfig).toBeTypeOf("function");
    }
  });

  it("preloads semantic edition assets for every cartridge scene", async () => {
    const edition = {
      ...primaryChibiEdition,
      assets: {
        ...primaryChibiEdition.assets,
        "world.background": {
          ...primaryChibiEdition.assets["world.background"],
          type: "image" as const,
          url: "/editions/test-background.png",
          metadata: {
            ...primaryChibiEdition.assets["world.background"]!.metadata,
            format: "png",
          },
        },
      },
    };
    const input = [
      { term: "dragon flies", translation: "first" },
      { term: "knight guards", translation: "second" },
    ];

    for (const entry of cartridgeCatalog) {
      const cartridge = await cartridgeLoaders[entry.id]();
      const config = cartridge.createGameConfig({
        input,
        edition,
        complete: vi.fn(),
        diagnostic: vi.fn(),
        inputController: { snapshot: vi.fn(), destroy: vi.fn() },
        seed: 7,
      });
      const scene = config.scene as {
        preload?: (this: { load: { image: ReturnType<typeof vi.fn> } }) => void;
      };
      const image = vi.fn();

      expect(scene.preload).toBeTypeOf("function");
      scene.preload?.call({ load: { image } });
      expect(image).toHaveBeenCalledWith(
        "world.background",
        "/editions/test-background.png",
      );
    }
  });

  it("returns undefined for an unknown cartridge", () => {
    expect(getCartridgeCatalogEntry("not-a-game")).toBeUndefined();
  });

  it.each(["gate-runner", "sentence-collector", "typing-defense"])(
    "rejects retired public ID %s",
    (retiredId) => {
      expect(getCartridgeCatalogEntry(retiredId)).toBeUndefined();
      expect(retiredId in cartridgeLoaders).toBe(false);
    },
  );
});
