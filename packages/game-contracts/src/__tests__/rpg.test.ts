import { describe, expect, it } from "vitest";

import {
  equipRpgCosmeticInputSchema,
  studentRpgStateSchema,
} from "../rpg.js";

const validState = {
  schemaVersion: 1,
  equippedEmblemId: "apprentice-wand",
  cosmetics: [
    { id: "apprentice-wand", slot: "profile-emblem", name: "Apprentice Wand", unlockedAt: "2026-09-09T00:00:00.000Z", equipped: true },
    { id: "graveyard-staff", slot: "profile-emblem", name: "Graveyard Staff", unlockedAt: null, equipped: false },
    { id: "echo-staff", slot: "profile-emblem", name: "Echo Staff", unlockedAt: null, equipped: false },
  ],
  quests: [
    { id: "first-ward", completed: true, completedAt: "2026-09-09T00:00:00.000Z", rewardId: "apprentice-wand" },
    { id: "complete-the-ward", completed: false, completedAt: null, rewardId: "graveyard-staff" },
    { id: "perfect-english-audio", completed: false, completedAt: null, rewardId: "echo-staff" },
  ],
} as const;

describe("RPG contracts", () => {
  it("accepts aligned quest, inventory, and equipped state", () => {
    expect(studentRpgStateSchema.parse(validState)).toEqual(validState);
  });

  it("rejects duplicate catalog entries and locked equipped cosmetics", () => {
    expect(studentRpgStateSchema.safeParse({
      ...validState,
      cosmetics: [validState.cosmetics[0], validState.cosmetics[0], validState.cosmetics[2]],
    }).success).toBe(false);
    expect(studentRpgStateSchema.safeParse({
      ...validState,
      equippedEmblemId: "graveyard-staff",
    }).success).toBe(false);
  });

  it("rejects client reward authority", () => {
    expect(equipRpgCosmeticInputSchema.safeParse({
      cosmeticId: "apprentice-wand",
      userId: "another-user",
      schoolId: "another-school",
      xp: 500,
      questId: "perfect-english-audio",
      unlocked: true,
    }).success).toBe(false);
  });
});
