import { describe, expect, it } from "vitest";
import { AVATAR_BASE, AVATAR_PACK_VERSION, FORGE_COMMIT } from "../catalog.js";
import { catalogItem, portraitFiles, starterLoadout, starterSet, TINT_SLOTS } from "../loadout.js";
import { PORTRAIT_INDEX } from "../pack-index.js";
import { STARTER_SETS } from "../starters.js";

describe("starter loadouts", () => {
  it("records the pack provenance", () => {
    expect(FORGE_COMMIT).toMatch(/^[0-9a-f]{7,}$/);
    expect(AVATAR_PACK_VERSION).toBe("1.0.0");
  });

  it("builds the knight in its own colors and lists its layer files in draw order", () => {
    const files = portraitFiles(starterLoadout("knight"));
    expect(files.map((f) => f.layer)).toEqual(["base", "round-shield", "boots", "studded-leather", "gloves", "avatar-hair-short.capped@brown", "leather-cap", "adventurer-sword"]);
    for (const f of files) {
      expect(f.color).toMatch(/^portraits\/.+\.webp$/);
      expect(f.mask).toMatch(/^portraits\/.+\.mask\.webp$/);
    }
    // The knight keeps the default skin (R) and cloth (A) and takes blue eyes (B).
    expect(files[0]!.scales[0]).toEqual([1, 1, 1]);
    expect(files[0]!.scales[3]).toEqual([1, 1, 1]);
    expect(files[0]!.scales[2]).not.toEqual([1, 1, 1]);
  });

  it("applies the student's tints over the set's colors", () => {
    const files = portraitFiles(starterLoadout("knight", { hair: "teal", skin: "deep" }));
    expect(files.map((f) => f.layer)).toContain("avatar-hair-short.capped@teal");
    const skin = AVATAR_BASE.slots.skin!;
    expect(files[0]!.scales[0]![0]).toBeCloseTo(skin.options.deep![0] / skin.options.fair![0], 6);
  });

  it("has a layer file for every layer of every class in every hair color", () => {
    for (const set of STARTER_SETS)
      for (const hair of Object.keys(AVATAR_BASE.slots.hair!.options)) expect(() => portraitFiles(starterLoadout(set.id, { hair })), `${set.id} ${hair}`).not.toThrow();
    expect(Object.keys(PORTRAIT_INDEX).length).toBeGreaterThan(100);
  });

  it("refuses an unknown class, an unknown tint, and an unknown piece", () => {
    expect(starterSet("fox")).toBeUndefined();
    expect(() => starterLoadout("fox")).toThrow("no starter set 'fox'");
    expect(() => starterLoadout("knight", { eyes: "red" })).toThrow("no option 'red' in color slot 'eyes'");
    expect(() => catalogItem("iron-helmet")).toThrow("no catalog item 'iron-helmet'");
    expect(TINT_SLOTS).toEqual(["skin", "hair", "eyes", "cloth"]);
  });
});
