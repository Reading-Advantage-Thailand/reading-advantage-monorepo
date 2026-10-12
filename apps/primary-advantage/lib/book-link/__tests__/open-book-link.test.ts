import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null as Record<string, unknown> | null,
  resolveBookLink: vi.fn(),
  findTeacherClassBook: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  tutor: vi.fn(),
}));
vi.mock("@/lib/book-link/tutor-url", () => ({ tutorLessonUrl: mocks.tutor }));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ resolveBookLink: mocks.resolveBookLink, findTeacherClassBook: mocks.findTeacherClassBook }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: mocks.info, warn: mocks.info, error: mocks.error } }));

import { openBookLink } from "../open-book-link";

const lesson = { bookId: "b1", bookKey: "o3-2", bookName: "Primary Advantage Origins 3.2", number: 5, title: "Story 5", articleId: "a5", approved: true };
const open = (n = "5", book = "o3-2", writing = false) => openBookLink({ locale: "th", book, n, writing });
const as = (role: string, schoolId: string | null = "school-1") => {
  mocks.user = { id: "u1", name: "Somchai Jaidee", role, schoolId };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = null;
  mocks.tutor.mockReturnValue(null);
  mocks.resolveBookLink.mockResolvedValue({ kind: "ok", lesson });
  mocks.findTeacherClassBook.mockResolvedValue({ classBookId: "cb1", classroomId: "c1" });
});

describe("openBookLink: the normal paths", () => {
  it("gives a signed-out reader the landing with the callback sign-in link", async () => {
    const landing = { type: "landing", bookName: lesson.bookName, title: "Story 5", number: 5, writing: false, tutorHref: null };
    expect(await open()).toEqual({ ...landing, signInHref: { pathname: "/auth/signin", query: { callbackUrl: "/th/b/o3-2/5" } } });
    expect(await open("5", "o3-2", true)).toEqual({
      ...landing,
      writing: true,
      signInHref: { pathname: "/auth/signin", query: { callbackUrl: "/th/b/o3-2/5/writing" } },
    });
  });

  it("gives the landing the Tutor link only when the builder returns one", async () => {
    mocks.tutor.mockReturnValue("https://tutor.example.com/lesson/o3-2/5");
    expect(await open()).toMatchObject({ type: "landing", tutorHref: "https://tutor.example.com/lesson/o3-2/5" });
    expect(mocks.tutor).toHaveBeenCalledWith({ book: "o3-2", number: 5 });
  });

  it("shows the landing for an unpublished lesson too, and never redirects a signed-out reader", async () => {
    mocks.resolveBookLink.mockResolvedValue({ kind: "unpublished", lesson: { ...lesson, articleId: null } });
    expect(await open()).toMatchObject({ type: "landing", title: "Story 5" });
  });

  it("skips the landing for a signed-in reader", async () => {
    as("STUDENT");
    expect((await open()).type).toBe("redirect");
    expect(mocks.tutor).not.toHaveBeenCalled();
  });

  it("sends a student to the lesson flow, or to the article page for the writing code", async () => {
    as("STUDENT");
    expect(await open()).toEqual({ type: "redirect", href: "/student/lesson/a5?type=article" });
    expect(await open("5", "o3-2", true)).toEqual({ type: "redirect", href: "/student/read/a5" });
    expect(mocks.resolveBookLink).toHaveBeenCalledWith({ db: {}, bookKey: "o3-2", number: 5 });
  });

  it("sends a teacher to the lesson page of the class book, also when the lesson is not published", async () => {
    as("TEACHER");
    expect(await open()).toEqual({ type: "redirect", href: "/teacher/class-roster/c1/books/cb1/lessons/5" });
    mocks.resolveBookLink.mockResolvedValue({ kind: "unpublished", lesson: { ...lesson, articleId: null } });
    expect(await open()).toEqual({ type: "redirect", href: "/teacher/class-roster/c1/books/cb1/lessons/5" });
  });
});

