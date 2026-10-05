// Ported from advantage-forge tests/apk3d/avatar-starters.test.ts (commit 3294ae5): the catalog
// rows come from the pack catalog in `catalog.ts` instead of the Forge TSV.
import { describe, expect, it } from "vitest";
import { AVATAR_BASE, AVATAR_CATALOG } from "../catalog.js";
import { STARTER_SETS } from "../starters.js";

describe("starter sets", () => {
  it("has 15 classes with tier 1 pieces, one per slot, the hair style first", () => {
    expect(STARTER_SETS).toHaveLength(15);
    expect(new Set(STARTER_SETS.map((s) => s.id)).size).toBe(15);
    for (const set of STARTER_SETS) {
      const pieces = set.pieces.map((id) => ({ id, row: AVATAR_CATALOG[id] }));
      for (const { id, row } of pieces) {
        expect(row, `${set.id}: ${id}`).toBeDefined();
        expect(row!.tier, `${set.id}: ${id}`).toBe(1);
      }
      expect(pieces[0]!.row!.slot, set.id).toBe("hair");
      const slots = pieces.map((p) => p.row!.slot);
      expect(new Set(slots).size, `${set.id}: one piece per slot`).toBe(slots.length);
      if (pieces.some((p) => p.row!.twoHanded)) expect(slots, `${set.id}: two hands`).not.toContain("offhand");
    }
  });

  it("uses color options of the avatar base", () => {
    for (const set of STARTER_SETS)
      for (const [slot, option] of Object.entries(set.tints)) expect(Object.keys(AVATAR_BASE.slots[slot]!.options), `${set.id}: ${slot}`).toContain(option);
  });
});
