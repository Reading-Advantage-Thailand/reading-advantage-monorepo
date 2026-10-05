// @vitest-environment jsdom
/**
 * Audit S9/T12: the reports showed the raw keys `Reports.level.description.A0-` and
 * `Reports.activityType.SENTENCE_FLASHCARDS` (MISSING_MESSAGE). Every activity type and every
 * level on the gauge needs copy in every locale, and an unknown value must not show a raw key.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "../../../messages/en.json";
import th from "../../../messages/th.json";
import vi_ from "../../../messages/vi.json";
import cn from "../../../messages/cn.json";
import tw from "../../../messages/tw.json";
import { ActivityType } from "@/types/enum";
import { renderWithMessages, testMessages } from "../../__tests__/helpers/render-with-messages";

vi.mock("next/dynamic", () => ({ default: () => () => <div data-testid="gauge" /> }));

import UserRecentActivity from "../user-recent-activity";
import CEFRLevels, { CEFR_GAUGE_LEVELS } from "../user-level-indicator";

const LOCALES = { en, th, vi: vi_, cn, tw } as const;

afterEach(cleanup);

/**
 * One activity row for the recent-activity list.
 * @param activityType The activity type.
 * @param completed Whether the activity is done.
 * @returns The row.
 */
function activity(activityType: string, completed = true) {
  return {
    id: `act-${activityType}`,
    userId: "student-1",
    activityType,
    targetId: "article-1",
    timer: 0,
    details: {},
    completed,
    createdAt: new Date("2026-10-04T09:00:00Z"),
    updatedAt: new Date("2026-10-04T09:00:00Z"),
  } as never;
}

describe("report copy covers every value", () => {
  it.each(Object.keys(LOCALES) as (keyof typeof LOCALES)[])("has an activity label for every activity type and a text for every gauge level (%s)", (locale) => {
    const reports = LOCALES[locale].Reports as { activityType: Record<string, string>; level: { description: Record<string, string> } };
    for (const type of Object.values(ActivityType)) {
      expect(reports.activityType[type], `${locale} Reports.activityType.${type}`).toBeTruthy();
    }
    for (const level of CEFR_GAUGE_LEVELS) {
      expect(reports.level.description[level], `${locale} Reports.level.description.${level}`).toBeTruthy();
    }
  });
});

describe("report copy renders without raw keys", () => {
  it.each(["en", "th"] as const)("labels sentence flashcards and skips an unknown type without a raw key (%s)", (locale) => {
    const t = testMessages[locale].Reports;
    renderWithMessages(
      <UserRecentActivity data={[activity(ActivityType.SENTENCE_FLASHCARDS), activity("SOMETHING_NEW")]} />,
      { locale },
    );
    expect(screen.getByText(t.activityType.SENTENCE_FLASHCARDS)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Reports.");
  });

  it.each(["en", "th"] as const)("describes the A0- level, and an unknown level shows no raw key (%s)", (locale) => {
    const t = testMessages[locale].Reports.level.description as Record<string, string>;
    const { unmount } = renderWithMessages(<CEFRLevels currentLevel="A0-" />, { locale });
    expect(screen.getByText(t["A0-"])).toBeInTheDocument();
    unmount();

    renderWithMessages(<CEFRLevels currentLevel="Z9" />, { locale });
    expect(document.body.textContent).not.toContain("Reports.");
  });

  it("shows an empty state for no activity, and the show-all button only for more than one row", () => {
    const t = testMessages.en.Reports;
    const { unmount } = renderWithMessages(<UserRecentActivity data={[]} />);
    expect(screen.getByText(t.noActivity)).toBeInTheDocument();
    unmount();

    const { unmount: unmountOne } = renderWithMessages(<UserRecentActivity data={[activity(ActivityType.ARTICLE_READ)]} />);
    expect(screen.queryByRole("button", { name: t.showAllActivity })).not.toBeInTheDocument();
    unmountOne();

    renderWithMessages(<UserRecentActivity data={[activity(ActivityType.ARTICLE_READ), activity(ActivityType.MC_QUESTION)]} />);
    expect(screen.getByRole("button", { name: t.showAllActivity })).toBeInTheDocument();
  });
});
