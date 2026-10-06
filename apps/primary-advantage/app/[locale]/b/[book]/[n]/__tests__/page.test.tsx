import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null as Record<string, unknown> | null,
  resolveBookLesson: vi.fn(),
  findTeacherClassBook: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ resolveBookLesson: mocks.resolveBookLesson, findTeacherClassBook: mocks.findTeacherClassBook }));
vi.mock("@/i18n/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import BookLessonLinkPage from "../page";

const ref = { bookId: "b1", bookKey: "o3-2", bookName: "Primary Advantage Origins 3.2", number: 5, title: "Story 5", articleId: "a5", approved: true };
const open = (book = "o3-2", n = "5") => BookLessonLinkPage({ params: Promise.resolve({ locale: "th", book, n }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveBookLesson.mockResolvedValue(ref);
  mocks.findTeacherClassBook.mockResolvedValue({ classBookId: "cb1", classroomId: "c1" });
});

describe("/b/<book>/<n> (QR deep link, FR-16)", () => {
  it("sends a student into the lesson flow of the article", async () => {
    mocks.user = { id: "s1", role: "STUDENT", schoolId: "school-1" };
    await open();
    expect(mocks.resolveBookLesson).toHaveBeenCalledWith({ db: {}, bookKey: "o3-2", number: 5 });
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/student/lesson/a5?type=article", locale: "th" });
  });

  it("sends a student home when the lesson is not published yet", async () => {
    mocks.user = { id: "s1", role: "STUDENT", schoolId: "school-1" };
    mocks.resolveBookLesson.mockResolvedValueOnce({ ...ref, articleId: null, approved: false });
    await open();
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/student/home", locale: "th" });
  });

  it("sends a teacher to the lesson page of the first class with the book, or to the class list", async () => {
    mocks.user = { id: "t1", role: "TEACHER", schoolId: "school-1" };
    await open();
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/teacher/class-roster/c1/books/cb1/lessons/5", locale: "th" });
    mocks.findTeacherClassBook.mockResolvedValueOnce(null);
    await open();
    expect(mocks.redirect).toHaveBeenLastCalledWith({ href: "/teacher/my-classes", locale: "th" });
  });

  it("sends a visitor to sign in and is not found for an unknown lesson or a bad number", async () => {
    mocks.user = null;
    await open();
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/auth/signin", locale: "th" });
    mocks.resolveBookLesson.mockResolvedValueOnce(null);
    await expect(open("zz", "1")).rejects.toThrow("NOT_FOUND");
    await expect(open("o3-2", "x")).rejects.toThrow("NOT_FOUND");
  });
});
