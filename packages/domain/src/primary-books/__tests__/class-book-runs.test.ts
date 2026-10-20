import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "../../__tests__/mock-db.js";
import { teachLessonAgain } from "../class-book-runs.js";

const recordAuditEvent = vi.hoisted(() => vi.fn());
vi.mock("@reading-advantage/auth", async (orig) => ({
  ...(await orig<typeof import("@reading-advantage/auth")>()),
  recordAuditEvent,
}));

const SCHOOL = "school-1";
const CLASS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOOK = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLASS_BOOK = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ARTICLE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const NOW = new Date("2026-10-12T08:00:00Z");
const TAUGHT = new Date("2026-10-06T08:00:00Z");

const teacher: UserContext = { id: "t1", username: "t1", name: "T", role: "TEACHER", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const otherTeacher: UserContext = { ...teacher, id: "t2" };
const student: UserContext = { ...teacher, id: "s1", role: "STUDENT" };

const classRow = { id: CLASS, schoolId: SCHOOL, teacherId: "t1" };
const classBookRow = { id: CLASS_BOOK, classroomId: CLASS, schoolId: SCHOOL, bookId: BOOK, bookKey: "o3-2", bookName: "Origins 3.2", lessonCount: 14, mode: "teacher_led", startDate: null, currentLesson: 5 };
const taughtState = { taughtAt: TAUGHT, stepsDone: [1, 2, 3], runNumber: 1, earlierRuns: [] };

const act = { id: "act1", activityType: "MC_QUESTION", targetId: ARTICLE, xpEarned: 0, timer: 30, details: {}, completed: true, createdAt: NOW, updatedAt: NOW };
const progress = [{ id: "lp1", progress: 50, timeSpent: 60, isCompleted: false, completedAt: null, createdAt: NOW }];

/** Selects of one student close with work: school, activities, xp logs, progress, steps, attempts. */
const withWork = (id: string) => [[{ schoolId: SCHOOL }], [{ ...act, id: `act-${id}` }], [{ xpEarned: 10 }], progress, [], []];
/** Selects of one student close with no work: school, activities, progress, steps. */
const noWork = () => [[{ schoolId: SCHOOL }], [], [{ id: "lp1", progress: 0, timeSpent: 0, isCompleted: false, completedAt: null, createdAt: NOW }], []];

/**
 * Selects of a full call: class book, class, article, students, lesson state, then the student closes.
 * @param students The student ids.
 * @param closes The selects of each student close.
 * @param state The lesson state row.
 */
const studentSchools: Record<string, string | null> = {};
const sequence = (students: string[], closes: unknown[][][], state: unknown = taughtState) => [
  [classBookRow],
  [classRow],
  [{ articleId: ARTICLE }],
  students.map((studentId) => ({ studentId, schoolId: studentId in studentSchools ? studentSchools[studentId] : SCHOOL })),
  [state],
  ...closes.flat(),
];
const run = (mock: ReturnType<typeof createMockDb>, user: UserContext = teacher) =>
  teachLessonAgain({ db: mock as unknown as DB, user, now: NOW, input: { classBookId: CLASS_BOOK, lessonNumber: 3 } });
/** The `set` object of the lesson state upsert (the first insert). */
const stateSet = (mock: ReturnType<typeof createMockDb>) =>
  mock.insert.mock.results[0].value.values.mock.results[0].value.onConflictDoUpdate.mock.calls[0][0].set as Record<string, unknown>;

beforeEach(() => {
  recordAuditEvent.mockReset();
  for (const key of Object.keys(studentSchools)) delete studentSchools[key];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("teachLessonAgain", () => {
  it("moves the run into earlier runs, clears the state, and makes the lesson current", async () => {
    const mock = createMockDb({ selectSequence: sequence([], []) });
    const out = await run(mock);
    expect(out).toEqual({ runNumber: 2, closedAttempts: 0, skippedStudents: 0, auditFailed: false });
    expect(stateSet(mock)).toMatchObject({
      taughtAt: null,
      stepsDone: [],
      runNumber: 2,
      earlierRuns: [{ runNumber: 1, taughtAt: TAUGHT.toISOString(), stepsDone: [1, 2, 3], closedAt: NOW.toISOString(), closedByUserId: "t1" }],
    });
    const sets = mock.update.mock.results[0].value.set.mock.calls.map((c: unknown[]) => c[0]);
    expect(sets[0]).toMatchObject({ currentLesson: 3 });
  });

  it("keeps the earlier runs and appends the new one", async () => {
    const earlier = { runNumber: 1, taughtAt: null, stepsDone: [1], closedAt: "2026-10-08T00:00:00.000Z", closedByUserId: "t1" };
    const mock = createMockDb({ selectSequence: sequence([], [], { taughtAt: TAUGHT, stepsDone: [1, 2], runNumber: 2, earlierRuns: [earlier] }) });
    expect(await run(mock)).toMatchObject({ runNumber: 3 });
    expect((stateSet(mock).earlierRuns as { runNumber: number }[]).map((item) => item.runNumber)).toEqual([1, 2]);
  });

  it("does not add an empty run when the lesson has no taught time and no step", async () => {
    const mock = createMockDb({ selectSequence: sequence([], [], { taughtAt: null, stepsDone: [], runNumber: 2, earlierRuns: [{ runNumber: 1, taughtAt: null, stepsDone: [1], closedAt: "2026-10-08T00:00:00.000Z", closedByUserId: "t1" }] }) });
    expect(await run(mock)).toMatchObject({ runNumber: 2 });
    expect((stateSet(mock).earlierRuns as unknown[]).length).toBe(1);
  });

  it("closes the attempt of each student with work, and none for a student with no work", async () => {
    const mock = createMockDb({ selectSequence: sequence(["s1", "s2"], [withWork("s1"), noWork()]) });
    const out = await run(mock);
    expect(out).toMatchObject({ runNumber: 2, closedAttempts: 1 });
    const attempts = mock.insert.mock.results[0].value.values.mock.calls.slice(1).map((c: unknown[]) => c[0] as Record<string, unknown>);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({ studentId: "s1", articleId: ARTICLE, classBookId: CLASS_BOOK, lessonNumber: 3, closeReason: "teacher_teach_again", closedByUserId: "t1", schoolId: SCHOOL, attemptNumber: 1 });
  });

  it("closes 30 students in one transaction", async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `s${i}`);
    const mock = createMockDb({ selectSequence: sequence(ids, ids.map(withWork)) });
    const out = await run(mock);
    expect(out).toMatchObject({ runNumber: 2, closedAttempts: 30 });
    expect(mock.transaction).toHaveBeenCalledTimes(1);
    expect(mock.insert).toHaveBeenCalledTimes(31);
  });

  it("writes one audit event with counts only", async () => {
    const mock = createMockDb({ selectSequence: sequence(["s1"], [withWork("s1")]) });
    await run(mock);
    expect(recordAuditEvent).toHaveBeenCalledTimes(1);
    const [ctx, payload] = recordAuditEvent.mock.calls[0];
    expect(ctx).toMatchObject({ actorUserId: "t1", actorRole: "TEACHER" });
    expect(payload).toMatchObject({ action: "class_book:teach_again", targetType: "class_book", targetId: CLASS_BOOK, metadata: { lessonNumber: 3, runNumber: 2, studentCount: 1, closedAttempts: 1 } });
    expect(JSON.stringify(payload)).not.toContain("s1");
  });

  it("still succeeds when the audit write fails, and reports it to the caller", async () => {
    recordAuditEvent.mockImplementation(() => {
      throw new Error("down");
    });
    const mock = createMockDb({ selectSequence: sequence([], []) });
    await expect(run(mock)).resolves.toMatchObject({ runNumber: 2, auditFailed: true });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("gives FORBIDDEN for a teacher of another class and writes nothing", async () => {
    // class book, class, then the empty co-teacher check
    const mock = createMockDb({ selectSequence: [[classBookRow], [classRow], []] });
    await expect(run(mock, otherTeacher)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mock.insert).not.toHaveBeenCalled();
    expect(mock.transaction).not.toHaveBeenCalled();
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("gives FORBIDDEN for a class of another school", async () => {
    const mock = createMockDb({ selectSequence: [[classBookRow], [{ ...classRow, schoolId: "school-2" }]] });
    await expect(run(mock)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("gives FORBIDDEN for a student", async () => {
    const mock = createMockDb({ selectSequence: [[classBookRow], [classRow]] });
    await expect(run(mock, student)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("skips a roster student of another school or with no school and closes the rest (M-17)", async () => {
    studentSchools.s2 = "school-2";
    studentSchools.s3 = null;
    const mock = createMockDb({ selectSequence: sequence(["s1", "s2", "s3"], [withWork("s1")]) });
    const out = await run(mock);
    expect(out).toEqual({ runNumber: 2, closedAttempts: 1, skippedStudents: 2, auditFailed: false });
    expect(mock.insert).toHaveBeenCalledTimes(2);
    expect(recordAuditEvent.mock.calls[0][1].metadata).toMatchObject({ studentCount: 3, closedAttempts: 1, skippedStudents: 2 });
  });

  it("throws and writes no audit event when a student close fails", async () => {
    const mock = createMockDb({ selectSequence: sequence(["s1"], [[[{ schoolId: "school-2" }]]]) });
    await expect(run(mock)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("throws when the lesson number is past the book", async () => {
    const mock = createMockDb({ selectSequence: [[classBookRow], [classRow]] });
    await expect(teachLessonAgain({ db: mock as unknown as DB, user: teacher, input: { classBookId: CLASS_BOOK, lessonNumber: 15 } })).rejects.toThrow(/past/);
  });
});
