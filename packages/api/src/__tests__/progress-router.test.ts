import { describe, it, expect, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { progressRouter } from "../routers/progress.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";

vi.mock("@reading-advantage/domain/progress", () => ({
  recordActivity: vi.fn(),
  getStudentProgress: vi.fn(),
  getLessonProgress: vi.fn(),
  updateLessonProgress: vi.fn(),
}));

import {
  recordActivity,
  getStudentProgress,
  getLessonProgress,
  updateLessonProgress,
} from "@reading-advantage/domain/progress";

const t = initTRPC.context<{
  tenantDb: ReturnType<typeof createTenantDB>;
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } };
}>().create({
  transformer: superjson,
});

const appRouter = t.router({ progress: progressRouter });

function createCaller(
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } }
) {
  const tenantDb = createTenantDB({} as unknown as DB, auth.tenant);
  return t.createCallerFactory(appRouter)({ tenantDb, auth });
}

const testSchoolId = "550e8400-e29b-41d4-a716-446655440001";
const testDate = new Date("2024-01-01T00:00:00Z");

describe("progress router", () => {
  describe("recordActivity", () => {
    it("returns activity with safe fields", async () => {
      const activityRow = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        userId: "u1",
        activityType: "read",
        xpEarned: 10,
        metadata: null,
        createdAt: testDate,
        extraField: "should-be-stripped",
      };
      vi.mocked(recordActivity).mockResolvedValue(activityRow as unknown as Awaited<ReturnType<typeof recordActivity>>);
      const caller = createCaller({ user: { id: "u1", role: "STUDENT" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.progress.recordActivity({ activityType: "read", xpEarned: 10 });

      expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(result.activityType).toBe("read");
      expect(result).not.toHaveProperty("extraField");
    });
  });

  describe("getStudentProgress", () => {
    it("returns progress report with safe fields", async () => {
      const report = {
        studentId: "st1",
        activities: [],
        wordRecords: [],
        sentenceRecords: [],
        xpTotal: 100,
        storiesCompleted: 5,
      };
      vi.mocked(getStudentProgress).mockResolvedValue(report as unknown as Awaited<ReturnType<typeof getStudentProgress>>);
      const caller = createCaller({ user: { id: "t1", role: "TEACHER" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.progress.getStudentProgress({ studentId: "st1" });

      expect(result.studentId).toBe("st1");
      expect(result.xpTotal).toBe(100);
      expect(Array.isArray(result.activities)).toBe(true);
    });
  });

  describe("getLessonProgress", () => {
    it("returns lesson progress with branded lessonId", async () => {
      const progressRow = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        userId: "u1",
        lessonId: "lesson-1",
        status: "in_progress",
        progress: 50,
        completedAt: null,
        createdAt: testDate,
        updatedAt: testDate,
      };
      vi.mocked(getLessonProgress).mockResolvedValue(progressRow as unknown as Awaited<ReturnType<typeof getLessonProgress>>);
      const caller = createCaller({ user: { id: "u1", role: "STUDENT" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.progress.getLessonProgress({ lessonId: "lesson-1" });

      expect(result).not.toBeNull();
      expect(result!.lessonId).toBe("lesson-1");
      expect(result!.progress).toBe(50);
    });
  });

  describe("updateLessonProgress", () => {
    it("returns updated lesson progress", async () => {
      const progressRow = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        userId: "u1",
        lessonId: "lesson-1",
        status: "completed",
        progress: 100,
        completedAt: testDate,
        createdAt: testDate,
        updatedAt: testDate,
      };
      vi.mocked(updateLessonProgress).mockResolvedValue(progressRow as unknown as Awaited<ReturnType<typeof updateLessonProgress>>);
      const caller = createCaller({ user: { id: "u1", role: "STUDENT" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.progress.updateLessonProgress({ lessonId: "lesson-1", status: "completed", progress: 100 });

      expect(result.lessonId).toBe("lesson-1");
      expect(result.progress).toBe(100);
    });
  });
});
