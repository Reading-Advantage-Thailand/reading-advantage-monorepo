import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "../../__tests__/mock-db.js";
import { listLessonAttempts } from "../attempts.js";

const SCHOOL = "school-1";
const ARTICLE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const NOW = new Date("2026-10-12T08:00:00Z");
const student: UserContext = { id: "s1", username: "s1", name: "S", role: "STUDENT", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const teacher: UserContext = { ...student, id: "t1", role: "TEACHER" };
const row = { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", studentId: "s1", articleId: ARTICLE, assignmentId: null, classBookId: null, lessonNumber: null, attemptNumber: 1, startedAt: null, closedAt: NOW, closeReason: "student_restart", progress: 100, timeSpent: 60, completed: true, completedAt: NOW, score: null, xpEarned: 50 };

describe("listLessonAttempts", () => {
  it("lets a student read own attempts", async () => {
    const mock = createMockDb({ selectResults: [row] });
    const out = await listLessonAttempts({ db: mock as unknown as DB, user: student, studentId: "s1", articleId: ARTICLE });
    expect(out).toEqual([row]);
  });

  it("refuses a student who reads the attempts of another student", async () => {
    const mock = createMockDb({ selectResults: [row] });
    await expect(listLessonAttempts({ db: mock as unknown as DB, user: student, studentId: "s2" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mock.select).not.toHaveBeenCalled();
  });

  it("lets a teacher read the attempts of a student of the same school", async () => {
    const mock = createMockDb({ selectResults: [row] });
    expect(await listLessonAttempts({ db: mock as unknown as DB, user: teacher, studentId: "s1" })).toHaveLength(1);
  });

  it("refuses a user with no school", async () => {
    const mock = createMockDb({ selectResults: [row] });
    await expect(listLessonAttempts({ db: mock as unknown as DB, user: { ...teacher, schoolId: null }, studentId: "s1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
