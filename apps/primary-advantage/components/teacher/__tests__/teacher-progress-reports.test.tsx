// @vitest-environment jsdom
/**
 * Phase 2 review (item 1): the per-student view fetched `/api/users/[id]/article-records`, which
 * returns `{ success, data, pagination }` since run 2b, and read `activity` and `xpLogs` from it,
 * so the teacher saw no activity. The view reads `/api/users/[id]/activity` (`{ activity, xpLogs }`,
 * dates as ISO strings). This test feeds that exact JSON shape to the real component and the
 * real recent-activity list; only the chart internals are stubbed to show what they receive.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TeacherProgressReports from "../teacher-progress-reports";
import { renderWithMessages, testMessages } from "../../__tests__/helpers/render-with-messages";

vi.mock("@/components/dashboard/user-activity-chart", () => ({
  UserActivityChart: ({ data, xpLogs }: { data: unknown[]; xpLogs: unknown[] }) => (
    <div data-testid="activity-chart">{`${data.length} activity, ${xpLogs.length} xp`}</div>
  ),
}));
vi.mock("@/components/dashboard/user-xpoverall-chart", () => ({
  UserXpOverAllChart: ({ data }: { data: unknown[] }) => <div data-testid="xp-chart">{`${data.length} xp`}</div>,
}));
vi.mock("@/components/dashboard/user-reading-chart", () => ({
  default: ({ data }: { data: unknown[] }) => <div data-testid="reading-chart">{`${data.length} activity`}</div>,
}));
vi.mock("@/components/dashboard/user-heatmap-chart", () => ({
  default: ({ data }: { data: { createdAt: unknown }[] }) => (
    <div data-testid="heatmap">{data.every((row) => row.createdAt instanceof Date) ? "dates" : "strings"}</div>
  ),
}));

const fetchMock = vi.fn();
const t = testMessages.en.Reports;

/** The JSON body of `/api/users/s1/activity`, as `NextResponse.json` sends it. */
const ACTIVITY_BODY = {
  activity: [
    { id: "act-2", userId: "s1", activityType: "ARTICLE_READ", targetId: "article-1", completed: true, details: {}, createdAt: "2026-10-04T09:00:00.000Z" },
    { id: "act-1", userId: "s1", activityType: "MC_QUESTION", targetId: "article-1", completed: false, details: {}, createdAt: "2026-10-03T09:00:00.000Z" },
  ],
  xpLogs: [{ id: "xp-1", userId: "s1", xpEarned: 5, createdAt: "2026-10-04T09:00:00.000Z" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TeacherProgressReports per-student view", () => {
  it("reads the activity endpoint and renders its activity and XP logs", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ACTIVITY_BODY });
    renderWithMessages(
      <TeacherProgressReports
        classrooms={[]}
        students={[{ id: "s1", display_name: "Somchai", email: "somchai@example.com", cefrLevel: "A1", xp: 10 }]}
        currentUser={{ id: "t1" } as never}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Somchai" }));

    expect(await screen.findByText(t.activityType.ARTICLE_READ)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/users/s1/activity");
    expect(screen.getByTestId("activity-chart")).toHaveTextContent("2 activity, 1 xp");
    expect(screen.getByTestId("xp-chart")).toHaveTextContent("1 xp");
    expect(screen.getByTestId("reading-chart")).toHaveTextContent("2 activity");
    // The JSON dates become Date objects at the fetch boundary (the recent-activity list calls getTime).
    expect(screen.getByTestId("heatmap")).toHaveTextContent("dates");
  });
});
