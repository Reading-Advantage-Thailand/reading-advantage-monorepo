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
  getStudentClassBooks: vi.fn(async (): Promise<unknown[]> => []),
  getAvatarProfile: vi.fn(async (): Promise<unknown> => null),
  getStudentQuestCard: vi.fn(async (): Promise<unknown> => null),
  getVoiceEntitlement: vi.fn(async (): Promise<unknown> => ({ remainingSeconds: 300, budgetSeconds: 480, blockedBy: null })),
  leaderboard: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user, getCurrentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-home", () => ({ getStudentHome: mocks.getStudentHome }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ getStudentClassBooks: mocks.getStudentClassBooks }));
// The home reads the avatar state (profile plus the worn pieces) for the hero portrait.
vi.mock("@reading-advantage/domain/primary-avatar", () => ({
  getAvatarProfile: mocks.getAvatarProfile,
  getAvatarState: async () => {
    const profile = await mocks.getAvatarProfile();
    return { profile, gp: 0, level: 1, catalogVersion: "1.0.0", inventory: [], loadout: {} };
  },
}));
vi.mock("@reading-advantage/domain/primary-quest", () => ({ awardPowerUps: async () => [], getStudentQuestCard: mocks.getStudentQuestCard }));
vi.mock("@reading-advantage/domain/primary-voice", () => ({ getVoiceEntitlement: mocks.getVoiceEntitlement, voiceConfigFromEnv: () => ({}) }));
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

describe("student home due chip (Phase 2 review item 2: calendar days in Bangkok)", () => {
  const en = testMessages.en.StudentHome;
  /** The teacher calendar stores midnight of the chosen day: 7 October in Bangkok. */
  const dueMidnight = new Date("2026-10-07T00:00:00+07:00");

  afterEach(() => vi.useRealTimers());

  it.each([
    ["at 10:00 on the due day", "2026-10-07T10:00:00+07:00", false],
    ["at 23:59 on the due day", "2026-10-07T23:59:00+07:00", false],
    ["one day later", "2026-10-08T00:01:00+07:00", true],
  ])("shows Late only after the due day (%s)", async (_label, now, late) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(now));
    mocks.getStudentHome.mockResolvedValue({ ...fullHome, todayLesson: { ...fullHome.todayLesson, dueDate: dueMidnight } });
    await renderHome();
    const lesson = screen.getByRole("region", { name: en.todayLesson });
    expect(within(lesson).queryByText(en.overdue) !== null).toBe(late);
  });
});

describe("student home class books (teacher-books FR-4)", () => {
  const en = testMessages.en.StudentHome;
  const CB = "cbcbcbcb-0000-4000-8000-000000000001";
  const classBook = {
    classBookId: CB,
    classroomId: "c1",
    bookKey: "o3-2",
    bookName: "Primary Advantage Origins 3.2",
    mode: "teacher_led",
    currentLesson: 3,
    lessonCount: 14,
    lesson: { number: 3, title: "Teacher Says", key: "o3-2/3", articleId: "a3", unlockedAppSteps: [1, 2] },
  };

  it("shows the class book with the current lesson and keeps reading locked until the teacher opens step 3", async () => {
    mocks.getStudentClassBooks.mockResolvedValueOnce([classBook]);
    await renderHome();
    const card = screen.getByRole("region", { name: en.classBook });
    expect(within(card).getByText("Primary Advantage Origins 3.2")).toBeInTheDocument();
    expect(within(card).getByText("Lesson 3: Teacher Says")).toBeInTheDocument();
    expect(within(card).getByText(en.classBookLocked)).toBeInTheDocument();
    expect(within(card).queryByRole("link", { name: en.readLesson })).not.toBeInTheDocument();
    expect(within(card).getByRole("link", { name: en.seeBook })).toHaveAttribute("href", `/student/books/${CB}`);
  });

  it("links the lesson article once the reading step is open", async () => {
    mocks.getStudentClassBooks.mockResolvedValueOnce([{ ...classBook, lesson: { ...classBook.lesson, unlockedAppSteps: [1, 2, 3] } }]);
    await renderHome();
    const card = screen.getByRole("region", { name: en.classBook });
    expect(within(card).getByRole("link", { name: en.readLesson })).toHaveAttribute("href", "/student/lesson/a3?type=article");
  });

  it("says the next lesson is coming when the catalogue has no current lesson, and hides the card when the read fails", async () => {
    mocks.getStudentClassBooks.mockResolvedValueOnce([{ ...classBook, lesson: null }]);
    await renderHome();
    expect(within(screen.getByRole("region", { name: en.classBook })).getByText(en.classBookNoLesson)).toBeInTheDocument();
    cleanup();
    mocks.getStudentClassBooks.mockRejectedValueOnce(new Error("down"));
    await renderHome();
    expect(screen.queryByRole("region", { name: en.classBook })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: en.continueReading })).toBeInTheDocument();
  });
});

describe("student home avatar nudge (reedy FR-10b)", () => {
  it("shows the nudge with a link to the picker for a student with no avatar", async () => {
    mocks.getAvatarProfile.mockResolvedValue(null);
    renderWithMessages(await StudentHomePage(), { locale: "en" });
    const nudge = screen.getByRole("status");
    expect(nudge).toHaveTextContent("Make your avatar!");
    expect(within(nudge).getByRole("link", { name: "Make my avatar" })).toHaveAttribute("href", "/student/avatar");
  });

  it("hides the nudge once an avatar is saved, and when the read fails", async () => {
    mocks.getAvatarProfile.mockResolvedValue({ classId: "knight", tints: {}, catalogVersion: "1.0.0", updatedAt: "2026-10-05T00:00:00.000Z" });
    renderWithMessages(await StudentHomePage(), { locale: "en" });
    expect(screen.queryByText("Make your avatar!")).not.toBeInTheDocument();
    cleanup();
    mocks.getAvatarProfile.mockRejectedValue(new Error("down"));
    renderWithMessages(await StudentHomePage(), { locale: "th" });
    expect(screen.queryByText("สร้างอวตารของคุณ!")).not.toBeInTheDocument();
  });
});

describe("student home Reedy meter (reedy FR-9)", () => {
  it("shows the minutes left this month with a link to Reedy", async () => {
    renderWithMessages(await StudentHomePage(), { locale: "en" });
    const meter = screen.getByRole("progressbar", { name: "Reedy minutes" });
    expect(meter).toHaveAttribute("aria-valuenow", "300");
    expect(screen.getByText("5:00 left this month")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Talk to Reedy" })).toHaveAttribute("href", "/student/reedy");
  });

  it("says why Reedy is closed and hides the meter when the read fails", async () => {
    mocks.getVoiceEntitlement.mockResolvedValueOnce({ remainingSeconds: 0, budgetSeconds: 480, blockedBy: "QUOTA_EXHAUSTED" });
    mocks.locale = "th";
    renderWithMessages(await StudentHomePage(), { locale: "th" });
    expect(screen.getByText("นาทีคุยกับรีดี้ของเดือนนี้หมดแล้ว เดือนหน้าได้นาทีใหม่นะ")).toBeInTheDocument();
    cleanup();
    mocks.getVoiceEntitlement.mockRejectedValueOnce(new Error("down"));
    mocks.locale = "en";
    renderWithMessages(await StudentHomePage(), { locale: "en" });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
