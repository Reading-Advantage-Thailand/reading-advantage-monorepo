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
  schools: [] as Array<{ id: string }>,
  getSchoolDashboard: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", async (importActual) => ({
  ...(await importActual<typeof import("@reading-advantage/db")>()),
  db: { select: () => ({ from: () => ({ where: () => ({ limit: async () => mocks.schools }) }) }) },
}));
vi.mock("@reading-advantage/domain/primary-dashboards", async (importActual) => ({
  ...(await importActual<typeof import("@reading-advantage/domain/primary-dashboards")>()),
  getSchoolDashboard: mocks.getSchoolDashboard,
}));
vi.mock("@/components/admin/dashboard/school-picker", () => ({
  SchoolPicker: ({ value }: { value: string }) => <div data-testid="school-picker" data-value={value}>School</div>,
}));
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
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import AdminDashboardPage from "../page";
import AdminDashboardError from "../error";
import { schoolDashboardSchema } from "@reading-advantage/domain/primary-dashboards";

const SCHOOL = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const admin = { id: "u1", username: "admin1", name: "Ann", role: "ADMIN", schoolId: SCHOOL };
const system = { id: "u2", username: "root", name: "Root", role: "SYSTEM", schoolId: null };

/** Builds the output of `getSchoolDashboard` (parsed through the real contract). */
function dashboard(over: Record<string, unknown> = {}) {
  const days = Array.from({ length: 30 }, (_, i) => ({ day: `2026-09-${String(i + 1).padStart(2, "0")}`, activeStudents: i % 5 }));
  return schoolDashboardSchema.parse({
    schoolId: SCHOOL,
    range: 30,
    startDay: "2026-09-01",
    endDay: "2026-09-30",
    kpis: {
      activeStudents: { active: 120, total: 200, percent: 60 },
      activeTeachers: { active: 7, total: 9 },
      classesWithActivity: { active: 8, total: 10 },
      articlesOpened: 1234,
      xpEarned: 56789,
      newStudents: 15,
    },
    adoptionByCefr: [{ key: "A1", students: 100, active: 70, percent: 70, averageXp: 250 }],
    adoptionByGrade: [{ key: "4", students: 60, active: 30, percent: 50, averageXp: 300 }, { key: "none", students: 5, active: 0, percent: 0, averageXp: 0 }],
    alerts: [{ code: "seats-nearly-full", severity: "high", values: { seatsUsed: 190, seats: 200, percent: 95 } }],
    teachers: [
      { teacherId: "t1", name: "Kru Ann", classes: 2, students: 40, active: 30, engagementPercent: 75 },
      { teacherId: "t2", name: null, classes: 0, students: 0, active: 0, engagementPercent: null },
    ],
    activityByDay: { days, totalEvents: 4321, peakDay: days[4], dailyAverage: 2 },
    ...over,
  });
}

const emptyDashboard = () =>
  dashboard({
    kpis: { activeStudents: { active: 0, total: 0, percent: null }, activeTeachers: { active: 0, total: 0 }, classesWithActivity: { active: 0, total: 0 }, articlesOpened: 0, xpEarned: 0, newStudents: 0 },
    adoptionByCefr: [],
    adoptionByGrade: [],
    alerts: [],
    teachers: [],
    activityByDay: { days: [], totalEvents: 0, peakDay: null, dailyAverage: 0 },
  });

/**
 * Renders the page through the real message tree.
 * @param search The URL values.
 * @param locale The UI locale.
 */
async function renderPage(search: Record<string, string | string[]> = {}, locale: TestLocale = "en") {
  mocks.locale = locale;
  renderWithMessages((await AdminDashboardPage({ searchParams: Promise.resolve(search) })) as React.ReactElement, { locale });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { ...admin };
  mocks.schools = [{ id: OTHER }];
  mocks.getSchoolDashboard.mockResolvedValue(dashboard());
});
afterEach(cleanup);

