import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { AVATAR_BASE, AVATAR_PACK_VERSION, STARTER_SETS } from "@reading-advantage/avatar-kit";
import { avatarClassIdSchema, avatarClothSchema, avatarEyesSchema, avatarHairSchema, avatarSkinSchema } from "@reading-advantage/game-contracts";
import { createMockDb } from "../../__tests__/mock-db.js";
import { getAvatarProfile, setAvatarProfile } from "../avatar.js";

const SCHOOL = "school-1";
const student: UserContext = { id: "s1", username: "s1", name: "S", role: "STUDENT", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const tints = { skin: "tan", hair: "teal", eyes: "green", cloth: "moss" } as const;
const now = new Date("2026-10-05T10:00:00.000Z");
const row = { schoolId: SCHOOL, userId: "s1", classPreset: "ranger", tints, catalogVersion: "1.0.0", createdAt: now, updatedAt: now };

describe("contract and kit agree", () => {
  it("names the same classes and color options", () => {
    expect([...avatarClassIdSchema.options].sort()).toEqual(STARTER_SETS.map((s) => s.id).sort());
    const options = (slot: string) => Object.keys(AVATAR_BASE.slots[slot]!.options).sort();
    expect([...avatarSkinSchema.options].sort()).toEqual(options("skin"));
    expect([...avatarHairSchema.options].sort()).toEqual(options("hair"));
    expect([...avatarEyesSchema.options].sort()).toEqual(options("eyes"));
    expect([...avatarClothSchema.options].sort()).toEqual(options("cloth"));
  });
});

describe("getAvatarProfile", () => {
  it("returns the user's own row as a profile", async () => {
    const mock = createMockDb({ selectResults: [row] });
    await expect(getAvatarProfile({ db: mock as unknown as DB, user: student })).resolves.toEqual({ classId: "ranger", tints, catalogVersion: "1.0.0", updatedAt: "2026-10-05T10:00:00.000Z" });
  });

  it("returns null when the user has no avatar", async () => {
    const mock = createMockDb({ selectResults: [] });
    await expect(getAvatarProfile({ db: mock as unknown as DB, user: student })).resolves.toBeNull();
  });

  it("refuses a user with no school", async () => {
    const mock = createMockDb();
    await expect(getAvatarProfile({ db: mock as unknown as DB, user: { ...student, schoolId: null } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mock.select).not.toHaveBeenCalled();
  });
});

describe("setAvatarProfile", () => {
  it("upserts the user's own row with the pack version and returns the profile", async () => {
    const mock = createMockDb({ insertReturning: [row] });
    const result = await setAvatarProfile({ db: mock as unknown as DB, user: student, now, input: { classId: "ranger", tints } });
    expect(result).toEqual({ classId: "ranger", tints, catalogVersion: "1.0.0", updatedAt: "2026-10-05T10:00:00.000Z" });
    const values = mock.insert.mock.results[0]!.value.values.mock.calls[0]![0];
    expect(values).toMatchObject({ schoolId: SCHOOL, userId: "s1", classPreset: "ranger", tints, catalogVersion: AVATAR_PACK_VERSION, updatedAt: now });
  });

  it("rejects an unknown class, an unknown option, and extra fields", async () => {
    const mock = createMockDb();
    const db = mock as unknown as DB;
    await expect(setAvatarProfile({ db, user: student, input: { classId: "fox", tints } as never })).rejects.toThrow();
    await expect(setAvatarProfile({ db, user: student, input: { classId: "ranger", tints: { ...tints, eyes: "red" } } as never })).rejects.toThrow();
    await expect(setAvatarProfile({ db, user: student, input: { classId: "ranger", tints, extra: true } as never })).rejects.toThrow();
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("refuses a user with no school", async () => {
    const mock = createMockDb();
    await expect(setAvatarProfile({ db: mock as unknown as DB, user: { ...student, schoolId: null }, input: { classId: "ranger", tints } })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
