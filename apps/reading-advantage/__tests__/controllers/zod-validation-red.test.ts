/**
 * Zod Input Validation Red Tests (SEC-7)
 *
 * Proves that reviewed route handlers reject malformed query params and body
 * shapes via parseQuery/parseBody helpers instead of accepting them and either
 * returning 500 or persisting invalid data.
 *
 * Falsification: remove the parseQuery/parseBody call and the invalid-shape
 * requests return 200/500 instead of 400.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");

  let responseQueue: any[] = [];

  const mockDb: any = new Proxy(
    {
      setResponseQueue(queue: any[]) {
        responseQueue = queue;
      },
    },
    {
      get(target, prop) {
        if (prop === "then") {
          return (onResolve: any, onReject: any) => {
            const value = responseQueue.shift();
            if (typeof onResolve === "function") {
              Promise.resolve(value).then(onResolve, onReject);
            }
          };
        }
        if (prop === "limit") {
          return jest.fn().mockImplementation(() => {
            return Promise.resolve(responseQueue.shift());
          });
        }
        if (prop === "returning") {
          return jest.fn().mockResolvedValue([]);
        }
        if (prop === "setResponseQueue") {
          return target.setResponseQueue;
        }
        if (
          [
            "select",
            "from",
            "where",
            "innerJoin",
            "leftJoin",
            "orderBy",
            "groupBy",
            "delete",
            "update",
            "insert",
            "values",
            "onConflictDoNothing",
          ].includes(prop as string)
        ) {
          return () => mockDb;
        }
        return undefined;
      },
    }
  );

  return {
    ...actual,
    db: mockDb,
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/server/utils/send-discord-webhook", () => ({
  sendDiscordWebhook: jest.fn().mockResolvedValue(undefined),
}));

import { getCurrentUser } from "@/lib/session";
import { db } from "@reading-advantage/db";
import { getSystemDashboard } from "@/server/controllers/system-dashboard-controller";
import { createLicenseKey } from "@/server/controllers/license-controller";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;

function setQueue(queue: any[]) {
  (db as any).setResponseQueue([...queue]);
}

function makeExtendedRequest(
  url: string,
  options?: RequestInit
): ExtendedNextRequest {
  return new NextRequest(url, options) as ExtendedNextRequest;
}

describe("Zod input validation on reviewed routes (SEC-7 Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setQueue([]);
  });

  describe("getSystemDashboard query validation", () => {
    it("rejects a non-date startDate query param with 400", async () => {
      mockedGetCurrentUser.mockResolvedValue({
        id: "system-1",
        role: "SYSTEM",
        email: "system@example.com",
      } as any);

      setQueue([[{ count: 0 }]]);

      const req = makeExtendedRequest(
        "http://localhost:3000/api/v1/system/dashboard?startDate=not-a-date&endDate=also-not-a-date"
      );
      const res = await getSystemDashboard(req);

      expect(res.status).toBe(400);
    });

    it("accepts a well-formed date range (success result count: expected 1)", async () => {
      mockedGetCurrentUser.mockResolvedValue({
        id: "system-1",
        role: "SYSTEM",
        email: "system@example.com",
      } as any);

      // 18 CEFR levels each resolve to count 0
      setQueue(Array(18).fill([{ count: 0 }]));

      const req = makeExtendedRequest(
        "http://localhost:3000/api/v1/system/dashboard?startDate=2026-01-01&endDate=2026-01-31"
      );
      const res = await getSystemDashboard(req);

      expect(res.status).toBe(200);
    });
  });

  describe("createLicenseKey body validation", () => {
    it("rejects a body missing required fields with 400", async () => {
      mockedGetCurrentUser.mockResolvedValue({
        id: "admin-1",
        role: "ADMIN",
        email: "admin@example.com",
      } as any);

      const req = makeExtendedRequest(
        "http://localhost:3000/api/v1/licenses",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const res = await createLicenseKey(req);

      expect(res.status).toBe(400);
    });

    it("accepts a complete license request (success result count: expected 1)", async () => {
      mockedGetCurrentUser.mockResolvedValue({
        id: "admin-1",
        role: "ADMIN",
        email: "admin@example.com",
      } as any);

      setQueue([[{ id: "license-1" }]]);

      const req = makeExtendedRequest(
        "http://localhost:3000/api/v1/licenses",
        {
          method: "POST",
          body: JSON.stringify({
            total_licenses: 10,
            subscription_level: "premium",
            school_name: "Test School",
            admin_id: "admin-1",
            expiration_date: 30,
          }),
        }
      );

      const res = await createLicenseKey(req);

      expect(res.status).toBe(200);
    });
  });
});