describe("school admin dashboard", () => {
  const t = testMessages.en.AdminDashboard;

  it("shows the six key numbers with labels that name the metric", async () => {
    await renderPage();
    const panel = screen.getByRole("region", { name: t.keyNumbers.heading });
    for (const [label, value] of [
      [t.keyNumbers.activeStudents, "120"],
      [t.keyNumbers.activeTeachers, "7"],
      [t.keyNumbers.classes, "8"],
      [t.keyNumbers.articles, "1,234"],
      [t.keyNumbers.xp, "56,789"],
      [t.keyNumbers.newStudents, "15"],
    ]) {
      expect(within(panel).getByText(label).parentElement).toHaveTextContent(value);
    }
    expect(within(panel).getByText("of 200 students (60%)")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(t.title);
  });

  it("passes the range of the URL and gives 30 for an unknown range", async () => {
    await renderPage({ range: "7" });
    expect(mocks.getSchoolDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ input: { schoolId: SCHOOL, range: 7 } }));
    cleanup();
    await renderPage({ range: "11" });
    expect(mocks.getSchoolDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ input: { schoolId: SCHOOL, range: 30 } }));
    cleanup();
    await renderPage({ range: ["7", "90"] });
    expect(mocks.getSchoolDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ input: { schoolId: SCHOOL, range: 30 } }));
  });

  it("marks the open range and keeps the adoption view in the range links", async () => {
    mocks.getSchoolDashboard.mockResolvedValue(dashboard({ range: 90 }));
    await renderPage({ range: "90", by: "grade" });
    const signs = screen.getByRole("navigation", { name: t.rangeLabel });
    expect(within(signs).getByRole("link", { name: "90 days" })).toHaveAttribute("aria-current", "true");
    expect(within(signs).getByRole("link", { name: "7 days" })).toHaveAttribute("href", "/admin/dashboard?range=7&by=grade");
    expect(within(signs).getByRole("link", { name: "30 days" })).toHaveAttribute("href", "/admin/dashboard?by=grade");
  });

  it("shows the alerts, the adoption rows, the teachers, and one cell for each day", async () => {
    await renderPage();
    const alerts = screen.getByRole("region", { name: t.alerts.heading });
    expect(within(alerts).getByText("Seats are nearly full: 190 of 200 used (95%)")).toBeInTheDocument();
    expect(within(alerts).getByText(t.alerts.severity.high)).toBeInTheDocument();

    const adoption = screen.getByRole("region", { name: t.adoption.heading });
    expect(within(adoption).getByRole("rowheader", { name: "A1" })).toBeInTheDocument();
    expect(within(adoption).getByRole("link", { name: t.adoption.byGrade })).toHaveAttribute("href", "/admin/dashboard?by=grade");

    const teachers = screen.getByRole("region", { name: t.teachers.heading });
    expect(within(teachers).getByText("Kru Ann")).toBeInTheDocument();
    expect(within(teachers).getByText(t.teachers.noStudents)).toBeInTheDocument();
    expect(within(teachers).getByText(t.teachers.unnamed, { exact: false })).toBeInTheDocument();

    const activity = screen.getByRole("region", { name: t.activity.heading });
    const cells = within(activity).getAllByRole("cell");
    expect(cells).toHaveLength(30);
    expect(cells[29]).toHaveAttribute("data-today", "true");
    expect(within(activity).getByText("4,321")).toBeInTheDocument();
  });

  it("shows the grade rows, with a label for students without a class", async () => {
    await renderPage({ by: "grade" });
    const adoption = screen.getByRole("region", { name: t.adoption.heading });
    expect(within(adoption).getByRole("rowheader", { name: "4" })).toBeInTheDocument();
    expect(within(adoption).getByRole("rowheader", { name: t.adoption.noGrade })).toBeInTheDocument();
  });

  it("shows an empty state in each panel for an empty school, with no zero key numbers", async () => {
    mocks.getSchoolDashboard.mockResolvedValue(emptyDashboard());
    await renderPage();
    const key = screen.getByRole("region", { name: t.keyNumbers.heading });
    expect(within(key).getByText(t.keyNumbers.empty)).toBeInTheDocument();
    expect(within(key).queryByText(t.keyNumbers.activeStudents)).not.toBeInTheDocument();
    expect(screen.getByText(t.alerts.noneEmpty)).toBeInTheDocument();
    expect(screen.getByText(t.teachers.empty)).toBeInTheDocument();
    expect(screen.getByText(t.activity.empty)).toBeInTheDocument();
    expect(screen.queryAllByRole("cell")).toHaveLength(0);
  });

  it("shows no placeholder text and no sample number", async () => {
    await renderPage();
    expect(screen.queryByText(/Data unavailable/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/from last week/i)).not.toBeInTheDocument();
    expect(screen.queryByText("+12%")).not.toBeInTheDocument();
  });

  it("renders in Thai with the same structure", async () => {
    await renderPage({}, "th");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(testMessages.th.AdminDashboard.title);
    expect(screen.getByRole("region", { name: testMessages.th.AdminDashboard.keyNumbers.heading })).toBeInTheDocument();
  });

  it("logs and rethrows a load failure for the error boundary", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getSchoolDashboard.mockRejectedValue(new Error("db down"));
    await expect(renderPage()).rejects.toThrow("db down");
    expect(JSON.parse(String(spy.mock.calls[0]?.[0]))).toMatchObject({ event: "admin_dashboard_failed", schoolId: SCHOOL });
    spy.mockRestore();
  });

  it("redirects a visitor with no session to sign-in", async () => {
    mocks.user = null;
    await renderPage();
    expect(mocks.redirect).toHaveBeenCalledWith(expect.objectContaining({ href: "/auth/signin" }));
    expect(mocks.getSchoolDashboard).not.toHaveBeenCalled();
  });
});

