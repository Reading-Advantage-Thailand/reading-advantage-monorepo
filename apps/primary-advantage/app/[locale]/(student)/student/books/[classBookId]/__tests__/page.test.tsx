// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  locale: "en" as TestLocale,
  user: { id: "s1", username: "ann", name: "Ann", role: "STUDENT", schoolId: "school-1", xp: 0, level: 1, cefrLevel: "A1" } as Record<string, unknown> | null,
  getStudentBook: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user, getCurrentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ getStudentBook: mocks.getStudentBook }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => mocks.locale,
    getTranslations: async (namespace?: string) => createTranslator({ locale: mocks.locale, messages: messages[mocks.locale], namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({
  redirect: mocks.redirect,
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import StudentBookPage from "../page";

const CB = "cbcbcbcb-0000-4000-8000-000000000001";
const lesson = (number: number, extra: Partial<{ articleId: string | null; current: boolean; taught: boolean }> = {}) => ({
  number,
  title: `Story ${number}`,
  articleId: `a${number}`,
  current: false,
  taught: false,
  ...extra,
});
const book = {
  classBookId: CB,
  classroomId: "c1",
  bookKey: "o3-2",
  bookName: "Primary Advantage Origins 3.2",
  mode: "teacher_led",
  currentLesson: 3,
  lessonCount: 14,
  lesson: { number: 3, title: "Story 3", key: "o3-2/3", articleId: "a3", unlockedAppSteps: [1, 2] },
  lessons: [lesson(1, { taught: true }), lesson(2), lesson(3, { current: true }), lesson(4), lesson(5, { articleId: null })],
};

/**
 * Renders the book page through the real message tree.
 * @param locale The UI locale.
 */
async function renderBook(locale: TestLocale = "en") {
  mocks.locale = locale;
  renderWithMessages((await StudentBookPage({ params: Promise.resolve({ classBookId: CB }) })) as React.ReactElement, { locale });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getStudentBook.mockResolvedValue(book);
});
afterEach(cleanup);

describe("student book view (teacher-books FR-4)", () => {
  const en = testMessages.en.StudentHome.book;

  it("lists every lesson, marks the current one, and links taught and earlier lessons only", async () => {
    await renderBook();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Primary Advantage Origins 3.2");
    expect(screen.getByText("Lesson 3 of 14")).toBeInTheDocument();
    const rows = within(screen.getByRole("list", { name: en.lessons })).getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    expect(within(rows[0]).getByText(en.taught)).toBeInTheDocument();
    expect(within(rows[0]).getByRole("link", { name: en.read })).toHaveAttribute("href", "/student/read/a1");
    expect(within(rows[1]).getByRole("link", { name: en.read })).toHaveAttribute("href", "/student/read/a2");
    expect(rows[2]).toHaveAttribute("aria-current", "step");
    expect(within(rows[2]).getByText(en.current)).toBeInTheDocument();
    expect(within(rows[2]).queryByRole("link")).not.toBeInTheDocument();
    expect(within(rows[3]).getByText(en.notYet)).toBeInTheDocument();
    expect(within(rows[4]).getByText(en.notYet)).toBeInTheDocument();
    expect(mocks.getStudentBook).toHaveBeenCalledWith(expect.objectContaining({ classBookId: CB, user: mocks.user }));
  });

  it("links the current lesson once the reading step is open, and every published lesson in independent mode", async () => {
    mocks.getStudentBook.mockResolvedValueOnce({ ...book, lesson: { ...book.lesson, unlockedAppSteps: [1, 2, 3] } });
    await renderBook();
    let rows = within(screen.getByRole("list", { name: en.lessons })).getAllByRole("listitem");
    expect(within(rows[2]).getByRole("link", { name: en.read })).toHaveAttribute("href", "/student/read/a3");
    expect(within(rows[3]).queryByRole("link")).not.toBeInTheDocument();
    cleanup();
    mocks.getStudentBook.mockResolvedValueOnce({ ...book, mode: "independent" });
    await renderBook();
    rows = within(screen.getByRole("list", { name: en.lessons })).getAllByRole("listitem");
    expect(within(rows[3]).getByRole("link", { name: en.read })).toHaveAttribute("href", "/student/read/a4");
    expect(within(rows[4]).queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders in Thai", async () => {
    await renderBook("th");
    expect(screen.getByText(testMessages.th.StudentHome.book.current)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: testMessages.th.StudentHome.book.back })).toHaveAttribute("href", "/student/home");
  });

  it("is not found when the class book is not the student's", async () => {
    mocks.getStudentBook.mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(renderBook()).rejects.toThrow("NOT_FOUND");
  });

  it("redirects a visitor to sign-in", async () => {
    mocks.user = null;
    await StudentBookPage({ params: Promise.resolve({ classBookId: CB }) });
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/auth/signin", locale: "en" });
    mocks.user = { id: "s1", role: "STUDENT", schoolId: "school-1" };
  });
});
