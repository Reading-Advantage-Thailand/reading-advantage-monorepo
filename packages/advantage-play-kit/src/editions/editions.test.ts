import { describe, expect, it, vi } from "vitest";
import { APKRuntimeError } from "../runtime/errors.js";
import {
  preloadSemanticAssets,
  resolveEdition,
  resolveSemanticAsset,
  validateEdition,
} from "./editions.js";
import { createRuntimeEdition } from "../testing/fixtures.js";

describe("edition resolution", () => {
  it("validates runtime compatibility and required semantic slots", () => {
    const edition = createRuntimeEdition();
    expect(validateEdition(edition, ["player.hero", "feedback.correct"], "1.0.0")).toBe(edition);
    expect(() => validateEdition(edition, ["enemy.basic"], "1.0.0")).toThrowError(APKRuntimeError);
    expect(() => validateEdition({ ...edition, runtimeApiVersion: "2" }, [], "1.0.0")).toThrow(
      /runtime/i,
    );
    expect(() =>
      validateEdition(
        {
          ...edition,
          assets: {
            ...edition.assets,
            "player.hero": { ...edition.assets["player.hero"]!, key: "wrong.texture" },
          },
        },
        ["player.hero"],
        "1.0.0",
      ),
    ).toThrow(/key/i);
  });

  it("selects one edition without game-source branches", () => {
    const primary = createRuntimeEdition({ id: "primary-chibi" });
    const secondary = createRuntimeEdition({ id: "secondary-epic" });
    expect(resolveEdition([primary, secondary], "secondary-epic", ["player.hero"], "1.0.0")).toBe(
      secondary,
    );
    expect(() => resolveEdition([primary], "missing", [], "1.0.0")).toThrow(/missing/i);
  });

  it("resolves semantic local and host-relative asset locations", () => {
    const edition = createRuntimeEdition();
    expect(resolveSemanticAsset(edition, "player.hero")).toMatchObject({
      key: "player.hero",
      url: "/apk/primary/hero.svg",
    });
    expect(
      resolveSemanticAsset(edition, "player.hero", (asset) => `https://cdn.test/v1/${asset.url}`),
    ).toMatchObject({ url: "https://cdn.test/v1//apk/primary/hero.svg" });
    expect(() => resolveSemanticAsset(edition, "enemy.missing")).toThrow(/enemy\.missing/);
  });

  it("translates semantic assets into Phaser preload calls", () => {
    const loader = { image: vi.fn(), audio: vi.fn() };
    const edition = createRuntimeEdition();
    preloadSemanticAssets(loader, edition, ["player.hero", "feedback.correct"]);
    expect(loader.image).toHaveBeenCalledWith("player.hero", "/apk/primary/hero.svg");
    expect(loader.audio).toHaveBeenCalledWith("feedback.correct", "/apk/primary/correct.ogg");
  });

  it("covers every Phaser loader family and skips procedural placeholders", () => {
    const loader = {
      image: vi.fn(),
      audio: vi.fn(),
      spritesheet: vi.fn(),
      atlas: vi.fn(),
      tilemapTiledJSON: vi.fn(),
    };
    const base = createRuntimeEdition();
    const edition = createRuntimeEdition({
      assets: {
        ...base.assets,
        placeholder: {
          key: "placeholder",
          type: "procedural",
          provenance: { source: "test", license: "original" },
          metadata: { version: "1", format: "procedural", optimized: true },
        },
        font: {
          key: "font",
          type: "font",
          url: "/font.png",
          provenance: { source: "test", license: "original" },
          metadata: { version: "1", format: "png", optimized: true },
        },
        sheet: {
          key: "sheet",
          type: "spritesheet",
          url: "/sheet.png",
          config: { frameWidth: 32 },
          provenance: { source: "test", license: "original" },
          metadata: { version: "1", format: "png", optimized: true, frames: ["idle"] },
        },
        atlas: {
          key: "atlas",
          type: "atlas",
          url: "/atlas.png",
          config: { atlasUrl: "/atlas.json" },
          provenance: { source: "test", license: "original" },
          metadata: { version: "1", format: "png", optimized: true, frames: ["hero"] },
        },
        map: {
          key: "map",
          type: "tilemap",
          url: "/map.json",
          provenance: { source: "test", license: "original" },
          metadata: { version: "1", format: "json", optimized: true },
        },
      },
    });

    preloadSemanticAssets(loader, edition, ["placeholder", "font", "sheet", "atlas", "map"]);
    expect(loader.image).toHaveBeenCalledWith("font", "/font.png");
    expect(loader.spritesheet).toHaveBeenCalledWith("sheet", "/sheet.png", { frameWidth: 32 });
    expect(loader.atlas).toHaveBeenCalledWith("atlas", "/atlas.png", "/atlas.json");
    expect(loader.tilemapTiledJSON).toHaveBeenCalledWith("map", "/map.json");
  });

  it("reports a semantic asset that cannot be loaded", () => {
    const base = createRuntimeEdition();
    const edition = createRuntimeEdition({
      assets: {
        ...base.assets,
        broken: {
          key: "broken",
          type: "image",
          provenance: { source: "test", license: "original" },
          metadata: { version: "1", format: "png", optimized: false },
        },
      },
    });
    expect(() => preloadSemanticAssets({ image: vi.fn() }, edition, ["broken"])).toThrow(/no URL/i);
  });
});
