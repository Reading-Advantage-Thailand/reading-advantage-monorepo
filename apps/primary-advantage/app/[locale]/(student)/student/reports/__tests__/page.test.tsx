// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  locale: "en" as "en" | "th",
  user: { id: "student-1", role: "STUDENT", schoolId: "school-1", cefrLevel: "A0-" } as Record<string, unknown> | null,
  fetchUserActivity: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@/server/controllers/userController", () => ({ fetchUserActivity: mocks.fetchUserActivity }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getTranslations: async (namespace?: string) =>
      createTranslator({ locale: mocks.locale, messages: messages[mocks.locale as TestLocale], namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/components/dashboard/report-panels", () => ({
  ReportPanels: ({ cefrLevel, activity }: { cefrLevel: string; activity: unknown[] }) => (
    <div data-testid="report-panels" data-level={cefrLevel} data-rows={String(activity.length)} />
  ),
}));

import ReportsPage from "../page";

/**
 * Renders the server page through the real message tree.
 * @param locale The UI locale.
 */
async function renderPage(locale: TestLocale = "en") {
  mocks.locale = locale;
  renderWithMessages((await ReportsPage()) as React.ReactElement, { locale });
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("student reports page", () => {
  it("shows the report panels with the student's level under the page title", async () => {
    mocks.fetchUserActivity.mockResolvedValue({
      activity: [{ id: "a1", activityType: "ARTICLE_READ", completed: null, details: null, createdAt: new Date() }],
      xpLogs: [],
      user: { id: "student-1" },
    });
    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: testMessages.en.Reports.title })).toBeInTheDocument();
    expect(screen.getByTestId("report-panels")).toHaveAttribute("data-level", "A0-");
    expect(screen.getByTestId("report-panels")).toHaveAttribute("data-rows", "1");
  });

  it.each(["en", "th"] as const)("shows an error with a retry when the activity fails to load, not the sign-in error (%s)", async (locale) => {
    const t = testMessages[locale];
    mocks.fetchUserActivity.mockResolvedValue(undefined);
    await renderPage(locale);

    expect(screen.getByRole("alert")).toHaveTextContent(t.Reports.loadError);
    expect(screen.getByRole("button", { name: t.Error.retry })).toBeInTheDocument();
  });
});