describe("openBookLink: the case pages", () => {
  it("gives unknown_book and no_lesson to any reader, signed out too, with no notFound", async () => {
    mocks.resolveBookLink.mockResolvedValue({ kind: "unknown_book" });
    expect(await open("1", "zz")).toEqual({ type: "case", name: "unknown-book", homeHref: "/" });
    expect(mocks.info).toHaveBeenCalledWith("book_link.unknown_book", { book: "zz", number: 1 });
    mocks.resolveBookLink.mockResolvedValue({ kind: "no_lesson", bookName: lesson.bookName, lessonCount: 14 });
    as("STUDENT");
    expect(await open("999")).toEqual({ type: "case", name: "no-lesson", bookName: lesson.bookName, lessonCount: 14, homeHref: "/student/home" });
    expect(mocks.info).toHaveBeenCalledWith("book_link.no_lesson", { book: "o3-2", number: 999 });
  });

  it("treats a number that is not a whole number as a lesson number that does not exist", async () => {
    as("TEACHER");
    mocks.resolveBookLink.mockResolvedValue({ kind: "no_lesson", bookName: lesson.bookName, lessonCount: 14 });
    for (const n of ["x", "0", "-1", "1.5", "1e1", "0x5"]) {
      const outcome = await open(n);
      expect(outcome).toMatchObject({ type: "case", name: "no-lesson", homeHref: "/teacher/my-classes" });
      expect(Number.isNaN(mocks.resolveBookLink.mock.calls.at(-1)![0].number)).toBe(true);
    }
  });

  it("tells a student that an unpublished lesson is not ready", async () => {
    as("STUDENT");
    mocks.resolveBookLink.mockResolvedValue({ kind: "unpublished", lesson: { ...lesson, approved: false } });
    expect(await open()).toEqual({ type: "case", name: "not-ready", homeHref: "/student/home" });
    expect(mocks.info).toHaveBeenCalledWith("book_link.unpublished", { book: "o3-2", number: 5 });
    expect(mocks.findTeacherClassBook).not.toHaveBeenCalled();
  });

  it("tells a teacher with no class that has the book to assign it", async () => {
    as("TEACHER");
    mocks.findTeacherClassBook.mockResolvedValue(null);
    expect(await open()).toEqual({ type: "case", name: "no-class", bookName: lesson.bookName, homeHref: "/teacher/my-classes" });
    expect(mocks.info).toHaveBeenCalledWith("book_link.no_class", { book: "o3-2", number: 5 });
  });

  it("tells SYSTEM (no schoolId) and ADMIN with no school class that the link is for a class teacher", async () => {
    as("SYSTEM", null);
    expect(await open()).toEqual({ type: "case", name: "teacher-only", homeHref: "/" });
    expect(mocks.findTeacherClassBook).not.toHaveBeenCalled();
    as("ADMIN");
    mocks.findTeacherClassBook.mockResolvedValue(null);
    expect(await open()).toEqual({ type: "case", name: "teacher-only", homeHref: "/" });
    expect(mocks.info).toHaveBeenCalledWith("book_link.wrong_role", { book: "o3-2", number: 5, role: "ADMIN", reason: "teacher_only" });
  });

  it("tells INTERN and other roles that the link is not for this account", async () => {
    as("INTERN");
    expect(await open()).toEqual({ type: "case", name: "wrong-account", homeHref: "/" });
    expect(mocks.info).toHaveBeenCalledWith("book_link.wrong_role", { book: "o3-2", number: 5, role: "INTERN", reason: "wrong_account" });
    expect(mocks.findTeacherClassBook).not.toHaveBeenCalled();
  });

  it("gives the retry page and logs lookup_failed when the lookup throws", async () => {
    as("STUDENT");
    const error = new Error("db down");
    mocks.resolveBookLink.mockRejectedValue(error);
    expect(await open()).toEqual({ type: "case", name: "retry", homeHref: "/student/home", retryHref: "/b/o3-2/5" });
    expect(mocks.error).toHaveBeenCalledWith("book_link.lookup_failed", { book: "o3-2", number: 5, error });
    as("TEACHER");
    mocks.resolveBookLink.mockResolvedValue({ kind: "ok", lesson });
    mocks.findTeacherClassBook.mockRejectedValue(error);
    expect(await open("5", "o3-2", true)).toMatchObject({ type: "case", name: "retry", retryHref: "/b/o3-2/5/writing" });
  });

  it("never puts the user name in a log line", async () => {
    as("INTERN");
    await open();
    expect(JSON.stringify(mocks.info.mock.calls)).not.toContain("Somchai");
  });
});
