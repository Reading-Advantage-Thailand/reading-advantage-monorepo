// @vitest-environment node
/** Class book actions: the session gate, the form parsing, and the error mapping. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  assignClassBook: vi.fn(),
  markLessonTaught: vi.fn(),
  markStepDone: vi.fn(),
  setCurrentLesson: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@reading-advantage/db", () => ({ db: { tag: "db" } }));
vi.mock("@/lib/observability/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
vi.mock("@reading-advantage/domain/primary-books", () => ({
  assignClassBook: mocks.assignClassBook,
  markLessonTaught: mocks.markLessonTaught,
  markStepDone: mocks.markStepDone,
  setCurrentLesson: mocks.setCurrentLesson,
  teachLessonAgain: vi.fn(),
}));

import { assignClassBookAction, markLessonTaughtAction, markStepDoneAction, setCurrentLessonAction } from "../class-books";

const TEACHER = { id: "t1", role: "TEACHER", schoolId: "school-1" };
const BOOK = "22222222-2222-4222-8222-222222222222";

/**
 * Builds the assign form.
 * @param fields The form fields.
 * @returns The form data.
 */
function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.currentUser.mockResolvedValue(TEACHER);
});

describe("assignClassBookAction", () => {
  it("refuses without a user and writes nothing", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect(await assignClassBookAction(null, form({ classroomId: "c1", bookId: "b1" }))).toEqual({ success: false, error: "Unauthorized" });
    expect(mocks.assignClassBook).not.toHaveBeenCalled();
  });

  it("passes the independent mode and the start date", async () => {
    expect(await assignClassBookAction(null, form({ classroomId: "c1", bookId: "b1", mode: "independent", startDate: "2026-11-01" }))).toEqual({ success: true });
    expect(mocks.assignClassBook).toHaveBeenCalledWith({
      db: { tag: "db" },
      user: TEACHER,
      input: { classroomId: "c1", bookId: "b1", mode: "independent", startDate: new Date("2026-11-01") },
    });
  });

  it("falls back to teacher_led, a null start date, and empty ids", async () => {
    await assignClassBookAction(null, form({ mode: "bogus" }));
    expect(mocks.assignClassBook.mock.calls[0][0].input).toEqual({ classroomId: "", bookId: "", mode: "teacher_led", startDate: null });
  });

  it("maps a domain error to its message", async () => {
    mocks.assignClassBook.mockRejectedValue(new Error("Book already assigned"));
    expect(await assignClassBookAction(null, form({ classroomId: "c1", bookId: "b1" }))).toEqual({ success: false, error: "Book already assigned" });
  });

  it("maps a non-Error throw to Failed", async () => {
    mocks.assignClassBook.mockRejectedValue("nope");
    expect(await assignClassBookAction(null, form({ classroomId: "c1", bookId: "b1" }))).toEqual({ success: false, error: "Failed" });
  });
});

describe("lesson pointer and step actions", () => {
  it("sets the current lesson", async () => {
    expect(await setCurrentLessonAction(BOOK, 4)).toEqual({ success: true });
    expect(mocks.setCurrentLesson).toHaveBeenCalledWith({ db: { tag: "db" }, user: TEACHER, input: { classBookId: BOOK, lessonNumber: 4 } });
  });

  it("marks a lesson taught", async () => {
    expect(await markLessonTaughtAction(BOOK, 5)).toEqual({ success: true });
    expect(mocks.markLessonTaught).toHaveBeenCalledWith({ db: { tag: "db" }, user: TEACHER, input: { classBookId: BOOK, lessonNumber: 5 } });
  });

  it("marks one step undone", async () => {
    expect(await markStepDoneAction(BOOK, 5, 13, false)).toEqual({ success: true });
    expect(mocks.markStepDone).toHaveBeenCalledWith({ db: { tag: "db" }, user: TEACHER, input: { classBookId: BOOK, lessonNumber: 5, step: 13, done: false } });
  });

  it("refuses each action without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect(await setCurrentLessonAction(BOOK, 1)).toEqual({ success: false, error: "Unauthorized" });
    expect(await markLessonTaughtAction(BOOK, 1)).toEqual({ success: false, error: "Unauthorized" });
    expect(await markStepDoneAction(BOOK, 1, 1, true)).toEqual({ success: false, error: "Unauthorized" });
    expect(mocks.setCurrentLesson).not.toHaveBeenCalled();
    expect(mocks.markLessonTaught).not.toHaveBeenCalled();
    expect(mocks.markStepDone).not.toHaveBeenCalled();
  });

  it("maps a refused step to its message", async () => {
    mocks.markStepDone.mockRejectedValue(new Error("Forbidden"));
    expect(await markStepDoneAction(BOOK, 1, 1, true)).toEqual({ success: false, error: "Forbidden" });
  });
});
