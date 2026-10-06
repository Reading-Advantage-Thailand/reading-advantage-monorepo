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
  getStudentLessonSteps: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user, getCurrentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ getStudentLessonSteps: mocks.getStudentLessonSteps }));
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

import StudentProgressPage from "../page";

const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const CB = "cbcbcbcb-0000-4000-8000-000000000001";
const early = new Date("2026-10-01T08:00:00Z");
const step = (appStep: number, status: string, seconds = 0) => ({ appStep, status, startedAt: status === "not_started" ? null : early, doneAt: status === "done" ? early : null, seconds });
const data = {
  classBook: { id: CB, classroomId: C1, bookId: "b1", bookKey: "o3-2", bookName: "Primary Advantage Origins 3.2", lessonCount: 14, mode: "teacher_led", startDate: null, currentLesson: 2, taughtCount: 1 },
  student: { id: "s1", name: "Ann", username: "p3a1" },
  lessons: [
    { number: 1, title: "Story 1", taughtAt: new Date("2026-10-02T08:00:00Z"), steps: Array.from({ length: 14 }, (_, index) => step(index + 1, "done", 600)) },
    { number: 2, title: "Story 2", taughtAt: null, steps: Array.from({ length: 14 }, (_, index) => step(index + 1, index < 3 ? "done" : index === 3 ? "in_progress" : "not_started", index < 4 ? 125 : 0)) },
  ],
};

/**
 * Renders the drill-down through the real message tree.
 * @param locale The UI locale.
 */
async function renderPage(locale: TestLocale = "en") {
  mocks.locale = locale;
  renderWithMessages((await StudentProgressPage({ params: Promise.resolve({ classroomId: C1, classBookId: CB, studentId: "s1" }) })) as React.ReactElement, { locale });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getStudentLessonSteps.mockResolvedValue(data);
});
afterEach(cleanup);

describe("student progress drill-down (FR-6, FR-7)", () => {
  const en = testMessages.en.TeacherUi.classBook.progress;

  it("shows every lesson with its 14 steps, the time, and the fidelity signal", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ann");
    expect(screen.getByRole("link", { name: en.backToGrid })).toHaveAttribute("href", `/teacher/class-roster/${C1}/books/${CB}/progress`);
    const lessons = screen.getAllByRole("heading", { level: 2 });
    expect(lessons).toHaveLength(2);
    const first = lessons[0].closest("li")!;
    expect(within(first).getByText("14 of 14 steps")).toBeInTheDocument();
    expect(within(first).getByText("10 min")).toBeInTheDocument();
    // started 1 Oct, taught 2 Oct: opened before taught
    expect(within(first).getByText(en.openedBeforeTaught)).toBeInTheDocument();
    expect(within(first).getAllByRole("listitem")).toHaveLength(14);
    const second = lessons[1].closest("li")!;
    expect(within(second).getByText("3 of 14 steps")).toBeInTheDocument();
    expect(within(second).getByText("2 min")).toBeInTheDocument();
    expect(within(second).getByText(en.notTaught)).toBeInTheDocument();
    expect(within(second).getByLabelText("Step 4: In progress").className).toContain("bg-blue-100");
    expect(within(second).getByLabelText("Step 5: Not started").className).toContain("bg-slate-100");
    expect(mocks.getStudentLessonSteps).toHaveBeenCalledWith(expect.objectContaining({ classBookId: CB, studentId: "s1" }));
  });

  it("is not found when the student is not in the class", async () => {
    mocks.getStudentLessonSteps.mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(renderPage()).rejects.toThrow("NOT_FOUND");
  });
});
