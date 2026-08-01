import { describe, expect, it, vi } from "vitest";

import { APKRuntimeError } from "../runtime/errors.js";
import type { RuntimeEdition } from "../runtime/types.js";
import { createRuntimeEdition } from "../testing/fixtures.js";
import { WANG_MASK_FRAMES, WANG_TILE_GRID } from "./asset-contract.js";
import {
  preloadAssetBindings,
  registerAssetAnimations,
  resolveAssetBinding,
  resolveEdition,
  validateEdition,
  validateEditionPair,
} from "./editions.js";

function cloneEdition(overrides: Partial<RuntimeEdition> = {}): RuntimeEdition {
  return { ...structuredClone(createRuntimeEdition()), ...overrides };
}

describe("physical APK edition contract", () => {
  it("accepts the canonical 4x8 top-down sheet and required semantic animation", () => {
    const edition = cloneEdition();
    expect(validateEdition(edition, ["player.hero.top.walk.down"], "1.0.0")).toBe(edition);
  });

  it("rejects placeholder kinds, missing bindings, and incompatible runtimes", () => {
    const edition = cloneEdition();
    const file = edition.pack.files["characters/knight_top"]!;
    expect(() => validateEdition({
      ...edition,
      pack: { ...edition.pack, files: { ...edition.pack.files, [file.id]: { ...file, kind: "procedural" } } },
    }, [], "1.0.0")).toThrowError(APKRuntimeError);
    expect(() => validateEdition(edition, ["enemy.basic.top.walk.down"], "1.0.0")).toThrow(/missing required asset bindings/i);
    expect(() => validateEdition({ ...edition, runtimeApiVersion: "2.0.0" }, [], "1.0.0")).toThrow(/runtime/i);
  });

  it("rejects a sheet whose dimensions or grid do not encode 4x8 128px cells", () => {
    const edition = cloneEdition();
    const file = edition.pack.files["characters/knight_top"]!;
    expect(() => validateEdition({
      ...edition,
      pack: { ...edition.pack, files: { ...edition.pack.files, [file.id]: { ...file, width: 384 } } },
    }, [], "1.0.0")).toThrow(/frame grid/i);
  });

  it("rejects animation, origin, and collision drift from the canonical actor contract", () => {
    const edition = cloneEdition();
    const file = edition.pack.files["characters/knight_top"]!;
    const invalidFiles = [
      { ...file, animations: { ...file.animations, "walk.down": { ...file.animations!["walk.down"]!, frames: [0, 1, 2] } } },
      { ...file, origin: { x: 0.5, y: 0.5 } },
      { ...file, collision: { width: 64, height: 64, offsetX: 32, offsetY: 64 } },
    ];
    for (const invalidFile of invalidFiles) {
      expect(() => validateEdition({
        ...edition,
        pack: { ...edition.pack, files: { ...edition.pack.files, [file.id]: invalidFile } },
      }, [], "1.0.0")).toThrow(/canonical|origin|collision/i);
    }
  });

  it("rejects unsafe roots, traversal paths, and file-key mismatches", () => {
    const edition = cloneEdition();
    const file = edition.pack.files["characters/knight_top"]!;
    expect(() => validateEdition({ ...edition, pack: { ...edition.pack, root: "/uploads/latest" } }, [], "1.0.0")).toThrow(/root/i);
    expect(() => validateEdition({
      ...edition,
      pack: { ...edition.pack, files: { ...edition.pack.files, [file.id]: { ...file, path: "../knight_top.png" } } },
    }, [], "1.0.0")).toThrow(/unsafe relative path/i);
    expect(() => validateEdition({
      ...edition,
      pack: { ...edition.pack, files: { wrong: file } },
    }, [], "1.0.0")).toThrow(/key mismatch/i);
  });

  it("requires all sixteen Wang bitmasks to map directly to the 4x4 tile grid", () => {
    const edition = cloneEdition();
    const tiles = {
      id: "tiles/dungeon_walls",
      path: "tiles/dungeon_walls.png",
      kind: "wang-tileset" as const,
      view: "top-down" as const,
      width: 256,
      height: 256,
      format: "png" as const,
      alpha: true,
      byteSize: 2048,
      sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      grid: WANG_TILE_GRID,
      wangFrames: WANG_MASK_FRAMES,
      provenance: { source: "test-fixture", license: "LicenseRef-Test" },
    };
    const withTiles = {
      ...edition,
      pack: { ...edition.pack, files: { ...edition.pack.files, [tiles.id]: tiles } },
      bindings: { ...edition.bindings, "terrain.dungeon.walls.top": {
        key: "terrain.dungeon.walls.top",
        file: tiles.id,
        usage: "tileset" as const,
        view: "top-down" as const,
      } },
    };
    expect(validateEdition(withTiles, ["terrain.dungeon.walls.top"], "1.0.0")).toBe(withTiles);
    expect(() => validateEdition({
      ...withTiles,
      pack: { ...withTiles.pack, files: { ...withTiles.pack.files, [tiles.id]: { ...tiles, wangFrames: [0, 1] } } },
    }, [], "1.0.0")).toThrow(/16-mask/i);
  });

  it("requires paired themes to have identical files, paths, grids, animations, and bindings", () => {
    const primary = cloneEdition();
    const secondary = cloneEdition({
      id: "secondary-epic",
      title: "Secondary Epic",
      pack: {
        ...structuredClone(primary.pack),
        id: "riven-lands",
        root: "/assets/apk/riven-lands/v1",
      },
    });
    expect(() => validateEditionPair(primary, secondary)).not.toThrow();
    const file = secondary.pack.files["characters/knight_top"]!;
    const drifted = {
      ...secondary,
      pack: { ...secondary.pack, files: { ...secondary.pack.files, [file.id]: { ...file, path: "characters/hero_top.png" } } },
    };
    expect(() => validateEditionPair(primary, drifted)).toThrow(/physical contract/i);
  });

  it("resolves editions and view-specific animation bindings without theme branches", () => {
    const primary = cloneEdition();
    const secondary = cloneEdition({ id: "secondary-epic", title: "Secondary Epic" });
    expect(resolveEdition([primary, secondary], "secondary-epic", ["player.hero.top.idle.down"], "1.0.0")).toBe(secondary);
    expect(() => resolveEdition([primary], "missing", [], "1.0.0")).toThrow(/missing/i);
    expect(resolveAssetBinding(primary, "player.hero.top.walk.down")).toMatchObject({
      url: "/assets/apk/chibi-quest/v1/characters/knight_top.png",
      textureKey: "apk:primary-chibi:characters/knight_top",
      animationKey: "apk:primary-chibi:characters/knight_top:walk.down",
    });
    const trailingRoot = cloneEdition({
      pack: { ...primary.pack, root: "/assets/apk/chibi-quest/v1/" },
    });
    expect(resolveAssetBinding(trailingRoot, "player.hero.top.walk.down")).toMatchObject({
      url: "/assets/apk/chibi-quest/v1/characters/knight_top.png",
    });
  });

  it("preloads a shared physical sheet only once for multiple semantic animations", () => {
    const loader = { image: vi.fn(), audio: vi.fn(), spritesheet: vi.fn() };
    const edition = cloneEdition();
    preloadAssetBindings(loader, edition, [
      "player.hero.top.idle.down",
      "player.hero.top.walk.down",
    ]);
    expect(loader.spritesheet).toHaveBeenCalledTimes(1);
    expect(loader.spritesheet).toHaveBeenCalledWith(
      "apk:primary-chibi:characters/knight_top",
      "/assets/apk/chibi-quest/v1/characters/knight_top.png",
      { frameWidth: 128, frameHeight: 128 },
    );
  });

  it("registers the exact named frame sequence selected by a semantic binding", () => {
    const manager = { exists: vi.fn(() => false), create: vi.fn() };
    const edition = cloneEdition();
    registerAssetAnimations(manager, edition, ["player.hero.top.walk.down"]);
    expect(manager.create).toHaveBeenCalledWith({
      key: "apk:primary-chibi:characters/knight_top:walk.down",
      frames: [0, 1, 2, 3].map((frame) => ({
        key: "apk:primary-chibi:characters/knight_top",
        frame,
      })),
      frameRate: 8,
      repeat: -1,
    });
  });
});
