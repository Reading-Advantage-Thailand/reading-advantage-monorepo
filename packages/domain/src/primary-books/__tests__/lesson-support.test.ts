import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "../../__tests__/mock-db.js";
import { findTeacherClassBook, getLessonGuide, getTeacherLesson, guideLocaleOf, resolveBookLesson } from "../lesson-support.js";

const SCHOOL = "school-1";
const CLASS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOOK = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLASS_BOOK = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const teacher: UserContext = { id: "t1", username: "t1", name: "T", role: "TEACHER", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const classRow = { id: CLASS, schoolId: SCHOOL, teacherId: "t1" };
const classBookRow = { id: CLASS_BOOK, classroomId: CLASS, schoolId: SCHOOL, bookId: BOOK, bookKey: "o3-2", bookName: "Origins 3.2", lessonCount: 14, mode: "teacher_led", startDate: null, currentLesson: 2 };
const dbWith = (selects: unknown[][]) => createMockDb({ selectSequence: selects });

const guide = (step: number, locale: string, period: number, title: string) => ({
  step,
  locale,
  title,
  period,
  teacherActions: [`${locale} act ${step}`],
  teacherLanguage: [],
  studentActions: [],
  watchFor: [`watch ${step}`],
  scriptMd: locale === "en" ? `# Step ${step}` : null,
});

describe("getLessonGuide", () => {
  it("groups the steps by period in English", async () => {
    const mock = dbWith([[guide(1, "en", 1, "Before You Read"), guide(5, "en", 2, "Deep Reading Notes"), guide(13, "en", 4, "Lesson Reflection")]]);
    const result = await getLessonGuide({ db: mock as unknown as DB, locale: "en" });
    expect(result.map((group) => [group.period, group.steps.map((step) => step.step)])).toEqual([
      [1, [1]],
      [2, [5]],
      [4, [13]],
    ]);
    expect(result[0].steps[0]).toMatchObject({ title: "Before You Read", teacherActions: ["en act 1"], scriptMd: "# Step 1" });
  });

  it("prefers the Thai row for the Thai locale and falls back to English per step", async () => {
    const mock = dbWith([[guide(1, "en", 1, "Before You Read"), guide(1, "th", 1, "ก่อนอ่าน"), guide(2, "en", 1, "Key Vocabulary")]]);
    const result = await getLessonGuide({ db: mock as unknown as DB, locale: "th" });
    expect(result[0].steps.map((step) => step.title)).toEqual(["ก่อนอ่าน", "Key Vocabulary"]);
  });

  it("maps every locale but Thai to English", () => {
    expect(["en", "vi", "cn", "tw"].map(guideLocaleOf)).toEqual(["en", "en", "en", "en"]);
    expect(guideLocaleOf("th")).toBe("th");
  });
});

describe("getTeacherLesson", () => {
  const lessonRow = {
    number: 2,
    title: "Hello Class",
    key: "o3-2/2",
    articleId: "a2",
    approved: true,
    package: {
      glossary: [{ word: "hi", pos: "exclamation", definition: "A greeting.", thai: "สวัสดี", example: "Hi, class!" }],
      bank: { mcq: [{ id: "m1", question: "How old is May?", options: ["five", "seven"], answer: "seven", evidence: "I am seven." }], saq: [{ id: "s1", question: "Name?", answer: "Tom." }], laq: [{ id: "l1", question: "Write about you." }] },
      activities: { vocabFill: [{ sentence: "May is ___.", answer: "seven" }], sentenceOrder: ["A", "B"], writingPrompt: "Write about you.", writingFrames: ["My name is ___."] },
      summary: "May meets her class.",
      thaiSummary: "เมย์พบเพื่อนร่วมชั้น",
    },
  };

  it("returns the lesson, the article paragraphs, the key, and the steps done", async () => {
    // class book, class, lesson, states, article
    const mock = dbWith([[classBookRow], [classRow], [lessonRow], [{ lessonNumber: 2, taughtAt: null, stepsDone: [3, 1, 2] }], [{ title: "Hello Class", passage: "Para one.\n\nPara two." }]]);
    const result = await getTeacherLesson({ db: mock as unknown as DB, user: teacher, classBookId: CLASS_BOOK, number: 2 });
    expect(result.lesson).toEqual({ number: 2, title: "Hello Class", key: "o3-2/2", articleId: "a2", approved: true });
    expect(result.article).toEqual({ title: "Hello Class", paragraphs: ["Para one.", "Para two."] });
    expect(result.glossary[0]).toMatchObject({ word: "hi", thai: "สวัสดี" });
    expect(result.bank.mcq[0]).toMatchObject({ answer: "seven", evidence: "I am seven." });
    expect(result.bank.saq[0].answer).toBe("Tom.");
    expect(result.activities?.vocabFill?.[0]).toEqual({ sentence: "May is ___.", answer: "seven" });
    expect(result.summary).toBe("May meets her class.");
    expect(result.stepsDone).toEqual([1, 2, 3]);
    expect(result.classBook.taughtCount).toBe(0);
  });

  it("returns no article and an empty key for a draft lesson without a package", async () => {
    const mock = dbWith([[classBookRow], [classRow], [{ ...lessonRow, articleId: null, approved: false, package: null }], []]);
    const result = await getTeacherLesson({ db: mock as unknown as DB, user: teacher, classBookId: CLASS_BOOK, number: 2 });
    expect(result.article).toBeNull();
    expect(result.bank).toEqual({ mcq: [], saq: [], laq: [] });
    expect(result.glossary).toEqual([]);
    expect(result.activities).toBeNull();
    // only four selects: no article read
    expect(mock.select).toHaveBeenCalledTimes(4);
  });

  it("fails for a lesson that is not in the catalogue", async () => {
    const mock = dbWith([[classBookRow], [classRow], [], []]);
    await expect(getTeacherLesson({ db: mock as unknown as DB, user: teacher, classBookId: CLASS_BOOK, number: 99 })).rejects.toThrow(/not in the catalogue/);
  });
});

describe("resolveBookLesson", () => {
  it("returns the catalogue lesson of a QR link, or null", async () => {
    const ref = { bookId: BOOK, bookKey: "o3-2", bookName: "Primary Advantage Origins 3.2", number: 5, title: "Story 5", articleId: "a5", approved: true };
    expect(await resolveBookLesson({ db: dbWith([[ref]]) as unknown as DB, bookKey: "o3-2", number: 5 })).toEqual(ref);
    expect(await resolveBookLesson({ db: dbWith([[]]) as unknown as DB, bookKey: "zz", number: 1 })).toBeNull();
  });
});

describe("findTeacherClassBook", () => {
  it("returns the first class book of the book in the teacher's classes", async () => {
    const mock = dbWith([[{ id: CLASS }], [{ classBookId: CLASS_BOOK, classroomId: CLASS }]]);
    expect(await findTeacherClassBook({ db: mock as unknown as DB, user: teacher, bookId: BOOK })).toEqual({ classBookId: CLASS_BOOK, classroomId: CLASS });
  });

  it("returns null when the teacher has no class, or no class with the book", async () => {
    expect(await findTeacherClassBook({ db: dbWith([[]]) as unknown as DB, user: teacher, bookId: BOOK })).toBeNull();
    expect(await findTeacherClassBook({ db: dbWith([[{ id: CLASS }], []]) as unknown as DB, user: teacher, bookId: BOOK })).toBeNull();
  });
});
