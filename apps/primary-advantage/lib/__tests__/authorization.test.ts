// @vitest-environment node
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  USER_MANAGEMENT_ROLES,
  normalizeRole,
  isAdminOrSystem,
  canRunContentTooling,
  canReadUserResource,
  XP_AWARD_BY_ACTIVITY,
  resolveXpAward,
  isPlainBasename,
  patchUserBodySchema,
  amountPerGenreSchema,
  cleanupFileNameSchema,
} from "../authorization";
import { ActivityType, UserXpEarned } from "@/types/enum";

describe("authorization contracts", () => {
  it("normalizes session roles for comparison", () => {
    expect(normalizeRole("teacher")).toBe("TEACHER");
    expect(normalizeRole("SYSTEM")).toBe("SYSTEM");
    expect(normalizeRole(null)).toBe("");
  });

  it("admits only ADMIN or SYSTEM to user management", () => {
    expect(USER_MANAGEMENT_ROLES).toEqual(["ADMIN", "SYSTEM"]);
    expect(isAdminOrSystem({ role: "ADMIN" })).toBe(true);
    expect(isAdminOrSystem({ role: "system" })).toBe(true);
    expect(isAdminOrSystem({ role: "STUDENT" })).toBe(false);
    expect(isAdminOrSystem({ role: "TEACHER" })).toBe(false);
    expect(isAdminOrSystem(null)).toBe(false);
    expect(canRunContentTooling({ role: "STUDENT" })).toBe(false);
    expect(canRunContentTooling({ role: "ADMIN" })).toBe(true);
  });

  it("grants user reads to owners, SYSTEM, and same-school staff", () => {
    const target = { id: "student-1", schoolId: "school-a" };
    expect(
      canReadUserResource({ id: "student-1", role: "STUDENT" }, target),
    ).toBe(true);
    expect(
      canReadUserResource(
        { id: "sys-1", role: "SYSTEM", schoolId: "school-z" },
        target,
      ),
    ).toBe(true);
    expect(
      canReadUserResource(
        { id: "teacher-1", role: "TEACHER", schoolId: "school-a" },
        target,
      ),
    ).toBe(true);
    expect(
      canReadUserResource(
        { id: "teacher-2", role: "TEACHER", schoolId: "school-b" },
        target,
      ),
    ).toBe(false);
    expect(
      canReadUserResource(
        { id: "student-2", role: "STUDENT", schoolId: "school-a" },
        target,
      ),
    ).toBe(false);
  });

  it("awards the UserXpEarned value per activity type", () => {
    expect(resolveXpAward(ActivityType.VOCABULARY_FLASHCARDS)).toBe(
      UserXpEarned.VOCABULARY_FLASHCARDS,
    );
    expect(resolveXpAward(ActivityType.MC_QUESTION)).toBe(
      UserXpEarned.MCQuestion,
    );
    expect(resolveXpAward(ActivityType.SENTENCE_CLOZE_TEST)).toBe(
      UserXpEarned.SENTENCE_CLOZE_TEST,
    );
    for (const activityType of Object.values(ActivityType)) {
      expect(XP_AWARD_BY_ACTIVITY[activityType]).toBeGreaterThan(0);
    }
  });

  it("rejects non-basename file names", () => {
    expect(isPlainBasename("1720000000_upload.csv")).toBe(true);
    expect(isPlainBasename("../../secret")).toBe(false);
    expect(isPlainBasename("../secret")).toBe(false);
    expect(isPlainBasename("a/b.csv")).toBe(false);
    expect(isPlainBasename("..")).toBe(false);
    expect(
      cleanupFileNameSchema.safeParse("../../secret").success,
    ).toBe(false);
    expect(
      cleanupFileNameSchema.safeParse("1720000000_upload.csv").success,
    ).toBe(true);
  });

  it("validates the PATCH user body with Zod", () => {
    expect(
      patchUserBodySchema.safeParse({ name: "New Name" }).success,
    ).toBe(true);
    expect(patchUserBodySchema.safeParse({ xp: -5 }).success).toBe(false);
    expect(
      patchUserBodySchema.safeParse({ password: "short" }).success,
    ).toBe(false);
    expect(
      patchUserBodySchema.safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("bounds amountPerGenre with Zod", () => {
    expect(amountPerGenreSchema.safeParse(3).success).toBe(true);
    expect(amountPerGenreSchema.safeParse(0).success).toBe(false);
    expect(amountPerGenreSchema.safeParse(1000).success).toBe(false);
    expect(amountPerGenreSchema.safeParse("many").success).toBe(false);
    expect(z.number().safeParse(1000).success).toBe(true);
  });
});
