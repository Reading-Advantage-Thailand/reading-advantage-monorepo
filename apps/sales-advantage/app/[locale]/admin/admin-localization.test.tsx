import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import enMessages from "../../../messages/en.json";
import thMessages from "../../../messages/th.json";
import AdminPage from "./page";
import CreateRepPage from "./create-rep/page";
import { RepDetailContent } from "./[repId]/page";

const mocks = vi.hoisted(() => ({
  cohortOverview: vi.fn(),
  repDetail: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    sales: {
      admin: {
        cohortOverview: { useQuery: mocks.cohortOverview },
        repDetail: { useQuery: mocks.repDetail },
      },
    },
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const localeCases = [
  { locale: "en", messages: enMessages },
  { locale: "th", messages: thMessages },
] as const;

function renderLocalized(
  locale: (typeof localeCases)[number]["locale"],
  messages: (typeof localeCases)[number]["messages"],
  children: ReactNode,
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe.each(localeCases)(
  "Sales administrator localization ($locale)",
  ({ locale, messages }) => {
    it("renders the cohort list with localized copy and date", () => {
      const activityAt = new Date("2026-07-18T00:00:00Z");
      mocks.cohortOverview.mockReturnValue({
        data: [
          {
            userId: "rep-1",
            username: "somchai",
            displayName: "Somchai",
            modulesCompleted: 1,
            totalModules: 2,
            avgRoleplayScore: null,
            avgQuizScore: 80,
            roleplayAttemptCount: 2,
            lastActive: activityAt,
          },
        ],
        isLoading: false,
        error: null,
      });

      renderLocalized(locale, messages, <AdminPage />);

      expect(
        screen.getByRole("heading", { name: messages.admin.title }),
      ).toBeTruthy();
      expect(screen.getByText(messages.admin.attempts)).toBeTruthy();
      expect(
        screen.getByText(new Intl.DateTimeFormat(locale).format(activityAt)),
      ).toBeTruthy();
      expect(screen.getByText(messages.admin.notAvailable)).toBeTruthy();
    });

    it("renders representative detail with localized reporting copy", () => {
      const activityAt = new Date("2026-07-18T00:00:00Z");
      mocks.repDetail.mockReturnValue({
        data: {
          rep: {
            userId: "rep-1",
            username: "somchai",
            displayName: "Somchai",
          },
          summary: {
            modulesCompleted: 1,
            totalModules: 1,
            avgRoleplayScore: null,
            avgQuizScore: 80,
            roleplayAttemptCount: 0,
            lastActive: activityAt,
          },
          modules: [
            {
              moduleId: "module-1",
              slug: "foundation",
              title: "Foundation",
              lessonsCompleted: 1,
              totalLessons: 1,
              completed: true,
              avgQuizScore: 80,
            },
          ],
          scenarios: [],
        },
        isLoading: false,
        error: null,
      });

      renderLocalized(locale, messages, <RepDetailContent repId="rep-1" />);

      expect(
        screen.getByRole("heading", {
          name: messages.admin.repDetailName.replace("{name}", "Somchai"),
        }),
      ).toBeTruthy();
      expect(screen.getByText(messages.admin.moduleProgress)).toBeTruthy();
      expect(screen.getByText(messages.admin.noRoleplayScenarios)).toBeTruthy();
      expect(
        screen.getByText(new Intl.DateTimeFormat(locale).format(activityAt)),
      ).toBeTruthy();
    });

    it("renders the localized Accounts provisioning handoff", () => {
      renderLocalized(locale, messages, <CreateRepPage />);

      expect(
        screen.getByRole("heading", { name: messages.admin.createRep }),
      ).toBeTruthy();
      expect(
        screen.getByText(messages.admin.accountsHandoffDescription),
      ).toBeTruthy();
      expect(
        screen.getByRole("link", { name: messages.admin.openAccounts }),
      ).toBeTruthy();
    });
  },
);
