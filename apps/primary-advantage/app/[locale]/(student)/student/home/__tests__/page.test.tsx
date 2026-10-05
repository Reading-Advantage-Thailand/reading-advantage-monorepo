// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createFormatter, createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  locale: "en" as "en" | "th",
  user: { id: "s1", username: "ann", name: "Ann", role: "STUDENT", schoolId: "school-1", xp: 0, level: 1, cefrLevel: "A1" } as Record<
    string,
    unknown
  > | null,
  getStudentHome: vi.fn(),
  leaderboard: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user, getCurrentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-home", () => ({ getStudentHome: mocks.getStudentHome }));
vi.mock("@/server/controllers/schoolController", () => ({ getSchoolLeaderboardController: mocks.leaderboard }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => mocks.locale,
    getTranslations: async (namespace?: string) =>
      createTranslator({ locale: mocks.locale, messages: messages[mocks.locale as TestLocale], namespace: namespace as never }),
    getFormatter: async () => createFormatter({ locale: mocks.locale, timeZone: "UTC" }),
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

import StudentHomePage from "../page";

const A2 = "a2a2a2a2-0000-4000-8000-000000000002";
const fullHome = {
  xp: 1250,
  level: 3,
  cefrLevel: "A2",
  streakDays: 4,
  todayLesson: { assignmentId: "as-1", title: "Frogs in the pond", dueDate: new Date("2099-10-07T00:00:00Z"), started: false },
  continueReading: { articleId: A2, title: "The Moon", cefrLevel: "A1", raLevel: 2, lastReadAt: new Date("2026-10-04T09:00:00Z") },
};

/**
 * Renders the home page through the real message tree.
 * @param locale The UI locale.
 */
async function renderHome(locale: TestLocale = "en") {
  mocks.locale = locale;
  renderWithMessages((await StudentHomePage()) as React.ReactElement, { locale });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} })) as never;
  mocks.user = { id: "s1", username: "ann", name: "Ann", role: "STUDENT", schoolId: "school-1", xp: 0, level: 1, cefrLevel: "A1" };
  mocks.getStudentHome.mockResolvedValue(fullHome);
  mocks.leaderboard.mockResolvedValue({
    success: true,
    data: { schoolName: "Wat School", results: [{ rank: 1, name: "Ann Lee", xp: 1250, classroom: "P3A", userId: "s1" }] },
  });
});
afterEach(cleanup);

describe("student home (FR-4)", () => {
  const en = testMessages.en.StudentHome;

  it("shows streak, XP, today's lesson, continue reading, games, and the leaderboard", async () => {
    await renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ann");
    expect(screen.getByText("4 days")).toBeInTheDocument();
    expect(screen.getAllByText("1,250").length).toBeGreaterThan(0);

    const lesson = screen.getByRole("region", { name: en.todayLesson });
    expect(within(lesson).getByText("Frogs in the pond")).toBeInTheDocument();
    expect(within(lesson).getByRole("link", { name: en.startLesson })).toHaveAttribute("href", "/student/lesson/as-1");

    const reading = screen.getByRole("region", { name: en.continueReading });
    expect(within(reading).getByText("The Moon")).toBeInTheDocument();
    expect(within(reading).getByRole("link", { name: en.keepReading })).toHaveAttribute("href", `/student/read/${A2}`);

    expect(screen.getByRole("link", { name: en.playGames })).toHaveAttribute("href", "/student/games");
    expect(screen.getByRole("region", { name: testMessages.en.Leaderboard.title })).toBeInTheDocument();
    expect(mocks.getStudentHome).toHaveBeenCalledWith(expect.objectContaining({ user: mocks.user }));
  });

  it("hides today's lesson when there is no open assignment and offers a story when nothing is in progress", async () => {
    mocks.getStudentHome.mockResolvedValue({ ...fullHome, todayLesson: null, continueReading: null, streakDays: 0 });
    await renderHome();
    expect(screen.queryByRole("region", { name: en.todayLesson })).not.toBeInTheDocument();
    const reading = screen.getByRole("region", { name: en.continueReading });
    expect(within(reading).getByText(en.noReading)).toBeInTheDocument();
    expect(within(reading).getByRole("link", { name: en.findStory })).toHaveAttribute("href", "/student/read");
  });

  it("shows the date for a due date and says when there is none", async () => {
    await renderHome();
    expect(screen.getByRole("region", { name: en.todayLesson })).toHaveTextContent(/Oct/);
    cleanup();
    mocks.getStudentHome.mockResolvedValue({ ...fullHome, todayLesson: { ...fullHome.todayLesson, dueDate: null, started: true } });
    await renderHome();
    const lesson = screen.getByRole("region", { name: en.todayLesson });
    expect(within(lesson).getByText(en.noDueDate)).toBeInTheDocument();
    expect(within(lesson).getByRole("link", { name: en.continueLesson })).toBeInTheDocument();
  });

  it("still shows the home when the leaderboard fails", async () => {
    mocks.leaderboard.mockRejectedValue(new Error("db down"));
    await renderHome();
    expect(screen.getByRole("region", { name: en.continueReading })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: testMessages.en.Leaderboard.title })).not.toBeInTheDocument();
  });

  it("uses Thai copy for a Thai student", async () => {
    await renderHome("th");
    const th = testMessages.th.StudentHome;
    expect(screen.getByRole("region", { name: th.todayLesson })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: th.playGames })).toBeInTheDocument();
  });

  it("gives every action a tap target of at least 48 px", async () => {
    await renderHome();
    for (const name of [en.startLesson, en.keepReading, en.playGames]) {
      expect(screen.getByRole("link", { name })).toHaveClass("min-h-12");
    }
  });

  it("sends a signed-out visitor to sign in", async () => {
    mocks.user = null;
    await StudentHomePage();
    expect(mocks.redirect).toHaveBeenCalledWith(expect.objectContaining({ href: "/auth/signin" }));
    expect(mocks.getStudentHome).not.toHaveBeenCalled();
  });
});
