import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "../../__tests__/mock-db.js";
import {
  assignClassBook,
  getClassBookPacing,
  getStudentBook,
  getStudentClassBooks,
  listCatalogueBooks,
  listClassBooks,
  markLessonTaught,
  markStepDone,
  setCurrentLesson,
} from "../class-books.js";

const SCHOOL = "school-1";
const CLASS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOOK = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLASS_BOOK = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const teacher: UserContext = { id: "t1", username: "t1", name: "T", role: "TEACHER", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const otherTeacher: UserContext = { ...teacher, id: "t2" };
const student: UserContext = { ...teacher, id: "s1", role: "STUDENT" };

const classRow = { id: CLASS, schoolId: SCHOOL, teacherId: "t1" };
const classBookRow = { id: CLASS_BOOK, classroomId: CLASS, schoolId: SCHOOL, bookId: BOOK, bookKey: "o3-2", bookName: "Origins 3.2", lessonCount: 14, mode: "teacher_led", startDate: null, currentLesson: 3 };
const lesson = (number: number) => ({ bookId: BOOK, number, title: `Lesson ${number}`, key: `o3-2/${number}`, articleId: `a${number}`, approved: true });

/**
 * A mock database whose select calls answer in order.
 * @param selects The rows of each select call.
 */
const dbWith = (selects: unknown[][]) => createMockDb({ selectSequence: selects, insertReturning: [{ id: CLASS_BOOK }] });

describe("assignClassBook", () => {
  it("inserts the class book for a class the teacher owns and returns it with the taught count", async () => {
    // managedClass, (list) managedClass, class books, taught lessons
    const mock = dbWith([[classRow], [classRow], [classBookRow], [{ classBookId: CLASS_BOOK, taughtAt: new Date() }, { classBookId: CLASS_BOOK, taughtAt: null }]]);
    const result = await assignClassBook({ db: mock as unknown as DB, user: teacher, input: { classroomId: CLASS, bookId: BOOK } });
    expect(result).toMatchObject({ id: CLASS_BOOK, bookKey: "o3-2", mode: "teacher_led", currentLesson: 3, taughtCount: 1 });
    expect(mock.insert).toHaveBeenCalledTimes(1);
  });

  it("rejects a teacher who does not teach the class", async () => {
    // classrooms, then the empty co-teacher check
    const mock = dbWith([[classRow], []]);
    await expect(assignClassBook({ db: mock as unknown as DB, user: otherTeacher, input: { classroomId: CLASS, bookId: BOOK } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("lets a co-teacher assign a book", async () => {
    const mock = dbWith([[classRow], [{ classroomId: CLASS }], [classRow], [{ classroomId: CLASS }], [classBookRow], []]);
    const result = await assignClassBook({ db: mock as unknown as DB, user: otherTeacher, input: { classroomId: CLASS, bookId: BOOK, mode: "independent" } });
    expect(result.taughtCount).toBe(0);
    expect(mock.insert).toHaveBeenCalledTimes(1);
  });

  it("rejects a class of another school", async () => {
    const mock = dbWith([[{ ...classRow, schoolId: "school-2" }]]);
    await expect(assignClassBook({ db: mock as unknown as DB, user: teacher, input: { classroomId: CLASS, bookId: BOOK } })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a student", async () => {
    const mock = dbWith([[classRow]]);
    await expect(assignClassBook({ db: mock as unknown as DB, user: student, input: { classroomId: CLASS, bookId: BOOK } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mock.select).not.toHaveBeenCalled();
  });
});

describe("listClassBooks", () => {
  it("returns the books of the class oldest first with taught counts", async () => {
    const second = { ...classBookRow, id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", bookKey: "q4", bookName: "Quest 4", currentLesson: 1 };
    const mock = dbWith([[classRow], [classBookRow, second], [{ classBookId: CLASS_BOOK, taughtAt: new Date() }, { classBookId: CLASS_BOOK, taughtAt: new Date() }]]);
    const result = await listClassBooks({ db: mock as unknown as DB, user: teacher, classroomId: CLASS });
    expect(result.map((book) => [book.bookKey, book.taughtCount])).toEqual([["o3-2", 2], ["q4", 0]]);
  });
});

describe("setCurrentLesson", () => {
  it("moves the pointer", async () => {
    const mock = dbWith([[classBookRow], [classRow]]);
    await setCurrentLesson({ db: mock as unknown as DB, user: teacher, input: { classBookId: CLASS_BOOK, lessonNumber: 5 } });
    expect(mock.update).toHaveBeenCalledTimes(1);
  });

  it("rejects a lesson past the book", async () => {
    const mock = dbWith([[classBookRow], [classRow]]);
    await expect(setCurrentLesson({ db: mock as unknown as DB, user: teacher, input: { classBookId: CLASS_BOOK, lessonNumber: 15 } })).rejects.toThrow(/past/);
    expect(mock.update).not.toHaveBeenCalled();
  });

  it("rejects an unknown class book", async () => {
    const mock = dbWith([[]]);
    await expect(setCurrentLesson({ db: mock as unknown as DB, user: teacher, input: { classBookId: CLASS_BOOK, lessonNumber: 2 } })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("markLessonTaught", () => {
  it("stores the taught time with all 13 steps and moves the pointer past the current lesson", async () => {
    const mock = dbWith([[classBookRow], [classRow]]);
    const now = new Date("2026-10-05T08:00:00Z");
    await markLessonTaught({ db: mock as unknown as DB, user: teacher, now, input: { classBookId: CLASS_BOOK, lessonNumber: 3 } });
    expect(mock.transaction).toHaveBeenCalledTimes(1);
    const values = mock.insert.mock.results[0].value.values.mock.calls[0][0];
    expect(values).toMatchObject({ classBookId: CLASS_BOOK, lessonNumber: 3, taughtAt: now, stepsDone: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] });
    expect(mock.update).toHaveBeenCalledTimes(1);
  });

  it("keeps the pointer when an earlier lesson is marked taught", async () => {
    const mock = dbWith([[classBookRow], [classRow]]);
    await markLessonTaught({ db: mock as unknown as DB, user: teacher, input: { classBookId: CLASS_BOOK, lessonNumber: 1, stepsDone: [1, 2] } });
    expect(mock.update).not.toHaveBeenCalled();
  });

  it("keeps the pointer on the last lesson", async () => {
    const mock = dbWith([[{ ...classBookRow, currentLesson: 14 }], [classRow]]);
    await markLessonTaught({ db: mock as unknown as DB, user: teacher, input: { classBookId: CLASS_BOOK, lessonNumber: 14 } });
    expect(mock.update).not.toHaveBeenCalled();
  });
});

describe("markStepDone", () => {
  it("adds a step to the steps done and returns the sorted list", async () => {
    const mock = dbWith([[classBookRow], [classRow], [{ stepsDone: [1, 3] }]]);
    const result = await markStepDone({ db: mock as unknown as DB, user: teacher, input: { classBookId: CLASS_BOOK, lessonNumber: 3, step: 2 } });
    expect(result).toEqual([1, 2, 3]);
  });

  it("removes a step when done is false", async () => {
    const mock = dbWith([[classBookRow], [classRow], [{ stepsDone: [1, 2, 3] }]]);
    const result = await markStepDone({ db: mock as unknown as DB, user: teacher, input: { classBookId: CLASS_BOOK, lessonNumber: 3, step: 2, done: false } });
    expect(result).toEqual([1, 3]);
  });

  it("starts from no steps when the lesson has no state row", async () => {
    const mock = dbWith([[classBookRow], [classRow], []]);
    expect(await markStepDone({ db: mock as unknown as DB, user: teacher, input: { classBookId: CLASS_BOOK, lessonNumber: 3, step: 1 } })).toEqual([1]);
  });
});

describe("getClassBookPacing", () => {
  it("lists every lesson with its state and names the next step and its period", async () => {
    const taughtAt = new Date("2026-10-01T08:00:00Z");
    const mock = dbWith([
      [classBookRow],
      [classRow],
      [lesson(1), lesson(2), lesson(3), { ...lesson(4), approved: false, articleId: null }],
      [{ lessonNumber: 1, taughtAt, stepsDone: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] }, { lessonNumber: 3, taughtAt: null, stepsDone: [3, 1, 2, 4, 5, 6] }],
    ]);
    const result = await getClassBookPacing({ db: mock as unknown as DB, user: teacher, classBookId: CLASS_BOOK });
    expect(result.classBook).toMatchObject({ id: CLASS_BOOK, currentLesson: 3, taughtCount: 1 });
    expect(result.lessons.map((row) => [row.number, row.current, row.taughtAt, row.stepsDone.length])).toEqual([[1, false, taughtAt, 13], [2, false, null, 0], [3, true, null, 6], [4, false, null, 0]]);
    // steps 1-6 done; step 7 is in period 2
    expect(result.nextStep).toBe(7);
    expect(result.plannedPeriod).toBe(2);
  });

  it("reports no next step when all 13 steps of the current lesson are done", async () => {
    const mock = dbWith([[classBookRow], [classRow], [lesson(3)], [{ lessonNumber: 3, taughtAt: null, stepsDone: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] }]]);
    const result = await getClassBookPacing({ db: mock as unknown as DB, user: teacher, classBookId: CLASS_BOOK });
    expect(result.nextStep).toBeNull();
    expect(result.plannedPeriod).toBeNull();
  });
});

describe("getStudentClassBooks", () => {
  it("returns the current lesson of each class book with the unlocked app steps", async () => {
    // memberships, class books, current lessons, state rows
    const mock = dbWith([[{ classroomId: CLASS }], [classBookRow], [lesson(3)], [{ classBookId: CLASS_BOOK, lessonNumber: 3, stepsDone: [1, 2, 3, 4, 5, 6, 7, 8, 9] }]]);
    const result = await getStudentClassBooks({ db: mock as unknown as DB, user: student });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ classBookId: CLASS_BOOK, bookKey: "o3-2", currentLesson: 3, lessonCount: 14 });
    // workbook steps 1-9 done: app steps 1-10 open (step 9 maps to app 9 and 10)
    expect(result[0].lesson).toMatchObject({ number: 3, title: "Lesson 3", articleId: "a3", unlockedAppSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
  });

  it("unlocks every app step in independent mode", async () => {
    const mock = dbWith([[{ classroomId: CLASS }], [{ ...classBookRow, mode: "independent" }], [lesson(3)], []]);
    const result = await getStudentClassBooks({ db: mock as unknown as DB, user: student });
    expect(result[0].lesson?.unlockedAppSteps).toHaveLength(14);
  });

  it("hides the article of a lesson that is not approved", async () => {
    const mock = dbWith([[{ classroomId: CLASS }], [classBookRow], [{ ...lesson(3), approved: false }], []]);
    const result = await getStudentClassBooks({ db: mock as unknown as DB, user: student });
    expect(result[0].lesson).toMatchObject({ articleId: null, unlockedAppSteps: [] });
  });

  it("returns nothing for a student in no class", async () => {
    const mock = dbWith([[]]);
    expect(await getStudentClassBooks({ db: mock as unknown as DB, user: student })).toEqual([]);
  });
});

describe("listCatalogueBooks", () => {
  it("returns the catalogue rows for a teacher", async () => {
    const rows = [{ id: BOOK, key: "o3-2", name: "Primary Advantage Origins 3.2", seriesName: "Primary Advantage Origins", lessonCount: 14 }];
    const mock = dbWith([rows]);
    expect(await listCatalogueBooks({ db: mock as unknown as DB, user: teacher })).toEqual(rows);
  });
});

describe("getStudentBook", () => {
  it("returns every lesson with the article of published lessons, the current marker, and taught", async () => {
    // memberships, class books, current lesson, state rows; then lessons, state rows
    const mock = dbWith([
      [{ classroomId: CLASS }],
      [classBookRow],
      [lesson(3)],
      [],
      [lesson(1), lesson(2), lesson(3), { ...lesson(4), approved: false }],
      [{ lessonNumber: 1, taughtAt: new Date() }, { lessonNumber: 2, taughtAt: null }],
    ]);
    const result = await getStudentBook({ db: mock as unknown as DB, user: student, classBookId: CLASS_BOOK });
    expect(result.classBookId).toBe(CLASS_BOOK);
    expect(result.lessons.map((row) => [row.number, row.articleId, row.current, row.taught])).toEqual([
      [1, "a1", false, true],
      [2, "a2", false, false],
      [3, "a3", true, false],
      [4, null, false, false],
    ]);
  });

  it("rejects a class book outside the student's classes", async () => {
    const mock = dbWith([[{ classroomId: CLASS }], [classBookRow], [lesson(3)], []]);
    await expect(getStudentBook({ db: mock as unknown as DB, user: student, classBookId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
