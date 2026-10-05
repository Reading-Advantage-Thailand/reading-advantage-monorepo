import { describe, expect, it } from "vitest";
import { avatarClassIdSchema, avatarLoadoutSchema, avatarProfileSchema, purchaseAvatarItemInputSchema, setAvatarProfileInputSchema, setLoadoutInputSchema, avatarSlotSchema } from "../avatar.js";

describe("avatar contracts", () => {
  it("lists the 15 hero classes", () => {
    expect(avatarClassIdSchema.options).toHaveLength(15);
  });

  it("accepts a class with an option per color slot and nothing else", () => {
    const tints = { skin: "tan", hair: "teal", eyes: "green", cloth: "moss" };
    expect(setAvatarProfileInputSchema.parse({ classId: "ranger", tints })).toEqual({ classId: "ranger", tints });
    expect(setAvatarProfileInputSchema.safeParse({ classId: "fox", tints }).success).toBe(false);
    expect(setAvatarProfileInputSchema.safeParse({ classId: "ranger", tints: { ...tints, eyes: "red" } }).success).toBe(false);
    expect(setAvatarProfileInputSchema.safeParse({ classId: "ranger", tints: { skin: "tan", hair: "teal", eyes: "green" } }).success).toBe(false);
    expect(setAvatarProfileInputSchema.safeParse({ classId: "ranger", tints, extra: 1 }).success).toBe(false);
  });

  it("requires a pack version and an update time on a profile", () => {
    const tints = { skin: "fair", hair: "brown", eyes: "blue", cloth: "sky" };
    expect(avatarProfileSchema.safeParse({ classId: "knight", tints, catalogVersion: "1.0.0", updatedAt: "2026-10-05T00:00:00.000Z" }).success).toBe(true);
    expect(avatarProfileSchema.safeParse({ classId: "knight", tints, catalogVersion: "v1", updatedAt: "2026-10-05T00:00:00.000Z" }).success).toBe(false);
  });

  it("names the ten pack slots and accepts a strict purchase and loadout input", () => {
    expect(avatarSlotSchema.options).toHaveLength(10);
    expect(purchaseAvatarItemInputSchema.parse({ itemId: "wizard-hat" })).toEqual({ itemId: "wizard-hat" });
    expect(purchaseAvatarItemInputSchema.safeParse({ itemId: "wizard-hat", price: 1 }).success).toBe(false);
    expect(setLoadoutInputSchema.parse({ slot: "head", itemId: null })).toEqual({ slot: "head", itemId: null });
    expect(setLoadoutInputSchema.safeParse({ slot: "ring", itemId: "x" }).success).toBe(false);
    expect(avatarLoadoutSchema.parse({ head: { itemId: "wizard-hat", dye: null } })).toEqual({ head: { itemId: "wizard-hat", dye: null } });
    expect(avatarLoadoutSchema.safeParse({ head: { itemId: "wizard-hat" } }).success).toBe(false);
  });
});
