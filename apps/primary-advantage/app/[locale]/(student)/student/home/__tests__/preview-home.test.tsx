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
  awardPowerUps: vi.fn(async (): Promise<unknown[]> => []),
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
vi.mock("@reading-advantage/domain/primary-quest", () => ({ awardPowerUps: mocks.awardPowerUps, getStudentQuestCard: mocks.getStudentQuestCard }));
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


/**
 * Renders the home page for a staff member through the real message tree.
 * @param role The staff role.
 * @param schoolId The school of the staff member, or null.
 */
async function renderPreviewHome(role = "TEACHER", schoolId: string | null = "school-1") {
  mocks.user = { id: "t1", username: "kru", name: "Kru Nok", role, schoolId, xp: 900, level: 7, cefrLevel: "B1" };
  renderWithMessages((await StudentHomePage()) as React.ReactElement, { locale: "en" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.locale = "en";
  window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} })) as never;
  mocks.leaderboard.mockResolvedValue({
    success: true,
    data: { schoolName: "Wat School", results: [{ rank: 1, name: "Ann Lee", xp: 1250, classroom: "P3A", userId: "s1" }] },
  });
});
afterEach(cleanup);

describe("student home in Preview mode (S3)", () => {
  const en = testMessages.en;

  it.each(["TEACHER", "ADMIN", "SYSTEM"])("%s sees the default hero, zero XP, empty notices, and the school leaderboard", async (role) => {
    await renderPreviewHome(role);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en.StudentView.homeHeroTitle);
    expect(screen.getByText("No streak yet")).toBeInTheDocument();
    expect(screen.queryByText("900")).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: en.StudentHome.progress })).getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByText(en.StudentView.emptyLesson)).toBeInTheDocument();
    expect(screen.getByText(en.StudentView.emptyBooks)).toBeInTheDocument();
    expect(screen.getByText(en.StudentView.emptyReading)).toBeInTheDocument();
    expect(screen.getByText(en.StudentView.emptyQuest)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: en.Leaderboard.title })).toBeInTheDocument();
  });

  it("reads no student record: no home, no books, no quest, no power-ups, no Reedy minutes, no avatar", async () => {
    await renderPreviewHome();
    expect(mocks.getStudentHome).not.toHaveBeenCalled();
    expect(mocks.getStudentClassBooks).not.toHaveBeenCalled();
    expect(mocks.getStudentQuestCard).not.toHaveBeenCalled();
    expect(mocks.awardPowerUps).not.toHaveBeenCalled();
    expect(mocks.getVoiceEntitlement).not.toHaveBeenCalled();
    expect(mocks.getAvatarProfile).not.toHaveBeenCalled();
  });

  it("shows no leaderboard for a SYSTEM user with no school, and does not fail", async () => {
    await renderPreviewHome("SYSTEM", null);
    expect(mocks.leaderboard).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: en.Leaderboard.title })).not.toBeInTheDocument();
    expect(screen.getByText(en.StudentView.emptyLesson)).toBeInTheDocument();
  });

  it("leaves the student home as it was", async () => {
    mocks.user = { id: "s1", username: "ann", name: "Ann", role: "STUDENT", schoolId: "school-1", xp: 0, level: 1, cefrLevel: "A1" };
    mocks.getStudentHome.mockResolvedValue({ xp: 5, level: 1, cefrLevel: "A1", streakDays: 1, todayLesson: null, continueReading: null });
    renderWithMessages((await StudentHomePage()) as React.ReactElement, { locale: "en" });
    expect(mocks.getStudentHome).toHaveBeenCalled();
    expect(screen.queryByText(en.StudentView.emptyLesson)).not.toBeInTheDocument();
  });
});
