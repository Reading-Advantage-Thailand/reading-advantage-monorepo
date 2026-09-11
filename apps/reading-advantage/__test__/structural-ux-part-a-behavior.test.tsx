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

// ---------------------------------------------------------------------------
// FR-4: the level-test placement endpoint computes XP server-side from the
// posted assessment and ignores any client-sent XP value.
// ---------------------------------------------------------------------------

jest.mock("@/utils/openai", () => ({
  openai: {},
  openaiModel5: "test-model",
}));

jest.mock("@reading-advantage/ai/internal-sdk", () => ({
  streamText: jest.fn(),
}));

jest.mock("@reading-advantage/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
  and: jest.fn((...args: unknown[]) => ({ and: args })),
  eq: jest.fn((...args: unknown[]) => ({ eq: args })),
}));

import { handleLevelTestPlacement } from "@/server/controllers/level-test-controller";

const dbMock = db as jest.Mocked<typeof db>;

function placementRequest(body: unknown, user?: { id: string } | null) {
  const req = new Request("http://localhost/api/v1/level-test/placement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
  req.session = user ? { user } : undefined;
  req.json = () => Promise.resolve(body);
  return req;
}

describe("level-test placement endpoint", () => {
  const insertValues = jest.fn();
  const updateSet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    insertValues.mockReturnValue({
      returning: () => Promise.resolve([{ id: "activity-1" }]),
    });
    (dbMock.insert as jest.Mock).mockReturnValue({ values: insertValues });
    updateSet.mockReturnValue({
      where: () => Promise.resolve(undefined),
    });
    (dbMock.update as jest.Mock).mockReturnValue({ set: updateSet });
    (dbMock.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });
  });

  it("computes placement from posted answers and ignores client-sent XP", async () => {
    const res = await handleLevelTestPlacement(
      placementRequest(
        {
          level: "B1",
          sublevel: "+",
          messageCount: 12,
          xpEarned: 999999, // a forged client value that must be ignored
        },
        { id: "student-1" },
      ),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    // B1+ maps to 68000 XP per the CEFR table, never the forged value.
    expect(body.placement.systemXp).toBe(68000);
    expect(body.placement.raLevel).toBe(9);

    // The XP log records the server-computed value.
    const xpLogCall = (dbMock.insert as jest.Mock).mock.calls.find(
      ([table]: [unknown]) => table && typeof table === "object" && "xpEarned" in (table as object),
    );
    expect(xpLogCall).toBeDefined();
    expect((xpLogCall![0] as any).xpEarned).toBe(68000);
  });

  it("does not award XP for an unrecognized level", async () => {
    const res = await handleLevelTestPlacement(
      placementRequest({ level: "Z9", sublevel: "" }, { id: "student-1" }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.placement.systemXp).toBe(0);

    const xpLogCall = (dbMock.insert as jest.Mock).mock.calls.find(
      ([table]: [unknown]) => table && typeof table === "object" && "xpEarned" in (table as object),
    );
    expect(xpLogCall).toBeUndefined();
  });

  it("rejects an unauthenticated request", async () => {
    const res = await handleLevelTestPlacement(
      placementRequest({ level: "B1" }, null),
    );
    expect(res.status).toBe(401);
  });

  it("rejects an invalid assessment payload", async () => {
    const res = await handleLevelTestPlacement(
      placementRequest({ sublevel: "+" }, { id: "student-1" }),
    );
    expect(res.status).toBe(400);
  });
});
