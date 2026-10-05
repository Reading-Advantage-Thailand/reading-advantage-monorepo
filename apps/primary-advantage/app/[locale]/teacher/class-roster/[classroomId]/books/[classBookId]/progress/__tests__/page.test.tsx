// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createFormatter, createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  locale: "en" as TestLocale,
  user: { id: "t1", username: "kru.ann", name: "Kru Ann", role: "TEACHER", schoolId: "school-1", xp: 0, level: 1, cefrLevel: null } as Record<string, unknown> | null,
  getClassBookProgress: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user, getCurrentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ getClassBookProgress: mocks.getClassBookProgress }));
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
    getFormatter: async () => createFormatter({ locale: mocks.locale, timeZone: "Asia/Bangkok" }),
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

import ClassBookProgressPage from "../page";

const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const CB = "cbcbcbcb-0000-4000-8000-000000000001";
const BASE = `/teacher/class-roster/${C1}/books/${CB}`;
const cell = (studentId: string, lessonNumber: number, extra: Record<string, unknown> = {}) => ({
  studentId,
  lessonNumber,
  status: "not_started",
  doneSteps: 0,
  currentStep: null,
  seconds: 0,
  firstStartedAt: null,
  lastAt: null,
  late: false,
  stuck: false,
  openedBeforeTaught: false,
  ...extra,
});
const progress = {
  classBook: { id: CB, classroomId: C1, bookId: "b1", bookKey: "o3-2", bookName: "Primary Advantage Origins 3.2", lessonCount: 14, mode: "teacher_led", startDate: null, currentLesson: 2, taughtCount: 1 },
  students: [
    { id: "s1", name: "Ann", username: "p3a1" },
    { id: "s2", name: null, username: "p3a2" },
  ],
  lessons: [
    { number: 1, title: "Story 1", taughtAt: new Date("2026-10-02T08:00:00Z") },
    { number: 2, title: "Story 2", taughtAt: null },
  ],
  cells: [
    cell("s1", 1, { status: "done", doneSteps: 14 }),
    cell("s1", 2, { status: "in_progress", doneSteps: 3, currentStep: 4, stuck: true }),
    cell("s2", 1, { late: true }),
    cell("s2", 2),
  ],
};

/**
 * Renders the grid page through the real message tree.
 * @param filter The filter query.
 * @param locale The UI locale.
 */
async function renderPage(filter?: string, locale: TestLocale = "en") {
  mocks.locale = locale;
  renderWithMessages((await ClassBookProgressPage({ params: Promise.resolve({ classroomId: C1, classBookId: CB }), searchParams: Promise.resolve({ filter }) })) as React.ReactElement, { locale });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getClassBookProgress.mockResolvedValue(progress);
});
afterEach(cleanup);

describe("class book progress grid (FR-6)", () => {
  const en = testMessages.en.TeacherUi.classBook.progress;

  it("shows every student by lesson with the steps done, a color per status, and a click-through", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en.title);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    const ann = within(table).getByRole("link", { name: "Ann, lesson 1: Done, 14 of 14 steps" });
    expect(ann).toHaveTextContent("14/14");
    expect(ann).toHaveAttribute("href", `${BASE}/progress/s1`);
    expect(ann.className).toContain("bg-green-100");
    expect(within(table).getByRole("link", { name: "Ann, lesson 2: In progress, 3 of 14 steps" }).className).toContain("bg-blue-100");
    const late = within(table).getByRole("link", { name: "p3a2, lesson 1: Not started, 0 of 14 steps" });
    expect(late.className).toContain("ring-red-400");
    expect(screen.getByRole("link", { name: en.csv })).toHaveAttribute("href", `/api/class-books/${CB}/progress`);
    expect(screen.getByRole("link", { name: en.backToPlan })).toHaveAttribute("href", BASE);
    expect(mocks.getClassBookProgress).toHaveBeenCalledWith(expect.objectContaining({ classBookId: CB, user: mocks.user }));
  });

  it("filters the rows by late, stuck, and not started", async () => {
    await renderPage("late");
    let rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getByRole("rowheader")).toHaveTextContent("p3a2");
    expect(screen.getByRole("link", { name: en.filter.late })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: en.filter.all })).toHaveAttribute("href", `${BASE}/progress`);
    cleanup();
    await renderPage("stuck");
    rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getByRole("rowheader")).toHaveTextContent("Ann");
    cleanup();
    await renderPage("not_started");
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);
    cleanup();
    await renderPage("bogus");
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(3);
  });

  it("says when no student matches and when the class has no students", async () => {
    mocks.getClassBookProgress.mockResolvedValueOnce({ ...progress, cells: progress.cells.map((row) => ({ ...row, stuck: false })) });
    await renderPage("stuck");
    expect(screen.getByText(en.empty)).toBeInTheDocument();
    cleanup();
    mocks.getClassBookProgress.mockResolvedValueOnce({ ...progress, students: [], cells: [] });
    await renderPage();
    expect(screen.getByText(en.noStudents)).toBeInTheDocument();
  });

  it("renders in Thai", async () => {
    await renderPage(undefined, "th");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(testMessages.th.TeacherUi.classBook.progress.title);
  });

  it("is not found when the class book is not the teacher's", async () => {
    mocks.getClassBookProgress.mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(renderPage()).rejects.toThrow("NOT_FOUND");
  });
});
