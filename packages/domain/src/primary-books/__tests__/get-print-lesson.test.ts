import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "../../__tests__/mock-db.js";
import { getPrintLesson } from "../print/print-lesson.js";
import { getTeacherLesson } from "../lesson-support.js";
import { samplePrintFile } from "./fixtures.js";

const SCHOOL = "school-1";
const CLASS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOOK = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLASS_BOOK = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const user = (over: Partial<UserContext> = {}): UserContext => ({ id: "t1", username: "t1", name: "T", role: "TEACHER", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1", ...over });
const classRow = { id: CLASS, schoolId: SCHOOL, teacherId: "t1" };
const classBookRow = { id: CLASS_BOOK, classroomId: CLASS, schoolId: SCHOOL, bookId: BOOK, bookKey: "o3-2", bookName: "Origins 3.2", lessonCount: 14, mode: "teacher_led", startDate: null, currentLesson: 2 };
const lessonRow = (pkg: unknown) => ({ number: 1, title: "Hello! I Am May", key: "o3-2/1", articleId: "a1", approved: true, package: pkg });
const db = (selects: unknown[][]) => createMockDb({ selectSequence: selects }) as unknown as DB;
const params = (mock: DB, u: UserContext) => ({ db: mock, user: u, classBookId: CLASS_BOOK, number: 1 });

describe("getPrintLesson", () => {
  it("returns the title and the parsed print data", async () => {
    const result = await getPrintLesson(params(db([[classBookRow], [classRow], [lessonRow({ printLesson: samplePrintFile() })]]), user()));
    expect(result?.title).toBe("Hello! I Am May");
    expect(result?.printLesson.packageKey).toBe("o3-2/1");
  });

  it("returns null when the lesson has no print data", async () => {
    expect(await getPrintLesson(params(db([[classBookRow], [classRow], [lessonRow({})]]), user()))).toBeNull();
    expect(await getPrintLesson(params(db([[classBookRow], [classRow], [lessonRow(null)]]), user()))).toBeNull();
  });

  it("returns null when the stored print data is not valid", async () => {
    expect(await getPrintLesson(params(db([[classBookRow], [classRow], [lessonRow({ printLesson: { bad: true } })]]), user()))).toBeNull();
  });

  it("refuses a student", async () => {
    await expect(getPrintLesson(params(db([[classBookRow], [classRow]]), user({ id: "s1", role: "STUDENT" })))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a teacher of another class", async () => {
    await expect(getPrintLesson(params(db([[classBookRow], [{ ...classRow, teacherId: "t2" }], []]), user()))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a user of another school", async () => {
    await expect(getPrintLesson(params(db([[classBookRow], [classRow]]), user({ schoolId: "school-2" })))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses an unknown class book", async () => {
    await expect(getPrintLesson(params(db([[]]), user()))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("sets hasPrint on the teacher lesson", async () => {
    const withPrint = await getTeacherLesson({ ...params(db([[classBookRow], [classRow], [lessonRow({ printLesson: samplePrintFile() })], [], [{ title: "T", passage: "P." }]]), user()) });
    const without = await getTeacherLesson({ ...params(db([[classBookRow], [classRow], [lessonRow({})], [], [{ title: "T", passage: "P." }]]), user()) });
    expect([withPrint.hasPrint, without.hasPrint]).toEqual([true, false]);
  });
});
