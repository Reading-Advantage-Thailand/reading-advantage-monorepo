/**
 * Domain-Layer Migration Red Tests (SEC-8)
 *
 * Proves that reviewed controllers stop performing direct database queries and
 * delegate business logic to @reading-advantage/domain functions. The
 * representative slice is system-dashboard-controller, which currently runs 18
 * direct article-count queries.
 *
 * Falsification: move the DB queries back into the controller and the
 * direct-query count test fails.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");

  const selectMock = jest.fn().mockImplementation(() => mockDb);
  const mockDb: any = {
    select: selectMock,
    from: jest.fn().mockImplementation(() => mockDb),
    where: jest.fn().mockImplementation(() => mockDb),
    limit: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockImplementation(() => mockDb),
    update: jest.fn().mockImplementation(() => mockDb),
    insert: jest.fn().mockImplementation(() => mockDb),
    values: jest.fn().mockImplementation(() => mockDb),
    returning: jest.fn().mockResolvedValue([]),
  };

  return {
    ...actual,
    db: mockDb,
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@reading-advantage/domain", () => ({
  getSystemDashboardData: jest.fn().mockResolvedValue({
    data: {
      "1": 0,
      "2": 0,
    },
    dataRange: { start_date: null, end_date: null },
  }),
}));

import { getCurrentUser } from "@/lib/session";
import { getSystemDashboard } from "@/server/controllers/system-dashboard-controller";
import { getSystemDashboardData } from "@reading-advantage/domain";
import { db } from "@reading-advantage/db";

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;
const mockedGetSystemDashboardData = getSystemDashboardData as jest.MockedFunction<
  typeof getSystemDashboardData
>;

describe("controller-to-domain migration (SEC-8 Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates system dashboard logic to a domain function", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      id: "system-1",
      role: "SYSTEM",
      email: "system@example.com",
    } as any);

    const req = new NextRequest(
      "http://localhost:3000/api/v1/system/dashboard?startDate=2026-01-01&endDate=2026-01-31"
    );

    await getSystemDashboard(req);

    expect(mockedGetSystemDashboardData).toHaveBeenCalled();
  });

  it("does not issue direct db.select calls from the controller", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      id: "system-1",
      role: "SYSTEM",
      email: "system@example.com",
    } as any);

    const req = new NextRequest(
      "http://localhost:3000/api/v1/system/dashboard?startDate=2026-01-01&endDate=2026-01-31"
    );

    await getSystemDashboard(req);

    expect((db as any).select).not.toHaveBeenCalled();
  });
});