describe("school choice (SYS-03, FR-10)", () => {
  const t = testMessages.en.AdminDashboard;

  it("ADMIN ignores the school of the URL and gets the session school, with no selector", async () => {
    await renderPage({ school: OTHER });
    expect(mocks.getSchoolDashboard).toHaveBeenCalledWith(expect.objectContaining({ input: { schoolId: SCHOOL, range: 30 } }));
    expect(screen.queryByTestId("school-picker")).not.toBeInTheDocument();
  });

  it("SYSTEM without a school sees the selector and Choose a school, and no query runs", async () => {
    mocks.user = { ...system };
    await renderPage();
    expect(screen.getByTestId("school-picker")).toHaveAttribute("data-value", "");
    expect(screen.getByRole("heading", { name: t.chooseSchool })).toBeInTheDocument();
    expect(mocks.getSchoolDashboard).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: t.keyNumbers.heading })).not.toBeInTheDocument();
  });

  it("SYSTEM with a session school but no ?school= sees the selector and no numbers (AC-4)", async () => {
    mocks.user = { ...system, schoolId: SCHOOL };
    await renderPage();
    expect(screen.getByTestId("school-picker")).toHaveAttribute("data-value", "");
    expect(screen.getByRole("heading", { name: t.chooseSchool })).toBeInTheDocument();
    expect(mocks.getSchoolDashboard).not.toHaveBeenCalled();
  });

  it("ADMIN with a session school gets that school and the query runs", async () => {
    await renderPage();
    expect(mocks.getSchoolDashboard).toHaveBeenCalledWith(expect.objectContaining({ input: { schoolId: SCHOOL, range: 30 } }));
  });

  it("SYSTEM with an unknown or invalid school id sees Choose a school", async () => {
    mocks.user = { ...system };
    mocks.schools = [];
    await renderPage({ school: OTHER });
    expect(screen.getByRole("heading", { name: t.chooseSchool })).toBeInTheDocument();
    cleanup();
    await renderPage({ school: "not-a-uuid" });
    expect(screen.getByRole("heading", { name: t.chooseSchool })).toBeInTheDocument();
    expect(mocks.getSchoolDashboard).not.toHaveBeenCalled();
  });

  it("SYSTEM with a school gets that school, and a range change keeps the school", async () => {
    mocks.user = { ...system };
    await renderPage({ school: OTHER, range: "7" });
    expect(mocks.getSchoolDashboard).toHaveBeenCalledWith(expect.objectContaining({ input: { schoolId: OTHER, range: 7 } }));
    expect(screen.getByTestId("school-picker")).toHaveAttribute("data-value", OTHER);
    const signs = screen.getByRole("navigation", { name: t.rangeLabel });
    expect(within(signs).getByRole("link", { name: "90 days" })).toHaveAttribute("href", `/admin/dashboard?range=90&school=${OTHER}`);
  });
});

describe("dashboard error boundary", () => {
  it("offers a retry", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();
    renderWithMessages(<AdminDashboardError error={new Error("x")} reset={reset} />);
    expect(screen.getByText(testMessages.en.AdminDashboard.loadError)).toBeInTheDocument();
    spy.mockRestore();
  });
});
