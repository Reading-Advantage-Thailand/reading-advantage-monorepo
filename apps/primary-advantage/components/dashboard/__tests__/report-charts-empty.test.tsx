// @vitest-environment jsdom
/**
 * Audit S9: the XP Earned, XP Overall, and Reading Stats cards were empty white boxes when the
 * student had no data. Each chart shows empty-state text instead.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { renderWithMessages, testMessages } from "../../__tests__/helpers/render-with-messages";
import { UserActivityChart } from "../user-activity-chart";
import { UserXpOverAllChart } from "../user-xpoverall-chart";
import ReadingStatsChart from "../user-reading-chart";

afterEach(cleanup);

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
