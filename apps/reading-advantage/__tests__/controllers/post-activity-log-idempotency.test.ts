/**
 * XP Idempotency Red Test
 *
 * Fires parallel postActivityLog completions for the same
 * (userId, activityType, targetId) triple and proves that XP is awarded
 * exactly once (one xpLogs row). Today the controller reads-then-writes
 * without an atomic guard, so every concurrent request inserts its own
 * xpLogs row.
 *
 * Evidence refs: Reading PB-001 / C-RA-CRIT-06; Reading migration PB-1.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

let activityCounter = 0;
let xpLogInsertCount = 0;

var selectMock: jest.Mock;
var fromMock: jest.Mock;
var whereMock: jest.Mock;
var limitMock: jest.Mock;
var insertMock: jest.Mock;
var valuesMock: jest.Mock;
var returningMock: jest.Mock;
var updateMock: jest.Mock;
var setMock: jest.Mock;

const insertedTables: string[] = [];

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");

  selectMock = jest.fn();
  fromMock = jest.fn();
  whereMock = jest.fn();
  limitMock = jest.fn();
  insertMock = jest.fn();
  valuesMock = jest.fn();
  returningMock = jest.fn();
  updateMock = jest.fn();
  setMock = jest.fn();

  const mockDb: any = {};
  mockDb.select = selectMock.mockImplementation(() => mockDb);
  mockDb.from = fromMock.mockImplementation(() => mockDb);
  mockDb.where = whereMock.mockImplementation(() => mockDb);
  mockDb.limit = limitMock.mockResolvedValue([]);
  mockDb.insert = jest.fn((table: any) => {
    const schema = jest.requireActual("@reading-advantage/db/schema");
    let name = table?.name || String(table);
    if (table === schema.userActivity) name = "user_activity";
    else if (table === schema.xpLogs) name = "xp_logs";
    else if (table === schema.users) name = "users";
    else if (table === schema.articles) name = "articles";
    if (name === "xp_logs") {
      xpLogInsertCount += 1;
    }
    insertedTables.push(name);
    return mockDb;
  });
  mockDb.values = valuesMock.mockImplementation(() => mockDb);
  mockDb.returning = returningMock.mockImplementation(() => {
    const lastTable = insertedTables.pop();
    if (lastTable === "user_activity") {
      activityCounter += 1;
      return Promise.resolve([
        {
          id: `activity-${activityCounter}`,
          userId: "user-1",
          activityType: "ARTICLE_READ",
          targetId: "article-1",
          completed: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    }
    return Promise.resolve([]);
  });
  mockDb.update = updateMock.mockImplementation(() => mockDb);
  mockDb.set = setMock.mockImplementation(() => mockDb);

  return {
    ...actual,
    db: mockDb,
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  levelCalculation: (xp: number) => ({
    raLevel: 1,
    cefrLevel: "A1",
    xp,
  }),
}));

import { getCurrentUser } from "@/lib/session";
import { postActivityLog } from "@/server/controllers/user-controller";

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;

describe("postActivityLog XP idempotency (Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activityCounter = 0;
    xpLogInsertCount = 0;
    insertedTables.length = 0;

    // Simulate an empty database: no existing activity, no existing xp log.
    limitMock.mockResolvedValue([]);

    mockedGetCurrentUser.mockResolvedValue({
      id: "user-1",
      role: "STUDENT",
      schoolId: "school-a",
      license_id: "license-a",
    } as any);
  });

  function makeRequest(userId: string, body: object): ExtendedNextRequest {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/users/${userId}/activity`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ) as ExtendedNextRequest;
    req.session = {
      user: {
        id: userId,
        role: "STUDENT",
        schoolId: "school-a",
        license_id: "license-a",
      },
    } as any;
    return req;
  }

  function makeContext(userId: string) {
    return { params: Promise.resolve({ id: userId }) };
  }

  it("parallel completions for the same (userId, activityType, targetId) produce exactly one xpLogs row", async () => {
    const userId = "user-1";
    const activityType = "ARTICLE_READ";
    const articleId = "article-1";
    const concurrentRequests = 5;

    const requests = Array.from({ length: concurrentRequests }, () =>
      postActivityLog(
        makeRequest(userId, {
          activityType,
          articleId,
          completed: true,
          xpEarned: 10,
        }),
        makeContext(userId)
      )
    );

    const responses = await Promise.all(requests);

    // A4 guard: the test must have actually executed all concurrent requests.
    expect(responses.length).toBe(concurrentRequests);

    const successCount = responses.filter((r) => r.status === 200).length;
    expect(successCount).toBe(concurrentRequests);

    // Labeled count: the exact bug is duplicate XP rows.
    expect(xpLogInsertCount).toBe(1);
  });

  it("reports the duplicate XP row count when idempotency is missing", async () => {
    const userId = "user-1";
    const activityType = "ARTICLE_READ";
    const articleId = "article-1";

    await Promise.all([
      postActivityLog(
        makeRequest(userId, {
          activityType,
          articleId,
          completed: true,
          xpEarned: 10,
        }),
        makeContext(userId)
      ),
      postActivityLog(
        makeRequest(userId, {
          activityType,
          articleId,
          completed: true,
          xpEarned: 10,
        }),
        makeContext(userId)
      ),
    ]);

    // This assertion will fail Red with the observed duplicate count.
    expect({
      xpLogRowCount: xpLogInsertCount,
      expectedXpLogRowCount: 1,
    }).toEqual({
      xpLogRowCount: 1,
      expectedXpLogRowCount: 1,
    });
  });
});
