/**
 * Behavioral tests for part A of the `structural_ux_alignment_20260911`
 * track — dashboard props contract, student-progress ownership guard, and
 * server-side level-test placement.
 */

import { render, screen } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// FR-1: StudentDashboardContent renders server-provided props and fires no
// data fetch on mount.
// ---------------------------------------------------------------------------

jest.mock("@/locales/client", () => ({
  useCurrentLocale: () => "en",
  useScopedI18n: () => (key: string) => key,
  usePathname: () => "/student/dashboard",
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  },
}));

jest.mock("@/lib/telemetry/dashboard-telemetry", () => ({
  useDashboardTelemetry: () => ({ trackEvent: jest.fn() }),
}));

// These two widgets fetch their own data over HTTP; they are not part of the
// useDashboardMetrice migration and are stubbed here so the assertion targets
// only the metrics/goals props contract.
jest.mock("@/components/dashboard/activity-timeline", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/dashboard/compact-activity-heatmap", () => ({
  __esModule: true,
  CompactActivityHeatmap: () => null,
}));

import StudentDashboardContent from "@/components/dashboard/student-dashboard-content";

const baseProps = {
  userId: "user-1",
  user: {
    id: "user-1",
    name: "Test Student",
    email: "student@test.com",
    level: 5,
    cefr_level: "A2",
    xp: 26000,
  },
  metrics: {
    velocity: null,
    genres: null,
    srsHealth: null,
    aiInsights: null,
  },
  goals: [
    {
      id: "goal-1",
      title: "Read 10 articles",
      currentValue: 4,
      targetValue: 10,
      unit: "articles",
      targetDate: new Date("2099-01-01"),
      status: "ACTIVE",
      priority: "HIGH",
    },
  ],
};

describe("StudentDashboardContent server props contract", () => {
  beforeEach(() => {
    (globalThis as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders server-provided goals without firing any fetch on mount", () => {
    render(<StudentDashboardContent {...baseProps} />);

    expect(screen.getByText("Read 10 articles")).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("renders with empty metrics and goals without firing any fetch", () => {
    render(
      <StudentDashboardContent {...baseProps} goals={[]} />,
    );

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// FR-3: student-progress page rejects a teacher who has no classroom link to
// the student, before any student data is fetched.
// ---------------------------------------------------------------------------

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/locales/server", () => ({
  getScopedI18n: () => Promise.resolve((key: string) => key),
}));

jest.mock("@/utils/fetch-data", () => ({
  fetchData: jest.fn(),
}));

jest.mock("@reading-advantage/db", () => ({
  db: {
    select: jest.fn(),
  },
  and: jest.fn((...args: unknown[]) => ({ and: args })),
  eq: jest.fn((...args: unknown[]) => ({ eq: args })),
}));

import { getCurrentUser } from "@/lib/session";
import { fetchData } from "@/utils/fetch-data";
import { db } from "@reading-advantage/db";
import ProgressPage from "@/app/[locale]/(teacher)/teacher/student-progress/[studentId]/page";

const mockGetCurrentUser = getCurrentUser as jest.Mock;
const mockFetchData = fetchData as jest.Mock;
const mockSelect = db.select as jest.Mock;

describe("teacher student-progress ownership guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects a teacher who does not teach the student and fetches nothing", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "teacher-1",
      role: "TEACHER",
    });
    // No classroom link between this teacher and the student.
    mockSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    });

    const params = Promise.resolve({ studentId: "student-2" });

    await expect(ProgressPage({ params })).rejects.toThrow(/NEXT_REDIRECT/);
    expect(mockFetchData).not.toHaveBeenCalled();
  });

  it("proceeds to fetch data when the teacher teaches the student", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "teacher-1",
      role: "TEACHER",
    });
    mockSelect
      // ownership lookup finds a link
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: () => Promise.resolve([{ id: "link-1" }]),
            }),
          }),
        }),
      });
    mockFetchData
      .mockResolvedValueOnce({ activityLogs: [] })
      .mockResolvedValueOnce({ data: { display_name: "Student Two", cefr_level: "A2" } });

    const params = Promise.resolve({ studentId: "student-2" });

    // The page renders or throws; the key assertion is that data fetching
    // started after the ownership check passed.
    await ProgressPage({ params }).catch(() => undefined);
    expect(mockFetchData).toHaveBeenCalledTimes(2);
  });
});
