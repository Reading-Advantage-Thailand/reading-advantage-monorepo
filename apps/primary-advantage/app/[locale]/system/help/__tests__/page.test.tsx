// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages, type AnyTestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  locale: "en" as AnyTestLocale,
  user: null as Record<string, unknown> | null,
  helpEventReport: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-help", () => ({ helpEventReport: mocks.helpEventReport }));
vi.mock("next-intl/server", async () => {
  const { allMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => mocks.locale,
    getTranslations: async (namespace?: string) => createTranslator({ locale: mocks.locale, messages: messages[mocks.locale], namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({
  redirect: mocks.redirect,
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}));

import SystemHelpPage from "../page";

const SCHOOL = "11111111-1111-4111-8111-111111111111";
const system = { id: "u2", username: "root", name: "Root", role: "SYSTEM", schoolId: null };
const report = {
  plays: [{ videoId: "B4", role: "TEACHER", source: "youtube", last7: 2, last30: 5 }],
  opens: [{ routePattern: "/teacher/class-roster/[id]", last7: 3, last30: 9 }],
  unmatched: [],
  schools: [{ id: SCHOOL, name: "Boonyathat" }],
};

/** Renders the page through the real message tree. */
async function renderPage(school?: string, locale: AnyTestLocale = "en") {
  mocks.locale = locale;
  renderWithMessages((await SystemHelpPage({ searchParams: Promise.resolve({ school }) })) as React.ReactElement, { locale });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.locale = "en";
  mocks.user = { ...system };
  mocks.helpEventReport.mockResolvedValue(report);
});
afterEach(cleanup);

describe("system help report page (FR-12)", () => {
  it("shows plays per video and role, opens per page, and the empty no-video table", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Help video report" })).toBeInTheDocument();
    const plays = screen.getByRole("region", { name: "Plays per video" });
    expect(within(plays).getByRole("rowheader")).toHaveTextContent("B4 · Print the class sheet and QR cards");
    expect(within(plays).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Teacher", "YouTube", "2", "5"]);
    expect(within(screen.getByRole("region", { name: "Opens per page" })).getByRole("rowheader")).toHaveTextContent("/teacher/class-roster/[id]");
    expect(within(screen.getByRole("region", { name: "Pages with no video" })).getByText("Every page where help opened has a video.")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Boonyathat" })).toHaveValue(SCHOOL);
  });

  it("passes a valid school id to the report and drops a bad one", async () => {
    await renderPage(SCHOOL);
    expect(mocks.helpEventReport).toHaveBeenCalledWith({ db: {}, user: mocks.user, input: { schoolId: SCHOOL } });
    cleanup();
    await renderPage("x' or 1=1");
    expect(mocks.helpEventReport).toHaveBeenLastCalledWith({ db: {}, user: mocks.user, input: { schoolId: undefined } });
  });

  it("shows the Thai titles and role names in Thai", async () => {
    await renderPage(undefined, "th");
    const plays = screen.getByRole("region", { name: "จำนวนการเล่นต่อวิดีโอ" });
    expect(within(plays).getByRole("rowheader")).toHaveTextContent("B4 · พิมพ์ใบรายชื่อชั้นเรียนและบัตร QR");
    expect(within(plays).getAllByRole("cell")[0]).toHaveTextContent("ครู");
  });

  it("gives a teacher no report (AC-8)", async () => {
    mocks.user = { ...system, role: "TEACHER", schoolId: SCHOOL };
    mocks.helpEventReport.mockRejectedValue(Object.assign(new Error("no"), { code: "FORBIDDEN" }));
    await expect(SystemHelpPage({ searchParams: Promise.resolve({}) })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("sends a signed-out visitor to the sign-in page", async () => {
    mocks.user = null;
    await SystemHelpPage({ searchParams: Promise.resolve({}) });
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/auth/signin", locale: "en" });
    expect(mocks.helpEventReport).not.toHaveBeenCalled();
  });
});
