import { describe, it, expect, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import { getGamificationProfile, updateGamificationXp } from "../gamification/index.js";
import { createTenantDB } from "../db-contract.js";
import { createMockDb } from "./mock-db.js";

vi.mock("@reading-advantage/db/schema", () => ({
  gamificationProfiles: { userId: "userId", xp: "xp", level: "level", streak: "streak" },
  users: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val, type: "eq" })),
  and: vi.fn((...conds) => ({ type: "and", conds })),
}));

const mockStudent = { id: "s1", role: "STUDENT" as const, schoolId: "school-1" };
const mockTeacher = { id: "t1", role: "TEACHER" as const, schoolId: "school-1" };
const mockAdmin = { id: "a1", role: "ADMIN" as const, schoolId: "school-1" };
const mockTenant = { schoolId: "school-1" };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, mockTenant);
}

describe("getGamificationProfile", () => {
  it("returns own profile for student", async () => {
    const profile = { userId: "s1", xp: 500, level: 3, streak: 7 };
    const db = createMockDb({ selectResults: [profile] });

    const result = await getGamificationProfile({
      db: wrapDb(db),
      user: mockStudent,
      tenant: mockTenant,
      input: { userId: "s1" },
    });

    expect(result).toEqual(profile);
  });

  it("allows teacher to read any student's profile", async () => {
    const profile = { userId: "s2", xp: 100, level: 1, streak: 2 };
    const db = createMockDb({ selectResults: [profile] });

    const result = await getGamificationProfile({
      db: wrapDb(db),
      user: mockTeacher,
      tenant: mockTenant,
      input: { userId: "s2" },
    });

    expect(result).toEqual(profile);
  });

  it("throws when student tries to read another's profile", async () => {
    const db = createMockDb();

    await expect(
      getGamificationProfile({
        db: wrapDb(db),
        user: mockStudent,
        tenant: mockTenant,
        input: { userId: "other-student" },
      })
    ).rejects.toThrow(/gamification:read:all/);
  });

  it("returns null when profile does not exist", async () => {
    const db = createMockDb({ selectResults: [] });

    const result = await getGamificationProfile({
      db: wrapDb(db),
      user: mockStudent,
      tenant: mockTenant,
      input: { userId: "s1" },
    });

    expect(result).toBeNull();
  });
});

describe("updateGamificationXp", () => {
  it("updates XP and returns updated profile", async () => {
    const updated = { userId: "s1", xp: 600, level: 3, streak: 7 };
    const db = createMockDb({ updateReturning: [updated] });

    const result = await updateGamificationXp({
      db: wrapDb(db),
      user: mockAdmin,
      tenant: mockTenant,
      input: { userId: "s1", xp: 600 },
    });

    expect(result.xp).toBe(600);
  });

  it("throws when non-admin tries to update XP", async () => {
    const db = createMockDb();

    await expect(
      updateGamificationXp({
        db: wrapDb(db),
        user: mockStudent,
        tenant: mockTenant,
        input: { userId: "s1", xp: 9999 },
      })
    ).rejects.toThrow(/gamification:update/);
  });
});
