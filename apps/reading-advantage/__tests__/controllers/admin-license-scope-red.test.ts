/**
 * Admin/SYSTEM License Scope Red Tests (SEC-6)
 *
 * Proves that a SYSTEM user cannot use the ?licenseId override to read data
 * outside their own license scope without an explicit access-key gate or an
 * auditable justification. The representative slice is getSchoolSegments, which
 * currently lets SYSTEM substitute any licenseId and returns the foreign
 * school's data.
 *
 * Falsification: remove the scope/audit check and the foreign-license test
 * returns 200 with data instead of 403/audit.
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
            const value = responseQueue.shift();
            return Promise.resolve(value);
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
            "selectDistinct",
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

jest.mock("@reading-advantage/auth", () => ({
  ...jest.requireActual("@reading-advantage/auth"),
  recordAuditEvent: jest.fn(),
}));

import { getCurrentUser } from "@/lib/session";
import { getSchoolSegments } from "@/server/controllers/admin-controller";
import { recordAuditEvent } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;
const mockedRecordAuditEvent = recordAuditEvent as jest.MockedFunction<
  typeof recordAuditEvent
>;

function makeRequest(licenseId?: string): NextRequest {
  const url = new URL("http://localhost:3000/api/v1/admin/segments");
  if (licenseId) {
    url.searchParams.set("licenseId", licenseId);
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

function setQueue(queue: any[]) {
  (db as any).setResponseQueue([...queue]);
}

describe("admin/SYSTEM license scope escalation (SEC-6 Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setQueue([]);
  });

  it("denies or audits a SYSTEM user requesting a foreign licenseId", async () => {
    const ownLicenseId = "license-a";
    const foreignLicenseId = "license-b";

    mockedGetCurrentUser.mockResolvedValue({
      id: "system-1",
      role: "SYSTEM",
      email: "system@example.com",
      license_id: ownLicenseId,
    } as any);

    setQueue([
      [{ id: foreignLicenseId, schoolId: "school-b", maxUsers: 100 }],
      [{ id: "school-b", name: "Foreign School" }],
      [],
      [],
      [],
      [],
    ]);

    const res = await getSchoolSegments(makeRequest(foreignLicenseId));
    const body = await res.json();

    const denied = res.status === 403 || res.status === 401;
    const audited =
      mockedRecordAuditEvent.mock.calls.length > 0 &&
      mockedRecordAuditEvent.mock.calls.some((call) => {
        const args = call[0] as any;
        return args?.metadata?.licenseId === foreignLicenseId;
      });

    expect(denied || audited).toBe(true);
    expect(body).toEqual(
      expect.objectContaining({
        code: expect.any(String),
      })
    );
  });

  it("still allows SYSTEM to read their own license scope (success result count: expected 1)", async () => {
    const ownLicenseId = "license-a";

    mockedGetCurrentUser.mockResolvedValue({
      id: "system-1",
      role: "SYSTEM",
      email: "system@example.com",
      license_id: ownLicenseId,
    } as any);

    setQueue([
      [{ id: ownLicenseId, schoolId: "school-a", maxUsers: 100 }],
      [{ id: "school-a", name: "Own School" }],
      [{ id: "student-1", role: "STUDENT", level: 1, xp: 10, schoolId: "school-a" }],
      [],
      [{ id: ownLicenseId, schoolId: "school-a", maxUsers: 100 }],
      [{ licenseId: ownLicenseId, count: 1 }],
    ]);

    const res = await getSchoolSegments(makeRequest(ownLicenseId));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.segments.length).toBe(1);
  });
});
