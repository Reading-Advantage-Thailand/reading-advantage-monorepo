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
  getClassBookPacing: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user, getCurrentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ getClassBookPacing: mocks.getClassBookPacing }));
vi.mock("@/actions/class-books", () => ({ setCurrentLessonAction: vi.fn(), markLessonTaughtAction: vi.fn(), markStepDoneAction: vi.fn() }));
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
  useRouter: () => ({ refresh: vi.fn() }),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import ClassBookPacingPage from "../page";

const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const CB = "cbcbcbcb-0000-4000-8000-000000000001";
const classBook = { id: CB, classroomId: C1, bookId: "b1", bookKey: "o3-2", bookName: "Primary Advantage Origins 3.2", lessonCount: 14, mode: "teacher_led", startDate: null, currentLesson: 3, taughtCount: 1 };
const lesson = (number: number, extra: Record<string, unknown> = {}) => ({ number, title: `Story ${number}`, key: `o3-2/${number}`, articleId: `a${number}`, approved: true, taughtAt: null, stepsDone: [], current: false, ...extra });
const pacing = {
  classBook,
  lessons: [lesson(1, { taughtAt: new Date("2026-10-01T03:00:00Z"), stepsDone: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] }), lesson(2), lesson(3, { current: true, stepsDone: [1, 2, 3, 4, 5, 6] }), lesson(4, { approved: false, articleId: null })],
  nextStep: 7,
  plannedPeriod: 2,
};

/**
 * Renders the lesson plan page through the real message tree.
 * @param locale The UI locale.
 */
async function renderPage(locale: TestLocale = "en") {
  mocks.locale = locale;
  renderWithMessages((await ClassBookPacingPage({ params: Promise.resolve({ classroomId: C1, classBookId: CB }) })) as React.ReactElement, { locale });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getClassBookPacing.mockResolvedValue(pacing);
});
afterEach(cleanup);

describe("class book lesson plan (FR-3)", () => {
  const en = testMessages.en.TeacherUi.classBook;

  it("shows the pointer, the next step with its period, and the 13 step toggles of the current lesson", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Primary Advantage Origins 3.2");
    expect(screen.getByText("Lesson 3 of 14 · 1 lesson taught")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.backToClass })).toHaveAttribute("href", `/teacher/class-roster/${C1}`);
    const next = screen.getByRole("region", { name: en.nextStep });
    const headline = within(next).getAllByText("Step 7: Comprehension Check")[0].closest("p");
    expect(headline).toHaveTextContent("Step 7: Comprehension Check");
    expect(headline?.querySelector('[data-slot="status-chip"]')).toHaveTextContent("Period 2");
    const toggles = within(within(next).getByRole("list", { name: en.steps })).getAllByRole("button");
    expect(toggles).toHaveLength(13);
    expect(toggles.filter((button) => button.getAttribute("aria-pressed") === "true")).toHaveLength(6);
    expect(toggles[6]).toHaveAccessibleName(/Step 7: Comprehension Check/);
    expect(mocks.getClassBookPacing).toHaveBeenCalledWith(expect.objectContaining({ classBookId: CB, user: mocks.user }));
  });

  it("lists every lesson with its taught date, the current marker, the draft note, and the actions", async () => {
    await renderPage();
    const rows = within(screen.getByRole("region", { name: en.lessons })).getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText(/^Taught (1 Oct|Oct 1)$/)).toBeInTheDocument();
    expect(within(rows[0]).queryByRole("button", { name: en.markTaught })).not.toBeInTheDocument();
    expect(within(rows[0]).getByRole("button", { name: en.setCurrent })).toBeInTheDocument();
    expect(rows[2]).toHaveAttribute("aria-current", "step");
    expect(within(rows[2]).getByText(en.current)).toBeInTheDocument();
    expect(within(rows[2]).queryByRole("button", { name: en.setCurrent })).not.toBeInTheDocument();
    expect(within(rows[2]).getByRole("button", { name: en.markTaught })).toBeInTheDocument();
    expect(within(rows[3]).getByText(/Not published yet/)).toBeInTheDocument();
  });

  it("says all steps are done when there is no next step", async () => {
    mocks.getClassBookPacing.mockResolvedValueOnce({ ...pacing, nextStep: null, plannedPeriod: null });
    await renderPage();
    expect(screen.getByText(en.allStepsDone)).toBeInTheDocument();
  });

  it("renders in Thai", async () => {
    await renderPage("th");
    expect(screen.getByRole("region", { name: testMessages.th.TeacherUi.classBook.nextStep })).toBeInTheDocument();
    expect(screen.getAllByText("คาบที่ 2").length).toBeGreaterThan(0);
  });

  it("is not found when the class book is not the teacher's", async () => {
    mocks.getClassBookPacing.mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(renderPage()).rejects.toThrow("NOT_FOUND");
  });
});
