import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "../../__tests__/mock-db.js";
import { closeAttemptInTx, closeLessonAttempt } from "../attempts.js";

const SCHOOL = "school-1";
const ARTICLE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CLASS_BOOK = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const NOW = new Date("2026-10-12T08:00:00Z");
const student: UserContext = { id: "s1", username: "s1", name: "S", role: "STUDENT", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const teacher: UserContext = { ...student, id: "t1", role: "TEACHER" };

const activities = [
  { id: "act1", activityType: "MC_QUESTION", targetId: ARTICLE, xpEarned: 0, timer: 30, details: {}, completed: true, createdAt: NOW, updatedAt: NOW },
  { id: "act2", activityType: "SA_QUESTION", targetId: ARTICLE, xpEarned: 0, timer: 40, details: {}, completed: true, createdAt: NOW, updatedAt: NOW },
];
const xp = [{ xpEarned: 20 }, { xpEarned: 30 }];
const progress = [{ id: "lp1", progress: 100, timeSpent: 600, isCompleted: true, completedAt: NOW, createdAt: NOW }];
const steps = [{ id: "st1", classBookId: CLASS_BOOK, lessonNumber: 2, appStep: 1, status: "done", startedAt: NOW, doneAt: NOW, seconds: 60 }];

/** The select order of the function: school, activities, xp logs, progress, steps, attempts, assignment. */
const dbWith = (selects: unknown[][]) => createMockDb({ selectSequence: selects });
const inserted = (mock: ReturnType<typeof createMockDb>) => mock.insert.mock.results[0].value.values.mock.calls[0][0] as Record<string, unknown>;

describe("closeLessonAttempt", () => {
  it("writes one history row with attempt number 1, the moved rows, and the XP sum", async () => {
    const mock = dbWith([[{ schoolId: SCHOOL }], activities, xp, progress, steps, []]);
    const out = await closeLessonAttempt({ db: mock as unknown as DB, user: student, now: NOW, input: { studentId: "s1", articleId: ARTICLE, reason: "student_restart" } });
    expect(out).toEqual({ closed: true, attemptNumber: 1 });
    expect(mock.insert).toHaveBeenCalledTimes(1);
    expect(inserted(mock)).toMatchObject({ schoolId: SCHOOL, studentId: "s1", articleId: ARTICLE, attemptNumber: 1, closeReason: "student_restart", closedByUserId: "s1", xpEarned: 50, progress: 100, timeSpent: 600, completed: true, closedAt: NOW });
    expect((inserted(mock).activities as { id: string }[]).map((a) => a.id)).toEqual(["act1", "act2"]);
    expect((inserted(mock).steps as { id: string }[]).map((a) => a.id)).toEqual(["st1"]);
  });

  it("numbers the next attempt after the closed ones", async () => {
    const mock = dbWith([[{ schoolId: SCHOOL }], activities, xp, progress, steps, [{ max: 2 }]]);
    const out = await closeLessonAttempt({ db: mock as unknown as DB, user: student, now: NOW, input: { studentId: "s1", articleId: ARTICLE, reason: "student_restart" } });
    expect(out.attemptNumber).toBe(3);
  });

  it("deletes the activity and step rows, clears the flags, and resets the progress", async () => {
    const mock = dbWith([[{ schoolId: SCHOOL }], activities, xp, progress, steps, []]);
    await closeLessonAttempt({ db: mock as unknown as DB, user: student, now: NOW, input: { studentId: "s1", articleId: ARTICLE, reason: "student_restart" } });
    expect(mock.delete).toHaveBeenCalledTimes(2);
    const sets = mock.update.mock.results[0].value.set.mock.calls.map((c: unknown[]) => c[0] as Record<string, unknown>);
    expect(sets).toHaveLength(2);
    expect(sets[0]).toMatchObject({ isMultipleChoiceQuestionCompleted: false, isShortAnswerQuestionCompleted: false, isLongAnswerQuestionCompleted: false, isSentenceMatchingCompleted: false, isSentenceOrderingCompleted: false, isSentenceWordOrderingCompleted: false, isSentenceClozeTestCompleted: false });
    expect(sets[0]).not.toHaveProperty("isRead");
    expect(sets[0]).not.toHaveProperty("isRated");
    expect(sets[0]).not.toHaveProperty("isSentenceAndWordsSaved");
    expect(sets[1]).toMatchObject({ progress: 0, status: "not_started", isCompleted: false, completedAt: null, timeSpent: 0 });
  });

  it("leaves the XP rows and the user XP alone", async () => {
    const mock = dbWith([[{ schoolId: SCHOOL }], activities, xp, progress, steps, []]);
    await closeLessonAttempt({ db: mock as unknown as DB, user: student, now: NOW, input: { studentId: "s1", articleId: ARTICLE, reason: "student_restart" } });
    const touched = [...mock.update.mock.results, ...mock.delete.mock.results].length;
    expect(touched).toBe(4); // 2 deletes + 2 updates: no xp_logs or users write
    expect(mock.insert).toHaveBeenCalledTimes(1);
  });

  it("closes nothing when the student has no work on the lesson", async () => {
    const mock = dbWith([[{ schoolId: SCHOOL }], [], [{ id: "lp1", progress: 0, timeSpent: 0, isCompleted: false, completedAt: null, createdAt: NOW }], [], []]);
    const out = await closeLessonAttempt({ db: mock as unknown as DB, user: student, now: NOW, input: { studentId: "s1", articleId: ARTICLE, reason: "student_restart" } });
    expect(out).toEqual({ closed: false, attemptNumber: null });
    expect(mock.insert).not.toHaveBeenCalled();
    expect(mock.delete).not.toHaveBeenCalled();
  });

  it("writes nothing and throws when the transaction fails", async () => {
    const mock = dbWith([[{ schoolId: SCHOOL }], activities, xp, progress, steps, []]);
    mock.insert.mockImplementation(() => { throw new Error("db down"); });
    await expect(closeLessonAttempt({ db: mock as unknown as DB, user: student, now: NOW, input: { studentId: "s1", articleId: ARTICLE, reason: "student_restart" } })).rejects.toThrow("db down");
    expect(mock.transaction).toHaveBeenCalledTimes(1);
    expect(mock.delete).not.toHaveBeenCalled();
    expect(mock.update).not.toHaveBeenCalled();
  });

  it("moves the assignment completion into the history and sets the assignment back to in progress", async () => {
    const completedAt = new Date("2026-10-10T08:00:00Z");
    const assignment = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const mock = dbWith([[{ schoolId: SCHOOL }], activities, xp, progress, steps, [], [{ id: "sa1", completedAt, score: 88 }]]);
    await closeLessonAttempt({ db: mock as unknown as DB, user: student, now: NOW, input: { studentId: "s1", articleId: ARTICLE, assignmentId: assignment, reason: "student_restart" } });
    expect(inserted(mock)).toMatchObject({ assignmentId: assignment, completedAt, score: 88 });
    const sets = mock.update.mock.results[0].value.set.mock.calls.map((c: unknown[]) => c[0] as Record<string, unknown>);
    expect(sets.at(-1)).toMatchObject({ status: "IN_PROGRESS", completed: false, completedAt: null, score: null });
  });

  it("refuses a teacher and a student who closes the work of another student", async () => {
    const mock = dbWith([[{ schoolId: SCHOOL }]]);
    await expect(closeLessonAttempt({ db: mock as unknown as DB, user: teacher, input: { studentId: "s1", articleId: ARTICLE, reason: "student_restart" } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(closeLessonAttempt({ db: mock as unknown as DB, user: student, input: { studentId: "s2", articleId: ARTICLE, reason: "student_restart" } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(closeLessonAttempt({ db: mock as unknown as DB, user: student, input: { studentId: "s1", articleId: ARTICLE, reason: "teacher_teach_again" } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mock.insert).not.toHaveBeenCalled();
  });
});

describe("closeAttemptInTx", () => {
  it("throws FORBIDDEN and writes nothing when the student belongs to another school", async () => {
    const mock = dbWith([[{ schoolId: "school-2" }]]);
    await expect(closeAttemptInTx(mock as unknown as DB, { schoolId: SCHOOL, closedByUserId: "t1", now: NOW, input: { studentId: "s1", articleId: ARTICLE, classBookId: CLASS_BOOK, lessonNumber: 2, reason: "teacher_teach_again" } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mock.insert).not.toHaveBeenCalled();
    expect(mock.delete).not.toHaveBeenCalled();
  });

  it("closes the attempt of 30 students in one transaction", async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `s${i}`);
    const selects = ids.flatMap(() => [[{ schoolId: SCHOOL }], activities, xp, progress, steps, []]);
    const mock = dbWith(selects);
    const outs = await mock.transaction(async (tx) => {
      const results = [];
      for (const id of ids) results.push(await closeAttemptInTx(tx as unknown as DB, { schoolId: SCHOOL, closedByUserId: "t1", now: NOW, input: { studentId: id, articleId: ARTICLE, reason: "teacher_teach_again" } }));
      return results;
    });
    expect(outs.every((o) => o.closed && o.attemptNumber === 1)).toBe(true);
    expect(mock.transaction).toHaveBeenCalledTimes(1);
    expect(mock.insert).toHaveBeenCalledTimes(30);
  });
});
