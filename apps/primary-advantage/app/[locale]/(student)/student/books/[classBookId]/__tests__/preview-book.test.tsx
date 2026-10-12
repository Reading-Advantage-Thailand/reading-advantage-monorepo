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
  getPreviewBook: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user, getCurrentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ getStudentBook: mocks.getStudentBook, getPreviewBook: mocks.getPreviewBook }));
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
const lesson = (number: number, articleId: string | null = `a${number}`, current = false) => ({ number, title: `Story ${number}`, articleId, current, taught: false });
const book = {
  classBookId: CB,
  classroomId: "c1",
  bookKey: "o3-2",
  bookName: "Primary Advantage Origins 3.2",
  mode: "independent",
  currentLesson: 2,
  lessonCount: 14,
  lesson: { number: 2, title: "Story 2", key: "o3-2/2", articleId: "a2", unlockedAppSteps: [1, 2, 3] },
  lessons: [lesson(1), lesson(2, "a2", true), lesson(3, null)],
};

/**
 * Renders the book page for a staff member through the real message tree.
 * @param role The staff role.
 */
async function renderPreviewBook(role = "TEACHER") {
  mocks.user = { id: "t1", username: "kru", name: "Kru", role, schoolId: "school-1", xp: 0, level: 1, cefrLevel: "A1" };
  renderWithMessages((await StudentBookPage({ params: Promise.resolve({ classBookId: CB }) })) as React.ReactElement, { locale: "en" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPreviewBook.mockResolvedValue(book);
});
afterEach(cleanup);

describe("class book in Preview mode (S4)", () => {
  const en = testMessages.en.StudentHome.book;

  it.each(["TEACHER", "ADMIN", "SYSTEM"])("%s sees every published lesson open and no progress marks", async (role) => {
    await renderPreviewBook(role);
    const rows = within(screen.getByRole("list", { name: en.lessons })).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByRole("link", { name: en.read })).toHaveAttribute("href", "/student/lesson/a1?type=article");
    expect(within(rows[1]).getByRole("link", { name: en.read })).toHaveAttribute("href", "/student/lesson/a2?type=article");
    expect(within(rows[2]).getByText(en.notYet)).toBeInTheDocument();
    expect(screen.queryByText(en.taught)).not.toBeInTheDocument();
    expect(mocks.getPreviewBook).toHaveBeenCalledWith(expect.objectContaining({ classBookId: CB }));
    expect(mocks.getStudentBook).not.toHaveBeenCalled();
  });

  it("gives 404 for an unknown book, a book of another teacher, or another school", async () => {
    mocks.getPreviewBook.mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(renderPreviewBook()).rejects.toThrow("NOT_FOUND");
  });

  it("keeps the student path for a student", async () => {
    mocks.user = { id: "s1", role: "STUDENT", schoolId: "school-1" };
    mocks.getStudentBook.mockResolvedValue(book);
    renderWithMessages((await StudentBookPage({ params: Promise.resolve({ classBookId: CB }) })) as React.ReactElement, { locale: "en" });
    expect(mocks.getStudentBook).toHaveBeenCalled();
    expect(mocks.getPreviewBook).not.toHaveBeenCalled();
  });
});
