import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "./mock-db.js";
import { getPreviewBook, listManagedClassBooks } from "../primary-books/class-books.js";

const SCHOOL = "school-1";
const CLASS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOOK = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLASS_BOOK = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const teacher: UserContext = { id: "t1", username: "t1", name: "T", role: "TEACHER", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const otherTeacher: UserContext = { ...teacher, id: "t2" };
const student: UserContext = { ...teacher, id: "s1", role: "STUDENT" };
const admin: UserContext = { ...teacher, id: "a1", role: "ADMIN" };

const classRow = { id: CLASS, schoolId: SCHOOL, teacherId: "t1" };
const classBookRow = { id: CLASS_BOOK, classroomId: CLASS, schoolId: SCHOOL, bookId: BOOK, bookKey: "o3-2", bookName: "Origins 3.2", lessonCount: 3, mode: "teacher_led", startDate: null, currentLesson: 2 };
const lessons = [1, 2, 3].map((number) => ({ number, title: `Lesson ${number}`, key: `o3-2/${number}`, articleId: `a${number}`, approved: number !== 3 }));

const dbWith = (selects: unknown[][]) => createMockDb({ selectSequence: selects });

describe("getPreviewBook", () => {
  it("returns every lesson open with no progress for a teacher who manages the book", async () => {
    // class book, class, lessons
    const mock = dbWith([[classBookRow], [classRow], lessons]);
    const book = await getPreviewBook({ db: mock as unknown as DB, user: teacher, classBookId: CLASS_BOOK });
    expect(book).toMatchObject({ classBookId: CLASS_BOOK, bookName: "Origins 3.2", mode: "independent", currentLesson: 2 });
    expect(book.lessons.map((l) => l.taught)).toEqual([false, false, false]);
    expect(book.lessons.map((l) => l.articleId)).toEqual(["a1", "a2", null]);
    expect(book.lessons.map((l) => l.current)).toEqual([false, true, false]);
    expect(mock.insert).not.toHaveBeenCalled();
    expect(mock.update).not.toHaveBeenCalled();
  });

  it("gives FORBIDDEN to another teacher", async () => {
    const mock = dbWith([[classBookRow], [classRow], []]);
    await expect(getPreviewBook({ db: mock as unknown as DB, user: otherTeacher, classBookId: CLASS_BOOK })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("gives FORBIDDEN for a book of another school", async () => {
    const mock = dbWith([[classBookRow], [{ ...classRow, schoolId: "school-2" }]]);
    await expect(getPreviewBook({ db: mock as unknown as DB, user: teacher, classBookId: CLASS_BOOK })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("gives FORBIDDEN to a student and for an unknown book", async () => {
    await expect(getPreviewBook({ db: dbWith([[classBookRow], [classRow]]) as unknown as DB, user: student, classBookId: CLASS_BOOK })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getPreviewBook({ db: dbWith([[]]) as unknown as DB, user: teacher, classBookId: CLASS_BOOK })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("listManagedClassBooks", () => {
  it("lists the books of the classes a teacher owns or co-teaches", async () => {
    // co-taught ids, classes, books
    const mock = dbWith([[], [{ id: CLASS, name: "P3A" }], [classBookRow]]);
    const rows = await listManagedClassBooks({ db: mock as unknown as DB, user: teacher });
    expect(rows).toEqual([{ classBookId: CLASS_BOOK, classroomId: CLASS, classroomName: "P3A", bookName: "Origins 3.2", currentLesson: 2, lessonCount: 3 }]);
  });

  it("lists the books of every class of the school for an admin", async () => {
    const mock = dbWith([[{ id: CLASS, name: "P3A" }], [classBookRow]]);
    expect(await listManagedClassBooks({ db: mock as unknown as DB, user: admin })).toHaveLength(1);
  });

  it("returns none for a user without a school and refuses a student", async () => {
    const mock = dbWith([]);
    expect(await listManagedClassBooks({ db: mock as unknown as DB, user: { ...admin, role: "SYSTEM", schoolId: null } })).toEqual([]);
    expect(mock.select).not.toHaveBeenCalled();
    await expect(listManagedClassBooks({ db: dbWith([]) as unknown as DB, user: student })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns none when the classes have no book", async () => {
    expect(await listManagedClassBooks({ db: dbWith([[], [{ id: CLASS, name: "P3A" }], []]) as unknown as DB, user: teacher })).toEqual([]);
  });
});
