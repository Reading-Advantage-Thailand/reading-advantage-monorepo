import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "../../__tests__/mock-db.js";
import { restartLesson } from "../attempts.js";
import { restartLessonInput, restartLessonOutput } from "../contracts.js";

const SCHOOL = "school-1";
const ARTICLE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const ASSIGNMENT = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const NOW = new Date("2026-10-12T08:00:00Z");
const student: UserContext = { id: "s1", username: "s1", name: "S", role: "STUDENT", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const teacher: UserContext = { ...student, id: "t1", role: "TEACHER" };
const activities = [{ id: "act1", activityType: "MC_QUESTION", targetId: ARTICLE, xpEarned: 0, timer: 30, details: {}, completed: true, createdAt: NOW, updatedAt: NOW }];
const progress = [{ id: "lp1", progress: 100, timeSpent: 600, isCompleted: true, completedAt: NOW, createdAt: NOW }];
const dbWith = (selects: unknown[][]) => createMockDb({ selectSequence: selects });
const inserted = (mock: ReturnType<typeof createMockDb>) => mock.insert.mock.results[0].value.values.mock.calls[0][0] as Record<string, unknown>;

describe("restart contract", () => {
  it("accepts an article id with an optional assignment id and rejects a bad id", () => {
    expect(restartLessonInput.parse({ articleId: ARTICLE })).toEqual({ articleId: ARTICLE });
    expect(restartLessonInput.parse({ articleId: ARTICLE, assignmentId: ASSIGNMENT }).assignmentId).toBe(ASSIGNMENT);
    expect(() => restartLessonInput.parse({ articleId: "x" })).toThrow();
    expect(restartLessonOutput.parse({ closed: true, attemptNumber: 2 })).toEqual({ closed: true, attemptNumber: 2 });
  });
});

describe("restartLesson", () => {
  it("closes the attempt with the reason student_restart and returns the new attempt number", async () => {
    const mock = dbWith([[{ schoolId: SCHOOL }], activities, [{ xpEarned: 20 }], progress, [], [{ max: 1 }]]);
    const out = await restartLesson({ db: mock as unknown as DB, user: student, now: NOW, input: { articleId: ARTICLE } });
    expect(out).toEqual({ closed: true, attemptNumber: 3 });
    expect(inserted(mock)).toMatchObject({ studentId: "s1", attemptNumber: 2, closeReason: "student_restart", closedByUserId: "s1" });
  });

  it("sets an assignment lesson back to in progress and keeps the completion in the history", async () => {
    const completedAt = new Date("2026-10-10T08:00:00Z");
    const mock = dbWith([[{ schoolId: SCHOOL }], activities, [{ xpEarned: 20 }], progress, [], [], [{ id: "sa1", completedAt, score: 88 }]]);
    await restartLesson({ db: mock as unknown as DB, user: student, now: NOW, input: { articleId: ARTICLE, assignmentId: ASSIGNMENT } });
    expect(inserted(mock)).toMatchObject({ assignmentId: ASSIGNMENT, completedAt, score: 88 });
    const sets = mock.update.mock.results[0].value.set.mock.calls.map((c: unknown[]) => c[0] as Record<string, unknown>);
    expect(sets.at(-1)).toMatchObject({ status: "IN_PROGRESS", completed: false, completedAt: null, score: null });
  });

  it("writes nothing and returns closed false when the student has no work", async () => {
    const mock = dbWith([[{ schoolId: SCHOOL }], [], [], [], []]);
    const out = await restartLesson({ db: mock as unknown as DB, user: student, now: NOW, input: { articleId: ARTICLE } });
    expect(out).toEqual({ closed: false, attemptNumber: null });
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("refuses a teacher with FORBIDDEN and touches no row", async () => {
    const mock = dbWith([[{ schoolId: SCHOOL }]]);
    await expect(restartLesson({ db: mock as unknown as DB, user: teacher, input: { articleId: ARTICLE } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mock.insert).not.toHaveBeenCalled();
    expect(mock.update).not.toHaveBeenCalled();
  });
});
