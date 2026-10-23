// @vitest-environment jsdom
/**
 * Audit S9: the XP Earned, XP Overall, and Reading Stats cards were empty white boxes when the
 * student had no data. Each chart shows empty-state text instead.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages } from "../../__tests__/helpers/render-with-messages";
import { UserActivityChart } from "../user-activity-chart";
import { UserXpOverAllChart } from "../user-xpoverall-chart";
import ReadingStatsChart from "../user-reading-chart";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("report charts without data", () => {
  it.each(["en", "th"] as const)("show empty-state text, not a blank card (%s)", (locale) => {
    const t = testMessages[locale].Reports;
    renderWithMessages(
      <>
        <UserActivityChart data={[]} xpLogs={[]} />
        <UserXpOverAllChart data={[]} />
        <ReadingStatsChart data={[]} />
      </>,
      { locale },
    );
    expect(screen.getByText(t.noXp)).toBeInTheDocument();
    expect(screen.getByText(t.noXpOverall)).toBeInTheDocument();
    expect(screen.getByText(t.noReading)).toBeInTheDocument();
  });

  it("names the reading chart grouping control in the UI language", () => {
    const t = testMessages.th.Reports;
    renderWithMessages(<ReadingStatsChart data={[]} />, { locale: "th" });
    expect(screen.getByRole("combobox", { name: t.groupBy })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Selected");
  });
});

describe("report date range", () => {
  it.each([
    ["th", "15 ต.ค. 2569 - 21 ต.ค. 2569"],
    ["en", "Oct 15, 2026 - Oct 21, 2026"],
  ] as const)("uses the app date format, day first and the Buddhist year in Thai (help D4, %s)", (locale, text) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 21, 10));
    renderWithMessages(<UserActivityChart data={[]} xpLogs={[]} />, { locale });
    expect(screen.getByRole("button", { name: text })).toBeInTheDocument();
  });
});
