// @vitest-environment jsdom
/**
 * Red test for Primary Phase 1: admin dashboard fabricated metrics.
 *
 * app/[locale]/admin/dashboard/page.tsx renders hard-coded literal values
 * (100 students, 5 teachers, 100% active) instead of fetching real data or
 * showing an explicit unavailable state.
 *
 * Green: fetch dashboard metrics from an API/data source or render an explicit
 * "data unavailable" placeholder when no source is configured.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/dashboard/class-activity-chart", () => ({
  WeeklyActivityChart: () => <div data-testid="weekly-chart" />,
  ClassEngagementChart: () => <div data-testid="engagement-chart" />,
  ActivityMetricsChart: () => <div data-testid="metrics-chart" />,
  ActivitySummaryCards: () => <div data-testid="summary-cards" />,
}));

import DashboardPage from "../../../app/[locale]/admin/dashboard/page";

describe("admin dashboard real data", () => {
  it("does not render fabricated literal metric values", () => {
    render(<DashboardPage />);

    const fabricatedStudentCount = screen.queryByText("100");
    const fabricatedTeacherCount = screen.queryByText("5");
    const fabricatedActiveRate = screen.queryByText("100%");

    expect(
      {
        fabricatedStudentCountPresent: fabricatedStudentCount !== null,
        fabricatedTeacherCountPresent: fabricatedTeacherCount !== null,
        fabricatedActiveRatePresent: fabricatedActiveRate !== null,
      },
      "dashboard must not show hard-coded 100/5/100% metrics",
    ).toEqual({
      fabricatedStudentCountPresent: false,
      fabricatedTeacherCountPresent: false,
      fabricatedActiveRatePresent: false,
    });
  });
});