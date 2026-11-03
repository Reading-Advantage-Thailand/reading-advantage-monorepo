import { describe, it, expect, vi } from "vitest";
import { createMockDb } from "./mock-db.js";
import { getMyGamification } from "../students/get-my-gamification.js";
import { getStudentGamificationProfile } from "../students/get-student-gamification-profile.js";

let gamificationMockDb = createMockDb();

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  return {
    ...actual,
    get db() {
      return gamificationMockDb;
    },
  };
});

const tenant = { schoolId: "school-1" };
const student = { id: "s1", role: "STUDENT" as const, schoolId: "school-1" };
const teacher = { id: "t1", role: "TEACHER" as const, schoolId: "school-1" };
const badges = [{ badgeType: "first_quiz", unlockedAt: new Date("2026-01-01T00:00:00Z") }];

describe("getMyGamification", () => {
  it("throws for a teacher", async () => {
    gamificationMockDb = createMockDb();
    await expect(getMyGamification({ user: teacher, tenant })).rejects.toThrow();
  });

  it("throws when the profile is missing", async () => {
    gamificationMockDb = createMockDb({ selectSequence: [[]] });
    await expect(getMyGamification({ user: student, tenant })).rejects.toThrow("Gamification profile not found");
  });

  it("returns level name, progress and badge totals", async () => {
    gamificationMockDb = createMockDb({ selectSequence: [[{ xp: 150, level: 2, streak: 4 }], badges, [{ value: 7 }]] });
    const res = await getMyGamification({ user: student, tenant });
    expect(res).toEqual({
      xp: 150, level: 2, levelName: "Curious Learner", streak: 4,
      xpProgress: { currentLevelXp: 50, nextLevelXp: 200, progressPercent: 25 },
      recentAchievements: badges, totalAchievements: 7,
    });
  });

  it("caps progress at 100 percent and reports the top level as complete", async () => {
    gamificationMockDb = createMockDb({ selectSequence: [[{ xp: 999, level: 1, streak: 0 }], [], [{ value: 0 }]] });
    expect((await getMyGamification({ user: student, tenant })).xpProgress).toEqual({ currentLevelXp: 999, nextLevelXp: 100, progressPercent: 100 });

    gamificationMockDb = createMockDb({ selectSequence: [[{ xp: 2000, level: 6, streak: 0 }], [], [{ value: 0 }]] });
    const top = await getMyGamification({ user: student, tenant });
    expect(top.levelName).toBe("Master Scientist");
    expect(top.xpProgress).toEqual({ currentLevelXp: 0, nextLevelXp: 0, progressPercent: 100 });
  });

  it("names an unknown level Explorer", async () => {
    gamificationMockDb = createMockDb({ selectSequence: [[{ xp: 5000, level: 9, streak: 0 }], [], [{ value: 0 }]] });
    expect((await getMyGamification({ user: student, tenant })).levelName).toBe("Explorer");
  });
});

describe("getStudentGamificationProfile", () => {
  it("lets a student read their own profile", async () => {
    gamificationMockDb = createMockDb({ selectSequence: [[{ xp: 300, level: 3, streak: 1, lastActiveAt: null }], badges] });
    const res = await getStudentGamificationProfile({ user: student, tenant, input: { studentId: "s1" } });
    expect(res).toEqual({
      xp: 300, level: 3, levelName: "Science Apprentice", streak: 1,
      xpProgress: { currentLevelXp: 0, nextLevelXp: 300, progressPercent: 0 },
      recentBadges: badges,
    });
    expect(gamificationMockDb.insert).not.toHaveBeenCalled();
  });

  it("throws when a student reads another student's profile", async () => {
    gamificationMockDb = createMockDb();
    await expect(getStudentGamificationProfile({ user: student, tenant, input: { studentId: "s2" } })).rejects.toThrow();
    expect(gamificationMockDb.select).not.toHaveBeenCalled();
  });

  it("creates a level-1 profile when a teacher reads a student without one", async () => {
    gamificationMockDb = createMockDb({
      selectSequence: [[], []],
      insertReturning: [{ xp: 0, level: 1, streak: 0, lastActiveAt: null }],
    });
    const res = await getStudentGamificationProfile({ user: teacher, tenant, input: { studentId: "s2" } });
    expect(res).toMatchObject({ xp: 0, level: 1, levelName: "Beginner Explorer", xpProgress: { progressPercent: 0 }, recentBadges: [] });
    expect(gamificationMockDb.insert.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "s2", schoolId: "school-1", xp: 0, level: 1, streak: 0 }),
    );
  });
});
