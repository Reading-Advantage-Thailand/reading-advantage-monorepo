/**
 * PB-6 Red Test — Activity target validation + license fallback
 *
 * Evidence refs: Reading M-RA-PB-6; site-closures/M-RA-PB-6.md.
 *
 * Today `postActivityLog` builds `targetId` through a fallback chain
 * (`articleId || storyId || contentId || ""`) and proceeds even when the
 * result is an empty string. It also accepts `details?.articleId` as a
 * fallback. The fix must require an explicit, validated `targetId` and
 * remove the fallback chain.
 *
 * The entitlement specification requires a Basic fallback for missing or
 * invalid licenses. These tests also preserve valid and expired behavior.
 *
 * Falsification conditions:
 *  - If `postActivityLog` still accepts a request with no targetId fields,
 *    the required-target assertion fails.
 *  - If a user with null licenseId / null expiredDate is not reported as
 *    LicenseType.BASIC, the license fallback assertion fails.
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

import { postActivityLog, getUser } from "@/server/controllers/user-controller";

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
      license_id: null,
    },
  } as any;
  return req;
}

function makeContext(userId: string) {
  return { params: Promise.resolve({ id: userId }) };
}

describe("PB-6 activity target validation + license fallback (Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    limitMock.mockResolvedValue([]);
    returningMock.mockResolvedValue([]);
  });

  it("postActivityLog rejects a request with no targetId", async () => {
    const res = await postActivityLog(
      makeRequest("user-1", {
        activityType: "ARTICLE_READ",
        completed: true,
        xpEarned: 10,
      }),
      makeContext("user-1")
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("postActivityLog no longer falls back to details.articleId", async () => {
    const res = await postActivityLog(
      makeRequest("user-1", {
        activityType: "ARTICLE_READ",
        completed: true,
        xpEarned: 10,
        details: { articleId: "article-1" },
      }),
      makeContext("user-1")
    );

    // With a validated targetId requirement, a bare details.articleId is not
    // sufficient; the request must provide an explicit targetId field.
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("returns HTTP 400 for a malformed activity type", async () => {
    const response = await postActivityLog(
      makeRequest("user-1", {
        activityType: { value: "ARTICLE_READ" },
        articleId: "article-1",
      }),
      makeContext("user-1"),
    );

    expect(response.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("preserves the articleId caller field as the activity target", async () => {
    await postActivityLog(
      makeRequest("user-1", {
        activityType: "ARTICLE_READ",
        articleId: "article-1",
        completed: true,
      }),
      makeContext("user-1"),
    );

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: "article-1" }),
    );
  });

  it("missing license data resolves to LicenseType.BASIC", async () => {
    const userId = "user-no-license";

    limitMock.mockImplementation(async () => {
      const schema = jest.requireActual("@reading-advantage/db/schema");
      const lastFrom = fromMock.mock.calls[fromMock.mock.calls.length - 1]?.[0];
      if (lastFrom === schema.users) {
        return [
          {
            id: userId,
            name: "No License",
            email: "nl@example.com",
            role: "STUDENT",
            xp: 0,
            level: 1,
            cefrLevel: "A1",
            licenseId: null,
            expiredDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      }
      return [];
    });

    const res = await getUser(makeRequest(userId, {}), makeContext(userId));
    const body = await res.json();

    expect(body.data.license_level).toBe("BASIC");
  });

  it("returns the type from a valid license", async () => {
    const schema = jest.requireActual("@reading-advantage/db/schema");
    limitMock.mockImplementation(async () => {
      const lastFrom = fromMock.mock.calls[fromMock.mock.calls.length - 1]?.[0];
      if (lastFrom === schema.users) {
        return [{
          id: "licensed-user",
          licenseId: "license-1",
          expiredDate: new Date(Date.now() + 86_400_000),
          role: "STUDENT",
          xp: 0,
          level: 1,
          cefrLevel: "A1",
        }];
      }
      if (lastFrom === schema.licenses) return [{ licenseType: "ENTERPRISE" }];
      return [];
    });

    const response = await getUser(
      makeRequest("licensed-user", {}),
      makeContext("licensed-user"),
    );
    expect((await response.json()).data.license_level).toBe("ENTERPRISE");
  });

  it("returns Basic for an expired license", async () => {
    const schema = jest.requireActual("@reading-advantage/db/schema");
    limitMock.mockImplementation(async () => {
      const lastFrom = fromMock.mock.calls[fromMock.mock.calls.length - 1]?.[0];
      if (lastFrom === schema.users) {
        return [{
          id: "expired-user",
          licenseId: "license-1",
          expiredDate: new Date(Date.now() - 86_400_000),
          role: "STUDENT",
          xp: 0,
          level: 1,
          cefrLevel: "A1",
        }];
      }
      if (lastFrom === schema.licenses) return [{ licenseType: "ENTERPRISE" }];
      return [];
    });

    const response = await getUser(
      makeRequest("expired-user", {}),
      makeContext("expired-user"),
    );
    expect((await response.json()).data.license_level).toBe("BASIC");
  });
});
