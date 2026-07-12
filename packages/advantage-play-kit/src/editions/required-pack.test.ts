import { describe, expect, it } from "vitest";

import type { AssetPackManifest, PhysicalAssetFile } from "../runtime/types.js";
import {
  DOOR_PROP_GRID,
  FOUR_FRAME_PROP_GRID,
  FOUR_FRAME_VFX_GRID,
  ISOMETRIC_WANG_TILE_GRID,
  SIDE_SCROLL_CHARACTER_GRID,
  TOP_DOWN_CHARACTER_GRID,
  WANG_TILE_GRID,
} from "./asset-contract.js";
import { validateEdition } from "./editions.js";
import {
  REQUIRED_PHYSICAL_ASSETS,
  validateCompleteAssetPack,
} from "./required-pack.js";

/**
 * Encodes the structural requirements with deterministic placeholder content metadata.
 * @param id Audience pack identifier.
 * @returns Complete manifest suitable for production-contract tests.
 */
function createCompletePack(id: "chibi-quest" | "riven-lands" = "chibi-quest"): AssetPackManifest {
  const files = Object.fromEntries(REQUIRED_PHYSICAL_ASSETS.map((requirement) => [
    requirement.id,
    {
      ...requirement,
      byteSize: 1,
      sha256: "a".repeat(64),
      provenance: { source: "test", license: "LicenseRef-Test" },
    } satisfies PhysicalAssetFile,
  ]));
  return { id, version: "1.0.0", root: `/assets/apk/${id}/v1`, files };
}

describe("production physical asset inventory", () => {
  it("freezes 75 exact mirrored files per audience pack", () => {
    expect(REQUIRED_PHYSICAL_ASSETS).toHaveLength(75);
    expect(new Set(REQUIRED_PHYSICAL_ASSETS.map((file) => file.id)).size).toBe(75);
    expect(new Set(REQUIRED_PHYSICAL_ASSETS.map((file) => file.path)).size).toBe(75);
    expect(REQUIRED_PHYSICAL_ASSETS.every((file) => file.format === "png" && file.alpha)).toBe(true);
    const chibi = createCompletePack("chibi-quest");
    expect(() => validateCompleteAssetPack(chibi)).not.toThrow();
    expect(() => validateCompleteAssetPack(createCompletePack("riven-lands"))).not.toThrow();
    expect(() => validateEdition({
      id: "primary-chibi",
      title: "Primary Chibi",
      runtimeApiVersion: "1.0.0",
      pack: chibi,
      bindings: {},
      tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 0.5 },
    }, [], "1.0.0")).not.toThrow();
  });

  it("defines every sheet family with an exact executable grid", () => {
    const byId = Object.fromEntries(REQUIRED_PHYSICAL_ASSETS.map((file) => [file.id, file]));
    expect(byId["characters/knight_top"]?.grid).toEqual(TOP_DOWN_CHARACTER_GRID);
    expect(byId["characters/knight_side"]?.grid).toEqual(SIDE_SCROLL_CHARACTER_GRID);
    expect(byId["tiles/dungeon_walls"]?.grid).toEqual(WANG_TILE_GRID);
    expect(byId["tiles/iso_meadow"]?.grid).toEqual(ISOMETRIC_WANG_TILE_GRID);
    expect(byId["props/chest"]?.grid).toEqual(FOUR_FRAME_PROP_GRID);
    expect(byId["props/door"]?.grid).toEqual(DOOR_PROP_GRID);
    expect(byId["vfx/slash"]?.grid).toEqual(FOUR_FRAME_VFX_GRID);
    expect(byId["props/spikes"]?.animations?.trigger?.yoyo).toBe(true);
  });

  it("covers every required roster and presentation family", () => {
    const ids = REQUIRED_PHYSICAL_ASSETS.map((file) => file.id);
    for (const prefix of [
      "characters/", "enemies/", "npcs/", "tiles/", "props/",
      "items/", "vfx/", "ui/", "backgrounds/",
    ]) {
      expect(ids.some((id) => id.startsWith(prefix))).toBe(true);
    }
    expect(ids).toContain("enemies/boss_dragon");
    expect(ids).toContain("enemies/boss_dragon_portrait");
    expect(ids).toContain("ui/dialog_frame");
    expect(ids).toContain("backgrounds/dungeon_parallax_mid");
  });

  it("rejects missing, extra, structurally wrong, and unknown packs", () => {
    const missing = createCompletePack();
    delete (missing.files as Record<string, PhysicalAssetFile>)["items/key_gold"];
    expect(() => validateCompleteAssetPack(missing)).toThrow(/inventory mismatch/i);

    const extra = createCompletePack();
    (extra.files as Record<string, PhysicalAssetFile>)["items/forbidden"] = {
      ...extra.files["items/key_gold"]!,
      id: "items/forbidden",
      path: "items/forbidden.png",
    };
    expect(() => validateCompleteAssetPack(extra)).toThrow(/inventory mismatch/i);

    const wrong = createCompletePack();
    const knight = wrong.files["characters/knight_top"]!;
    (wrong.files as Record<string, PhysicalAssetFile>)[knight.id] = { ...knight, width: 384 };
    expect(() => validateCompleteAssetPack(wrong)).toThrow(/knight_top.*physical requirement/i);

    expect(() => validateCompleteAssetPack({ ...createCompletePack(), id: "unknown" })).toThrow(
      /unsupported production asset pack/i,
    );
  });
});
