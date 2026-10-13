// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createFormatter, createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  locale: "en" as "en" | "th",
  user: null as Record<string, unknown> | null,
  getTeacherHome: vi.fn(),
  redirect: vi.fn(),
  getTeacherBookSlots: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  getTeacherQuestCard: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-quest", () => ({ getTeacherQuestCard: mocks.getTeacherQuestCard }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ getTeacherBookSlots: mocks.getTeacherBookSlots }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: mocks.logError, warn: mocks.logWarn, info: vi.fn() } }));
vi.mock("@reading-advantage/domain/primary-home", () => ({ getTeacherHome: mocks.getTeacherHome, TEACHER_HOME_INACTIVE_DAYS: 7 }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => mocks.locale,
    getTranslations: async (namespace?: string) =>
      createTranslator({ locale: mocks.locale, messages: messages[mocks.locale as TestLocale], namespace: namespace as never }),
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

import TeacherDashboardPage from "../page";
import TeacherDashboardError from "../error";

const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const C2 = "c2c2c2c2-0000-4000-8000-000000000002";
/** 5 October 2026, 15:00 in Bangkok. */
const NOW = new Date("2026-10-05T15:00:00+07:00");
const teacher = { id: "t1", username: "kru.ann", name: "Kru Ann", role: "TEACHER", schoolId: "school-1", xp: 0, level: 1, cefrLevel: null };
const fullHome = {
  classes: [
    { id: C1, name: "P3A", grade: 3, studentCount: 2 },
    { id: C2, name: "P4B", grade: null, studentCount: 0 },
  ],
  studentCount: 2,
  openAssignments: [
    { id: "a-late", title: "Frogs", classroomId: C1, classroomName: "P3A", dueDate: new Date("2026-10-03T00:00:00+07:00"), assigned: 2, completed: 1 },
    { id: "a-today", title: "Moon", classroomId: C1, classroomName: "P3A", dueDate: new Date("2026-10-05T00:00:00+07:00"), assigned: 2, completed: 0 },
    { id: "a-none", title: "Rain", classroomId: C1, classroomName: "P3A", dueDate: null, assigned: 2, completed: 0 },
  ],
  openAssignmentCount: 3,
  needsHelp: [
    { studentId: "s1", name: "Ann", username: "p3a1", classroomId: C1, classroomName: "P3A", overdueCount: 1, lastActiveAt: new Date("2026-10-05T01:00:00Z") },
    { studentId: "s2", name: "Bo", username: "p3a2", classroomId: C1, classroomName: "P3A", overdueCount: 0, lastActiveAt: null },
    { studentId: "s3", name: "Cy", username: "p3a3", classroomId: C1, classroomName: "P3A", overdueCount: 0, lastActiveAt: new Date("2026-09-20T03:00:00Z") },
  ],
  needsHelpCount: 3,
  activeStudents30d: 2,
  engagementRate30d: 100,
  averageLevel: 4.5,
  activeToday: 1,
  completedToday: 4,
  classRows: [
    { id: C1, name: "P3A", grade: 3, students: 2, active7d: 2, activeRate7d: 100, averageLevel: 4.5, xp7d: 300, xpPrevious7d: 200, trend: "up", status: "onTrack" },
    { id: C2, name: "P4B", grade: null, students: 0, active7d: 0, activeRate7d: 0, averageLevel: null, xp7d: 0, xpPrevious7d: 0, trend: "flat", status: "noStudents" },
  ],
};

/**
 * Renders the dashboard through the real message tree.
 * @param locale The UI locale.
 */
async function renderDashboard(locale: TestLocale = "en") {
  mocks.locale = locale;
  renderWithMessages((await TeacherDashboardPage()) as React.ReactElement, { locale });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  mocks.user = { ...teacher };
  mocks.getTeacherHome.mockResolvedValue(fullHome);
  mocks.getTeacherQuestCard.mockResolvedValue(null);
  mocks.getTeacherBookSlots.mockResolvedValue([
    { classroomId: C1, classroomName: "P3A", classBookId: "cb1", bookName: "Origins 3.2", currentLesson: 3, lessonCount: 14, lessonTitle: "Sea Park", nextStep: 5, nextStepPeriod: 2 },
    { classroomId: C2, classroomName: "P4B", classBookId: null, bookName: null, currentLesson: null, lessonCount: null, lessonTitle: null, nextStep: null, nextStepPeriod: null },
  ]);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("teacher dashboard (Lane C Phase 3)", () => {
  const en = testMessages.en.TeacherHome;
  const ui = testMessages.en.TeacherUi;

  it("logs a load failure and rethrows it for the error boundary", async () => {
    const failure = new Error("db down");
    mocks.getTeacherHome.mockRejectedValue(failure);
    await expect(TeacherDashboardPage()).rejects.toBe(failure);
    expect(mocks.logError).toHaveBeenCalledWith("teacher_home.load_failed", { userId: "t1", error: failure });
  });

  it("logs a warning when a quest card fails and still shows the page", async () => {
    const failure = new Error("quest down");
    mocks.getTeacherQuestCard.mockRejectedValue(failure);
    await renderDashboard();
    expect(mocks.logWarn).toHaveBeenCalledWith("teacher_home.quest_failed", { userId: "t1", classroomId: C1, error: failure });
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("shows eight numbers with their labels in the summary", async () => {
    await renderDashboard();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Kru Ann");
    const summary = screen.getByRole("region", { name: en.summary });
    const value = (label: string) => within(summary).getByText(label).parentElement;
    expect(value(en.stats.classes)).toHaveTextContent("2");
    expect(value(en.stats.students)).toHaveTextContent("2");
    expect(value(en.stats.activeStudents)).toHaveTextContent("2");
    expect(value(en.stats.averageLevel)).toHaveTextContent("4.5");
    expect(value(en.stats.activeToday)).toHaveTextContent("1");
    expect(value(en.stats.completedToday)).toHaveTextContent("4");
    expect(value(en.stats.openAssignments)).toHaveTextContent("3");
    expect(value(en.stats.needsHelp)).toHaveTextContent("3");
  });

  it("writes the active number as n of m (p %)", async () => {
    mocks.getTeacherHome.mockResolvedValue({ ...fullHome, studentCount: 24, activeStudents30d: 21, engagementRate30d: 88 });
    await renderDashboard();
    expect(within(screen.getByRole("region", { name: en.summary })).getByText("21 of 24 (88%)")).toBeInTheDocument();
  });

  it("labels the average level as Average level, never CEFR", async () => {
    await renderDashboard();
    const summary = screen.getByRole("region", { name: en.summary });
    expect(within(summary).getByText("Average level")).toBeInTheDocument();
    expect(summary).not.toHaveTextContent(/CEFR/i);
  });

  it("shows a dash for the average level and a hint when there is no student", async () => {
    mocks.getTeacherHome.mockResolvedValue({ ...fullHome, studentCount: 0, activeStudents30d: 0, engagementRate30d: 0, averageLevel: null, activeToday: 0 });
    await renderDashboard();
    const summary = screen.getByRole("region", { name: en.summary });
    expect(within(summary).getByText(en.stats.averageLevel).parentElement).toHaveTextContent("—");
    expect(within(summary).getAllByText(en.stats.noStudentsYet).length).toBeGreaterThan(0);
  });

  it("shows every class once in the class table, with links and Start class", async () => {
    await renderDashboard();
    const classes = screen.getByRole("region", { name: en.classes.heading });
    const table = within(classes).getByRole("table", { hidden: true });
    expect(within(table).getByRole("link", { name: "P3A", hidden: true })).toHaveAttribute("href", `/teacher/class-roster/${C1}`);
    expect(within(table).getByRole("link", { name: "Start class P3A", hidden: true })).toHaveAttribute("href", `/teacher/class-roster/${C1}#class-login`);
    expect(within(table).getByRole("link", { name: "Start class P4B", hidden: true })).toHaveAttribute("href", `/teacher/class-roster/${C2}#class-login`);
    // One class list only: the card list of the old home is gone (FR-12).
    expect(screen.getAllByRole("region", { name: en.classes.heading })).toHaveLength(1);
    expect(within(classes).getAllByRole("list", { hidden: true })).toHaveLength(1);
  });

  it("lists open assignments with Bangkok due chips and progress", async () => {
    await renderDashboard();
    const open = screen.getByRole("region", { name: en.assignments.heading });
    const items = within(open).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByRole("link", { name: "Frogs" })).toHaveAttribute("href", "/teacher/assignments/a-late");
    expect(within(items[0]).getByText(ui.due.overdue)).toBeInTheDocument();
    expect(within(items[0]).getByText("1 of 2 done")).toBeInTheDocument();
    expect(within(items[1]).getByText(ui.due.today)).toBeInTheDocument();
    expect(within(items[2]).getByText(ui.due.none)).toBeInTheDocument();
    expect(within(open).getByRole("link", { name: en.assignments.all })).toHaveAttribute("href", "/teacher/assignments");
  });

  it("lists who needs help with the reason and a link to the student's progress", async () => {
    await renderDashboard();
    const help = screen.getByRole("region", { name: en.help.heading });
    expect(within(help).getByText("Students with overdue work or no activity for 7 days.")).toBeInTheDocument();
    expect(within(help).getByRole("link", { name: "Ann" })).toHaveAttribute("href", "/teacher/student-progress/s1");
    expect(within(help).getByText("1 overdue")).toBeInTheDocument();
    expect(within(help).getByText(en.help.neverActive)).toBeInTheDocument();
    expect(within(help).getByText(/Last active Sep 20/)).toBeInTheDocument();
  });

  it("shows the class book slot with the next lesson and an Assign a book row", async () => {
    await renderDashboard();
    const book = screen.getByRole("region", { name: ui.classBook.slotTitle });
    expect(within(book).getByRole("link", { name: /Origins 3.2/ })).toHaveAttribute("href", `/teacher/class-roster/${C1}/books/cb1/lessons/3`);
    expect(within(book).getByRole("link", { name: new RegExp(ui.classBook.assignRow) })).toHaveAttribute("href", `/teacher/class-roster/${C2}#class-book`);
  });

  it("shows the slot error and logs once when the slots fail to load", async () => {
    mocks.getTeacherBookSlots.mockRejectedValue(new Error("db down"));
    await renderDashboard();
    const book = screen.getByRole("region", { name: ui.classBook.slotTitle });
    expect(within(book).getByRole("alert")).toHaveTextContent(ui.classBook.slotError);
    expect(mocks.logError).toHaveBeenCalledTimes(1);
    expect(mocks.logError).toHaveBeenCalledWith("class_books.slot_failed", expect.objectContaining({ userId: "t1" }));
  });

  it("shows empty states with a next step", async () => {
    mocks.getTeacherHome.mockResolvedValue({
      classes: [],
      studentCount: 0,
      openAssignments: [],
      openAssignmentCount: 0,
      needsHelp: [],
      needsHelpCount: 0,
      activeStudents30d: 0,
      engagementRate30d: 0,
      averageLevel: null,
      activeToday: 0,
      completedToday: 0,
      classRows: [],
    });
    await renderDashboard();
    const classes = screen.getByRole("region", { name: en.classes.heading });
    expect(within(classes).getByText(en.classes.empty)).toBeInTheDocument();
    expect(within(classes).getByRole("link", { name: en.classes.goToClasses })).toHaveAttribute("href", "/teacher/my-classes");
    expect(within(screen.getByRole("region", { name: en.assignments.heading })).getByText(en.assignments.empty)).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: en.help.heading })).getByText(en.help.empty)).toBeInTheDocument();
  });

  it("says how many more students need help than the list shows", async () => {
    mocks.getTeacherHome.mockResolvedValue({ ...fullHome, needsHelpCount: 11 });
    await renderDashboard();
    const help = screen.getByRole("region", { name: en.help.heading });
    expect(within(help).getByRole("link", { name: "8 more students" })).toHaveAttribute("href", "/teacher/reports");
  });

  it("uses Thai copy for a Thai teacher", async () => {
    await renderDashboard("th");
    const th = testMessages.th.TeacherHome;
    expect(screen.getByRole("region", { name: th.classes.heading })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "เริ่มชั้นเรียน P3A", hidden: true }).length).toBeGreaterThan(0);
    expect(screen.getByText(testMessages.th.TeacherUi.due.overdue)).toBeInTheDocument();
  });

  it("gives every action a tap target of at least 44 px", async () => {
    await renderDashboard();
    for (const name of [en.assignments.all, "Frogs", "Ann"]) {
      expect(screen.getByRole("link", { name }).className).toMatch(/min-h-1[12]\b/);
    }
    const classes = screen.getByRole("region", { name: en.classes.heading });
    expect(within(classes).getAllByRole("link", { name: "P3A", hidden: true })[0]).toHaveClass("min-h-12");
  });

  it("reads the dashboard for the signed-in teacher", async () => {
    await renderDashboard();
    expect(mocks.getTeacherHome).toHaveBeenCalledWith(expect.objectContaining({ user: mocks.user }));
  });

  it("sends a signed-out visitor to sign in", async () => {
    mocks.user = null;
    await TeacherDashboardPage();
    expect(mocks.redirect).toHaveBeenCalledWith(expect.objectContaining({ href: "/auth/signin" }));
    expect(mocks.getTeacherHome).not.toHaveBeenCalled();
  });

  it("lets a load failure reach the error page, which offers a retry", async () => {
    mocks.getTeacherHome.mockRejectedValue(new Error("db down"));
    await expect(TeacherDashboardPage()).rejects.toThrow("db down");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithMessages(<TeacherDashboardError error={new Error("db down")} reset={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(en.loadError);
    expect(screen.getByRole("button", { name: testMessages.en.Error.retry })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: testMessages.en.TeacherMyClasses.page.title })).toHaveAttribute("href", "/teacher/my-classes");
    consoleError.mockRestore();
  });
});
