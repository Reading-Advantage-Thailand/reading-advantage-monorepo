// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  locale: "en" as TestLocale,
  user: { id: "a1", username: "admin", name: "Admin", role: "ADMIN", schoolId: "school-1" } as Record<string, unknown> | null,
  getSchoolVoiceCosts: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-voice", () => ({ getSchoolVoiceCosts: mocks.getSchoolVoiceCosts }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => mocks.locale,
    getTranslations: async (namespace?: string) => createTranslator({ locale: mocks.locale, messages: messages[mocks.locale], namespace: namespace as never }),
  };
});

import AdminReedyCostsPage from "../page";

const costs = {
  months: [
    { schoolId: "school-1", schoolName: "QA School A", month: "2026-10", secondsUsed: 360, sessionCount: 3, costThb: 3, attempts: 3, failedStarts: 1, disconnected: 1, summaryFailures: 1, safetyEvents: 1 },
    { schoolId: "school-1", schoolName: "QA School A", month: "2026-09", secondsUsed: 100, sessionCount: 1, costThb: 0.8, attempts: 0, failedStarts: 0, disconnected: 0, summaryFailures: 0, safetyEvents: 0 },
  ],
  operations: { attempts: 3, started: 2, failedStarts: 1, failedStartRate: 1 / 3, disconnected: 1, disconnectRate: 0.5, summaryFailures: 1, summaryFailureRate: 0.5, finished: 2, measuredCostSessions: 2, missingCostSessions: 0, missingTranscriptionCostSessions: 2, totalMeasuredCostUsd: 0.15, totalMeasuredRealtimeCostUsd: 0.15, totalMeasuredTranscriptionCostUsd: 0, averageMeasuredCostUsd: 0.075, averageMeasuredRealtimeCostUsd: 0.075, recentSessions: [] },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.locale = "en";
  mocks.user = { id: "a1", username: "admin", name: "Admin", role: "ADMIN", schoolId: "school-1" };
  mocks.getSchoolVoiceCosts.mockResolvedValue(costs);
});
afterEach(cleanup);

describe("AdminReedyCostsPage (FR-14)", () => {
  it("shows failures, disconnects, measured cost, and one row per school-month", async () => {
    renderWithMessages(await AdminReedyCostsPage(), { locale: "en" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Reedy costs");
    expect(screen.getByText("1 (33%)")).toBeInTheDocument();
    expect(screen.getAllByText("1 (50%)")).toHaveLength(2);
    expect(screen.getByText("$0.15")).toBeInTheDocument();
    const rows = screen.getAllByTestId("reedy-month");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("2026-10");
    expect(rows[0]).toHaveTextContent("QA School A");
    expect(rows[0]).toHaveTextContent("3.00");
    expect(rows[1]).toHaveTextContent("0.80");
  });

  it("shows the empty state with no sessions and an error state when refused", async () => {
    mocks.getSchoolVoiceCosts.mockResolvedValueOnce({ ...costs, months: [] });
    renderWithMessages(await AdminReedyCostsPage(), { locale: "en" });
    expect(screen.getByText("No Reedy sessions yet")).toBeInTheDocument();
    cleanup();
    mocks.getSchoolVoiceCosts.mockRejectedValueOnce(new Error("FORBIDDEN"));
    renderWithMessages(await AdminReedyCostsPage(), { locale: "en" });
    expect(screen.getByText("Reedy usage is not available")).toBeInTheDocument();
  });
});
