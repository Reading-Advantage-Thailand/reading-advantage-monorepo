// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createFormatter, createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, type AnyTestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  locale: "en" as AnyTestLocale,
  user: null as Record<string, unknown> | null,
  getPlatformOverview: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", async (importActual) => ({ ...(await importActual<typeof import("@reading-advantage/db")>()), db: {} }));
vi.mock("@reading-advantage/domain/primary-dashboards", async (importActual) => ({
  ...(await importActual<typeof import("@reading-advantage/domain/primary-dashboards")>()),
  getPlatformOverview: mocks.getPlatformOverview,
}));
vi.mock("next-intl/server", async () => {
  const { allMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => mocks.locale,
    getTranslations: async (namespace?: string) =>
      createTranslator({ locale: mocks.locale, messages: messages[mocks.locale], namespace: namespace as never }),
    getFormatter: async (opts?: { locale?: string }) => createFormatter({ locale: opts?.locale ?? mocks.locale, timeZone: "Asia/Bangkok" }),
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

import SystemDashboardPage from "../page";
import SystemDashboardError from "../error";
import { platformOverviewSchema } from "@reading-advantage/domain/primary-dashboards";

const system = { id: "u2", username: "root", name: "Root", role: "SYSTEM", schoolId: null };
const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

/** Builds the output of `getPlatformOverview` (parsed through the real contract). */
function overview(over: Record<string, unknown> = {}) {
  return platformOverviewSchema.parse({
    startDay: "2026-10-06",
    endDay: "2026-10-12",
    totals: { schools: 2, students: 300, teachers: 31, activeStudents: 120, articlesOpened: 1234, seatsUsed: 240, seats: 250, studentsWithoutSchool: 0 },
    schools: [
      { id: ID_A, name: "Hilltop School", students: 60, activeStudents: 0, activePercent: 0, articlesOpened: 0, seatsUsed: 60, seats: null, lastActivityAt: null, lastActivityDay: null, status: "quiet" },
      { id: ID_B, name: "Bluebell School", students: 240, activeStudents: 120, activePercent: 50, articlesOpened: 1234, seatsUsed: 240, seats: 250, lastActivityAt: "2026-10-12T05:00:00.000Z", lastActivityDay: "2026-10-12", status: "active" },
    ],
    ...over,
  });
}

/** Renders the page through the real message tree. */
async function renderPage(locale: AnyTestLocale = "en") {
  mocks.locale = locale;
  renderWithMessages((await SystemDashboardPage()) as React.ReactElement, { locale });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { ...system };
  mocks.getPlatformOverview.mockResolvedValue(overview());
});
afterEach(cleanup);

describe("system dashboard page", () => {
  const t = testMessages.en.SystemDashboard;

  it("shows the title and the week in Bangkok days", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(t.title);
    expect(screen.getByText("This week: Oct 6 to Oct 12")).toBeInTheDocument();
  });

  it("writes the week with a Chinese date for cn and tw", async () => {
    await renderPage("cn");
    expect(screen.getByRole("heading", { level: 1 }).parentElement).toHaveTextContent("10月6日");
    cleanup();
    await renderPage("tw");
    expect(screen.getByRole("heading", { level: 1 }).parentElement).toHaveTextContent("10月6日");
  });

  it("shows the six totals with labels that name the metric", async () => {
    await renderPage();
    const panel = screen.getByRole("region", { name: t.totals.heading });
    for (const [label, value] of [
      [t.totals.schools, "2"],
      [t.totals.students, "300"],
      [t.totals.teachers, "31"],
      [t.totals.active, "120"],
      [t.totals.articles, "1,234"],
      [t.totals.seatsUsed, "240"],
    ]) {
      expect(within(panel).getByText(label).parentElement).toHaveTextContent(value);
    }
    expect(within(panel).getByText("120 of 300 (40%)")).toBeInTheDocument();
    expect(within(panel).getByText("of 250 seats")).toBeInTheDocument();
  });

  it("shows the count of students without a school only when it is more than 0", async () => {
    await renderPage();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    cleanup();
    mocks.getPlatformOverview.mockResolvedValue(overview({ totals: { ...overview().totals, studentsWithoutSchool: 12 } }));
    await renderPage();
    expect(screen.getByRole("note")).toHaveTextContent("12 students have no school");
  });

  it("shows No license when no school has seats", async () => {
    mocks.getPlatformOverview.mockResolvedValue(overview({ totals: { ...overview().totals, seatsUsed: 0, seats: 0 } }));
    await renderPage();
    const panel = screen.getByRole("region", { name: t.totals.heading });
    expect(within(panel).getByText(t.totals.noLicense)).toBeInTheDocument();
  });

  it("shows the schools table in the order of the domain and no placeholder text", async () => {
    await renderPage();
    const table = screen.getByRole("region", { name: t.table.heading });
    expect(within(table).getAllByRole("rowheader", { hidden: true }).map((cell) => cell.textContent)).toEqual(["Hilltop School", "Bluebell School"]);
    expect(screen.queryByText(/System Dashboard Description/i)).not.toBeInTheDocument();
  });

  it("shows the empty state and no totals for a platform with no school", async () => {
    mocks.getPlatformOverview.mockResolvedValue(
      overview({ totals: { schools: 0, students: 0, teachers: 0, activeStudents: 0, articlesOpened: 0, seatsUsed: 0, seats: 0, studentsWithoutSchool: 0 }, schools: [] }),
    );
    await renderPage();
    expect(screen.getByText(t.table.empty)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: t.totals.heading })).not.toBeInTheDocument();
  });

  it("renders in Thai with the same structure", async () => {
    await renderPage("th");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(testMessages.th.SystemDashboard.title);
    expect(screen.getByRole("region", { name: testMessages.th.SystemDashboard.totals.heading })).toBeInTheDocument();
  });

  it("logs and rethrows a load failure for the error boundary", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getPlatformOverview.mockRejectedValue(new Error("db down"));
    await expect(renderPage()).rejects.toThrow("db down");
    expect(JSON.parse(String(spy.mock.calls[0]?.[0]))).toMatchObject({ event: "system_dashboard_failed", userId: "u2" });
    spy.mockRestore();
  });

  it("redirects a visitor with no session to sign-in", async () => {
    mocks.user = null;
    await renderPage();
    expect(mocks.redirect).toHaveBeenCalledWith(expect.objectContaining({ href: "/auth/signin" }));
    expect(mocks.getPlatformOverview).not.toHaveBeenCalled();
  });
});

describe("system dashboard error boundary", () => {
  it("offers a retry", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithMessages(<SystemDashboardError error={new Error("x")} reset={vi.fn()} />);
    expect(screen.getByText(testMessages.en.SystemDashboard.loadError)).toBeInTheDocument();
    spy.mockRestore();
  });
});
