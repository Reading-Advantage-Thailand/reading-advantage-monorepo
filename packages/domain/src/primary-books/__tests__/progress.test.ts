import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "../../__tests__/mock-db.js";
import { getClassBookProgress, getStudentLessonSteps, recordLessonProgress, toProgressCsv } from "../progress.js";

const SCHOOL = "school-1";
const CLASS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOOK = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLASS_BOOK = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ARTICLE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const NOW = new Date("2026-10-05T08:00:00Z");

const teacher: UserContext = { id: "t1", username: "t1", name: "T", role: "TEACHER", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const student: UserContext = { ...teacher, id: "s1", role: "STUDENT" };
const classRow = { id: CLASS, schoolId: SCHOOL, teacherId: "t1" };
const classBookRow = { id: CLASS_BOOK, classroomId: CLASS, schoolId: SCHOOL, bookId: BOOK, bookKey: "o3-2", bookName: "Origins 3.2", lessonCount: 14, mode: "teacher_led", startDate: null, currentLesson: 2 };
const dbWith = (selects: unknown[][]) => createMockDb({ selectSequence: selects });

/** The values of the n-th insert call. */
const inserted = (mock: ReturnType<typeof createMockDb>, index: number) => mock.insert.mock.results[0].value.values.mock.calls[index][0] as Record<string, unknown>;

describe("recordLessonProgress", () => {
  it("marks earlier steps done and the reached step in progress for every matching class lesson", async () => {
    const mock = dbWith([[{ classBookId: CLASS_BOOK, lessonNumber: 2 }], []]);
    const count = await recordLessonProgress({ db: mock as unknown as DB, user: student, now: NOW, input: { articleId: ARTICLE, reachedStep: 3, seconds: 90 } });
    expect(count).toBe(1);
    expect(mock.insert).toHaveBeenCalledTimes(3);
    expect(inserted(mock, 0)).toMatchObject({ classBookId: CLASS_BOOK, studentId: "s1", lessonNumber: 2, appStep: 1, status: "done", doneAt: NOW, startedAt: NOW, seconds: 90 });
    expect(inserted(mock, 1)).toMatchObject({ appStep: 2, status: "done" });
    expect(inserted(mock, 2)).toMatchObject({ appStep: 3, status: "in_progress", doneAt: null });
  });

  it("keeps a done step done when the student goes back, and keeps the first start time", async () => {
    const started = new Date("2026-10-04T08:00:00Z");
    const existing = [
      { appStep: 1, status: "done", startedAt: started, doneAt: started },
      { appStep: 2, status: "done", startedAt: started, doneAt: started },
      { appStep: 3, status: "in_progress", startedAt: started, doneAt: null },
    ];
    const mock = dbWith([[{ classBookId: CLASS_BOOK, lessonNumber: 2 }], existing]);
    await recordLessonProgress({ db: mock as unknown as DB, user: student, now: NOW, input: { articleId: ARTICLE, reachedStep: 2, seconds: 120 } });
    // steps 1 and 2 are done already: nothing to write
    expect(mock.insert).not.toHaveBeenCalled();
    const again = dbWith([[{ classBookId: CLASS_BOOK, lessonNumber: 2 }], existing]);
    await recordLessonProgress({ db: again as unknown as DB, user: student, now: NOW, input: { articleId: ARTICLE, reachedStep: 4, seconds: 150 } });
    expect(again.insert).toHaveBeenCalledTimes(2);
    expect(inserted(again, 0)).toMatchObject({ appStep: 3, status: "done", startedAt: started, doneAt: NOW });
    expect(inserted(again, 1)).toMatchObject({ appStep: 4, status: "in_progress", startedAt: NOW });
  });

  it("writes nothing when the article is not a lesson of the student's class books", async () => {
    const mock = dbWith([[]]);
    expect(await recordLessonProgress({ db: mock as unknown as DB, user: student, input: { articleId: ARTICLE, reachedStep: 5 } })).toBe(0);
    expect(mock.insert).not.toHaveBeenCalled();
  });
});

const students = [
  { id: "s1", name: "Ann", username: "p3a1" },
  { id: "s2", name: "Bo, Jr.", username: "p3a2" },
];
const lessons = [
  { number: 1, title: "Story 1" },
  { number: 2, title: "Story 2" },
];
const taught1 = new Date("2026-10-02T08:00:00Z");
const states = [{ lessonNumber: 1, taughtAt: taught1 }];
const step = (studentId: string, lessonNumber: number, appStep: number, status: string, at: Date, seconds = 60) => ({
  studentId,
  lessonNumber,
  appStep,
  status,
  startedAt: at,
  doneAt: status === "done" ? at : null,
  seconds,
  updatedAt: at,
});
const early = new Date("2026-10-01T08:00:00Z");
const old = new Date("2026-09-20T08:00:00Z");
const steps = [
  ...Array.from({ length: 14 }, (_, index) => step("s1", 1, index + 1, "done", early, 600)),
  step("s1", 2, 1, "done", old),
  step("s1", 2, 2, "in_progress", old, 75),
];

describe("getClassBookProgress", () => {
  it("builds one cell per student and lesson with the status, the flags, and the fidelity signal", async () => {
    const mock = dbWith([[classBookRow], [classRow], students, lessons, states, steps]);
    const result = await getClassBookProgress({ db: mock as unknown as DB, user: teacher, now: NOW, classBookId: CLASS_BOOK });
    expect(result.classBook).toMatchObject({ id: CLASS_BOOK, taughtCount: 1 });
    expect(result.lessons).toEqual([
      { number: 1, title: "Story 1", taughtAt: taught1 },
      { number: 2, title: "Story 2", taughtAt: null },
    ]);
    expect(result.cells).toHaveLength(4);
    const cell = (studentId: string, lessonNumber: number) => result.cells.find((row) => row.studentId === studentId && row.lessonNumber === lessonNumber)!;
    expect(cell("s1", 1)).toMatchObject({ status: "done", doneSteps: 14, currentStep: null, seconds: 600, late: false, stuck: false, openedBeforeTaught: true });
    expect(cell("s1", 2)).toMatchObject({ status: "in_progress", doneSteps: 1, currentStep: 2, seconds: 75, late: false, stuck: true, openedBeforeTaught: true });
    expect(cell("s2", 1)).toMatchObject({ status: "not_started", doneSteps: 0, currentStep: null, late: true, stuck: false, openedBeforeTaught: false, firstStartedAt: null, lastAt: null });
    expect(cell("s2", 2)).toMatchObject({ status: "not_started", late: false });
  });

  it("rejects a student", async () => {
    const mock = dbWith([[classBookRow], [classRow]]);
    await expect(getClassBookProgress({ db: mock as unknown as DB, user: student, classBookId: CLASS_BOOK })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("getStudentLessonSteps", () => {
  it("returns the 14 steps of every lesson for one student", async () => {
    const mock = dbWith([[classBookRow], [classRow], students, lessons, states, steps]);
    const result = await getStudentLessonSteps({ db: mock as unknown as DB, user: teacher, classBookId: CLASS_BOOK, studentId: "s1" });
    expect(result.student).toEqual(students[0]);
    expect(result.lessons).toHaveLength(2);
    expect(result.lessons[0].steps).toHaveLength(14);
    expect(result.lessons[0].steps[13]).toMatchObject({ appStep: 14, status: "done", seconds: 600 });
    expect(result.lessons[1].steps[1]).toMatchObject({ appStep: 2, status: "in_progress", startedAt: old, doneAt: null, seconds: 75 });
    expect(result.lessons[1].steps[2]).toEqual({ appStep: 3, status: "not_started", startedAt: null, doneAt: null, seconds: 0 });
  });

  it("rejects a student who is not in the class", async () => {
    const mock = dbWith([[classBookRow], [classRow], students, lessons, states, steps]);
    await expect(getStudentLessonSteps({ db: mock as unknown as DB, user: teacher, classBookId: CLASS_BOOK, studentId: "s9" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("toProgressCsv", () => {
  it("writes a header and one quoted row per cell", async () => {
    const mock = dbWith([[classBookRow], [classRow], students, lessons, states, steps]);
    const csv = toProgressCsv(await getClassBookProgress({ db: mock as unknown as DB, user: teacher, now: NOW, classBookId: CLASS_BOOK }));
    const lines = csv.trimEnd().split("\n");
    expect(lines[0]).toBe("student,username,lesson,title,status,done_steps,seconds,first_started_at,last_at,late,stuck,opened_before_taught");
    expect(lines).toHaveLength(5);
    expect(lines[1]).toBe(`Ann,p3a1,1,Story 1,done,14,600,${early.toISOString()},${early.toISOString()},false,false,true`);
    expect(lines[3]).toBe('"Bo, Jr.",p3a2,1,Story 1,not_started,0,0,,,true,false,false');
  });
});
