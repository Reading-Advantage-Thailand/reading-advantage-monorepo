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
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
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
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("teacher dashboard (Lane C Phase 3)", () => {
  const en = testMessages.en.TeacherHome;
  const ui = testMessages.en.TeacherUi;

  it("shows the summary numbers and every class with its student count and links", async () => {
    await renderDashboard();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Kru Ann");
    const summary = screen.getByRole("region", { name: en.summary });
    expect(within(summary).getByText(en.stats.classes).parentElement).toHaveTextContent("2");
    expect(within(summary).getByText(en.stats.openAssignments).parentElement).toHaveTextContent("3");
    expect(within(summary).getByText(en.stats.needsHelp).parentElement).toHaveTextContent("3");

    const classes = screen.getByRole("region", { name: en.classes.heading });
    expect(within(classes).getByRole("link", { name: "P3A" })).toHaveAttribute("href", `/teacher/class-roster/${C1}`);
    expect(within(classes).getByText("2 students")).toBeInTheDocument();
    expect(within(classes).getByText("Grade 3")).toBeInTheDocument();
    expect(within(classes).getByText("No students")).toBeInTheDocument();
    // "Start class" opens the class page at the class sign-in panel (Lane B owns the start logic).
    expect(within(classes).getByRole("link", { name: "Start class P3A" })).toHaveAttribute("href", `/teacher/class-roster/${C1}#class-login`);
    expect(within(classes).getByRole("link", { name: "Start class P4B" })).toHaveAttribute("href", `/teacher/class-roster/${C2}#class-login`);
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

  it("leaves the class book slot for the teacher-books track", async () => {
    await renderDashboard();
    const book = screen.getByRole("region", { name: ui.classBook.title });
    expect(within(book).getByText(ui.classBook.hint)).toBeInTheDocument();
  });

  it("shows empty states with a next step", async () => {
    mocks.getTeacherHome.mockResolvedValue({
      classes: [],
      studentCount: 0,
      openAssignments: [],
      openAssignmentCount: 0,
      needsHelp: [],
      needsHelpCount: 0,
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
    expect(screen.getByRole("link", { name: "เริ่มชั้นเรียน P3A" })).toBeInTheDocument();
    expect(screen.getByText(testMessages.th.TeacherUi.due.overdue)).toBeInTheDocument();
  });

  it("gives every action a tap target of at least 44 px", async () => {
    await renderDashboard();
    for (const name of ["Start class P3A", en.assignments.all, "Frogs", "Ann", "P3A"]) {
      expect(screen.getByRole("link", { name })).toHaveClass("min-h-11");
    }
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
