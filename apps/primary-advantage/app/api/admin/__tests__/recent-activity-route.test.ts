// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  select: vi.fn(),
  eq: vi.fn((...args: unknown[]) => ({ __eq: args })),
  desc: vi.fn((...args: unknown[]) => ({ __desc: args })),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

// The route imports createTenantDB from @reading-advantage/domain, whose
// tenant-registry transitively imports every table from @reading-advantage/db.
// Spread the real (inert) schema so those named imports resolve and
// identity-based classifyTable() keeps working; the db client stays mocked.
vi.mock("@reading-advantage/db", async () => ({
  ...(await import("@reading-advantage/db/schema")),
  db: { select: mocks.select },
  eq: mocks.eq,
  desc: mocks.desc,
}));

import { GET } from "../recent-activity/route";

/** Audit rows returned by the stubbed db chain. */
let auditRows: unknown[] = [];

/** Chain arguments captured from the last query, for limit assertions. */
let chainCalls: Record<string, unknown[]> = {};

/**
 * Builds a chainable Drizzle stub resolving to the fixture rows.
 * @returns A stub with from/leftJoin/orderBy/limit support.
 */
function chain() {
  const stub: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["from", "leftJoin", "orderBy"]) {
    stub[method] = (...args: unknown[]) => {
      chainCalls[method] = args;
      return stub;
    };
  }
  stub.limit = (count: unknown) => {
    chainCalls.limit = [count];
    return Promise.resolve(auditRows);
  };
  return stub;
}

/**
 * Builds a GET request for the recent-activity route.
 * @param search Optional query string, for example "?limit=5".
 * @returns A GET request typed as NextRequest.
 */
function activityRequest(search = "") {
  return new Request(
    `http://localhost/api/admin/recent-activity${search}`,
  ) as NextRequest;
}

const adminUser = { id: "admin-1", role: "ADMIN", schoolId: "school-1" };
const studentUser = { id: "stu-1", role: "STUDENT", schoolId: "school-1" };

describe("GET /api/admin/recent-activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditRows = [];
    chainCalls = {};
    mocks.select.mockImplementation(chain);
  });

  it("returns 401 for anonymous callers without querying", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await GET(activityRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns 403 for a STUDENT caller without querying", async () => {
    mocks.getCurrentUser.mockResolvedValue(studentUser);

    const response = await GET(activityRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-numeric limit and skips the query", async () => {
    mocks.getCurrentUser.mockResolvedValue(adminUser);

    const response = await GET(activityRequest("?limit=abc"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid query parameters",
    });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns 200 with activities mapped from the audit rows for ADMIN", async () => {
    mocks.getCurrentUser.mockResolvedValue(adminUser);
    const firstDate = new Date("2026-09-01T10:00:00.000Z");
    const secondDate = new Date("2026-09-02T11:00:00.000Z");
    auditRows = [
      {
        id: "evt-1",
        action: "user_created",
        targetType: "user",
        targetId: "u-9",
        metadata: { role: "TEACHER" },
        createdAt: firstDate,
        actorName: "Ada Admin",
        actorEmail: "ada@example.com",
        actorImage: "https://img.example/ada.png",
      },
      {
        id: "evt-2",
        action: "article:publish",
        targetType: null,
        targetId: null,
        metadata: null,
        createdAt: secondDate,
        actorName: null,
        actorEmail: null,
        actorImage: null,
      },
    ];

    const response = await GET(activityRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.activities)).toBe(true);
    expect(body.activities).toHaveLength(2);

    expect(body.activities[0]).toEqual({
      id: "evt-1",
      type: "user_created",
      user: {
        name: "Ada Admin",
        email: "ada@example.com",
        avatar: "https://img.example/ada.png",
      },
      description: "User created (user u-9)",
      timestamp: firstDate.toISOString(),
      metadata: { role: "TEACHER" },
    });
    expect(body.activities[1]).toEqual({
      id: "evt-2",
      type: "article_created",
      user: { name: "System", email: "" },
      description: "Article publish",
      timestamp: secondDate.toISOString(),
    });
    expect(body.activities[1]).not.toHaveProperty("metadata");
    expect(body.activities[1].user).not.toHaveProperty("avatar");
  });

  it("defaults the limit to 10 and forwards an explicit limit", async () => {
    mocks.getCurrentUser.mockResolvedValue(adminUser);

    await GET(activityRequest());
    expect(chainCalls.limit).toEqual([10]);

    await GET(activityRequest("?limit=5"));
    expect(chainCalls.limit).toEqual([5]);
  });

  it("rejects out-of-range limits with 400", async () => {
    mocks.getCurrentUser.mockResolvedValue(adminUser);

    const tooBig = await GET(activityRequest("?limit=51"));
    expect(tooBig.status).toBe(400);
    const zero = await GET(activityRequest("?limit=0"));
    expect(zero.status).toBe(400);
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
