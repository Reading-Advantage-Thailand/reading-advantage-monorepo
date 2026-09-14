// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  select: vi.fn(),
  eq: vi.fn((...args: unknown[]) => ({ __eq: args })),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
// The route imports createTenantDB from @reading-advantage/domain, whose
// tenant-registry transitively imports every table from @reading-advantage/db.
// Spread the real (inert) schema so those named imports resolve and
// identity-based classifyTable() recognizes the FLAT users table passed
// through tenantDb; the db client and operators stay mocked.
vi.mock("@reading-advantage/db", async () => ({
  ...(await import("@reading-advantage/db/schema")),
  db: { select: mocks.select },
  eq: mocks.eq,
  and: vi.fn(() => ({})),
  or: vi.fn(() => ({})),
  ilike: vi.fn(() => ({})),
  ne: vi.fn(() => ({})),
  inArray: vi.fn(() => ({})),
  notInArray: vi.fn(() => ({})),
}));

import { PgDialect } from "drizzle-orm/pg-core";
import { GET } from "../route";

/** WHERE-clause arguments captured from the mocked Drizzle chain. */
const whereCalls: unknown[][] = [];

/**
 * Builds a chainable Drizzle stub resolving to rows.
 * @param value The rows returned when awaited.
 * @returns A stub with from/where/limit support.
 */
function chain<T>(value: T) {
  const stub: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["from", "limit", "innerJoin"]) {
    stub[method] = () => stub;
  }
  stub.where = (...args: unknown[]) => {
    whereCalls.push(args);
    return stub;
  };
  (stub as Record<string, unknown>).then = (resolve: (value: T) => unknown) =>
    Promise.resolve(value).then(resolve);
  return stub;
}

/**
 * Builds a user search request.
 * @param query The search text.
 * @returns A GET request.
 */
function searchRequest(query: string) {
  return new Request(
    `http://localhost/api/users/search?q=${encodeURIComponent(query)}`,
  ) as NextRequest;
}

describe("GET /api/users/search school scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    whereCalls.length = 0;
  });

  it("returns 401 without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);

    const response = await GET(searchRequest("anna"));

    expect(response.status).toBe(401);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns 403 for a student caller", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "student-1",
      role: "STUDENT",
      schoolId: "school-a",
    });

    const response = await GET(searchRequest("anna"));

    expect(response.status).toBe(403);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("scopes teacher results to the caller's school", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "teacher-1",
      role: "TEACHER",
      schoolId: "school-a",
    });
    mocks.select
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]));

    const response = await GET(searchRequest("anna"));

    expect(response.status).toBe(200);
    // The route removed the manual eq(users.schoolId, ...) filter — TenantDB
    // injects the school scope on the FLAT users table. Assert the injected
    // WHERE clause actually restricts the query to the caller's school.
    const dialect = new PgDialect();
    const injectedWhere = whereCalls.map(([condition]) =>
      dialect.sqlToQuery(condition as never),
    );
    expect(
      injectedWhere.some(
        (q) =>
          q.sql.includes("school_id") && q.params.includes("school-a"),
      ),
      `Expected a TenantDB-injected school scope on users, got: ${JSON.stringify(injectedWhere)}`,
    ).toBe(true);
  });
});
