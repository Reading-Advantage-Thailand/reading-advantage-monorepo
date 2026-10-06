// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  locale: "en" as TestLocale,
  user: { id: "t1", username: "kru.ann", name: "Kru Ann", role: "TEACHER", schoolId: "school-1" } as Record<string, unknown> | null,
  getClassVoiceUsage: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-voice", () => ({ getClassVoiceUsage: mocks.getClassVoiceUsage, voiceConfigFromEnv: () => ({ monthBudgetSeconds: 480 }) }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => mocks.locale,
    getTranslations: async (namespace?: string) => createTranslator({ locale: mocks.locale, messages: messages[mocks.locale], namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({ Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => <a href={href} {...rest}>{children}</a> }));

import ClassReedyUsagePage from "../page";

const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const params = Promise.resolve({ classroomId: C1 });
const usage = {
  classroomId: C1,
  month: "2026-10",
  budgetSeconds: 480,
  totalSeconds: 360,
  totalSessions: 3,
  studentCount: 3,
  studentsWithUse: 2,
  safetyEvents: 1,
  students: [
    { userId: "s1", name: "Ann", secondsUsed: 300, sessionCount: 2, lastUseAt: new Date("2026-10-04T04:00:00.000Z"), averageScores: { fluency: 3.5, grammar: 3.5, vocabulary: 4.5, pronunciation: 4 }, safetyEvents: 1 },
    { userId: "s2", name: "Bo", secondsUsed: 60, sessionCount: 1, lastUseAt: new Date("2026-10-02T04:00:00.000Z"), averageScores: null, safetyEvents: 0 },
    { userId: "s3", name: "Chai", secondsUsed: 0, sessionCount: 0, lastUseAt: null, averageScores: null, safetyEvents: 0 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.locale = "en";
  mocks.user = { id: "t1", username: "kru.ann", name: "Kru Ann", role: "TEACHER", schoolId: "school-1" };
  mocks.getClassVoiceUsage.mockResolvedValue(usage);
});
afterEach(cleanup);

describe("ClassReedyUsagePage (FR-13)", () => {
  it("shows the month roll-up, one row per student, and the students with no use", async () => {
    renderWithMessages(await ClassReedyUsagePage({ params }), { locale: "en" });
    expect(mocks.getClassVoiceUsage).toHaveBeenCalledWith(expect.objectContaining({ classroomId: C1, config: { monthBudgetSeconds: 480 } }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Reedy this month");
    expect(screen.getByText("6:00")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    const rows = screen.getAllByTestId("reedy-student");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Ann");
    expect(rows[0]).toHaveTextContent("5:00");
    expect(rows[0]).toHaveTextContent("Speak 3.5");
    expect(rows[2]).toHaveTextContent("No talk yet");
    expect(screen.getByRole("link", { name: "Back to class" })).toHaveAttribute("href", `/teacher/class-roster/${C1}`);
    expect(screen.getByText(/no recording or transcript/)).toBeInTheDocument();
  });

  it("shows an error state when the read is refused, in Thai", async () => {
    mocks.getClassVoiceUsage.mockRejectedValue(new Error("FORBIDDEN"));
    mocks.locale = "th";
    renderWithMessages(await ClassReedyUsagePage({ params }), { locale: "th" });
    expect(screen.getByText("ดูการใช้รีดี้ไม่ได้")).toBeInTheDocument();
    expect(screen.queryByTestId("reedy-student")).not.toBeInTheDocument();
  });
});
