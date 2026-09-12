/**
 * Server XP authority for postActivityLog.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

var selectMock: jest.Mock;
var fromMock: jest.Mock;
var whereMock: jest.Mock;
var limitMock: jest.Mock;
var insertMock: jest.Mock;
var valuesMock: jest.Mock;
var returningMock: jest.Mock;
var updateMock: jest.Mock;

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

  const mockDb: any = {};
  mockDb.select = selectMock.mockImplementation(() => mockDb);
  mockDb.from = fromMock.mockImplementation(() => mockDb);
  mockDb.where = whereMock.mockImplementation(() => mockDb);
  mockDb.limit = limitMock.mockResolvedValue([]);
  mockDb.insert = insertMock.mockImplementation(() => mockDb);
  mockDb.values = valuesMock.mockImplementation(() => mockDb);
  mockDb.returning = returningMock.mockImplementation(() => mockDb);
  mockDb.update = updateMock.mockImplementation(() => mockDb);
  mockDb.set = jest.fn().mockImplementation(() => mockDb);

  return {
    ...actual,
    db: mockDb,
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

import { postActivityLog, xpForActivityType } from "@/server/controllers/user-controller";
import { ActivityType } from "@/lib/enums";

function makeRequest(userId: string, body: object): ExtendedNextRequest {
  const req = new NextRequest(
    `http://localhost:3000/api/v1/users/${userId}/activitylog`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  ) as ExtendedNextRequest;
  req.session = {
    user: {
      id: userId,
      role: "STUDENT",
      school_id: "school-a",
    },
  } as any;
  return req;
}

function makeContext(userId: string) {
  return { params: Promise.resolve({ id: userId }) };
}

describe("xpForActivityType", () => {
  it("awards the catalog value for a completed matching activity", () => {
    expect(xpForActivityType(ActivityType.SENTENCE_MATCHING, true)).toBe(5);
  });

  it("awards nothing for an incomplete activity", () => {
    expect(xpForActivityType(ActivityType.SENTENCE_MATCHING, false)).toBe(0);
  });
});

describe("postActivityLog XP authority", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    limitMock.mockResolvedValue([]);
    returningMock.mockResolvedValue([{ id: "activity-1" }]);
  });

  it("ignores a client-sent xpEarned and isInitialLevelTest payload", async () => {
    const res = await postActivityLog(
      makeRequest("user-1", {
        activityType: "sentence_matching",
        articleId: "article-1",
        completed: true,
        xpEarned: 221000,
        isInitialLevelTest: true,
      }),
      makeContext("user-1"),
    );

    expect(res.status).toBe(200);
    const xpInsert = valuesMock.mock.calls.find(
      ([values]: [Record<string, unknown>]) =>
        values && typeof values === "object" && "activityId" in values,
    );
    expect(xpInsert).toBeDefined();
    expect(xpInsert![0].xpEarned).toBe(5);
  });
});
