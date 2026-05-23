/**
 * Dashboard Summary Controller Tests
 *
 * Verifies the SQL emitted by `getDashboardSummary` targets the unified
 * Drizzle/Postgres table & column names (`user_activity`, `xp_logs`,
 * `articles`, `created_at`) — not the legacy quoted Prisma names
 * (`"UserActivity"`, `"XPLogs"`, `article`, `"createdAt"`).
 *
 * @jest-environment node
 */

const executeMock = jest.fn();

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");
  return {
    ...actual,
    db: { execute: (...args: unknown[]) => executeMock(...args) },
  };
});

jest.mock("@/lib/cache/metrics", () => ({
  // Bypass the cache so the inner fetcher (and therefore db.execute) is invoked.
  getCachedMetrics: async (_key: string, fetcher: () => Promise<unknown>) =>
    fetcher(),
}));

import { PgDialect } from "drizzle-orm/pg-core";
import { NextRequest } from "next/server";
import { getDashboardSummary } from "../server/controllers/dashboard-summary-controller";
import type { ExtendedNextRequest } from "../server/controllers/auth-controller";

const dialect = new PgDialect();

function makeReq(): ExtendedNextRequest {
  const req = new NextRequest(
    "http://localhost:3000/api/v1/dashboard/summary?dateRange=30d",
  ) as ExtendedNextRequest;
  req.session = {
    user: { id: "user-123", role: "ADMIN", schoolId: "school-1" },
  } as unknown as ExtendedNextRequest["session"];
  return req;
}

function renderSql(sqlObj: any): { text: string; params: unknown[] } {
  const q = dialect.sqlToQuery(sqlObj);
  return { text: q.sql, params: q.params };
}

describe("getDashboardSummary SQL", () => {
  beforeEach(() => {
    executeMock.mockReset();
    // Every issued query returns an empty result set so the controller
    // falls through to the zero-defaults path and returns 200.
    executeMock.mockResolvedValue([]);
  });

  it("issues 5 batched queries against unified table names", async () => {
    const res = await getDashboardSummary(makeReq());
    expect(res.status).toBe(200);

    // 5 metrics queries: activity (current + previous), alignment, velocity
    // (current + previous).
    expect(executeMock).toHaveBeenCalledTimes(5);

    const allSql = executeMock.mock.calls
      .map((call) => renderSql(call[0]).text)
      .join("\n---\n");

    // Unified names PRESENT (Drizzle/Postgres snake_case, unquoted).
    expect(allSql).toMatch(/\bFROM user_activity\b/);
    expect(allSql).toMatch(/\bxp_logs\b/);
    expect(allSql).toMatch(/\bINNER JOIN articles a\b/);
    expect(allSql).toMatch(/\bcreated_at\b/);

    // Legacy Prisma names ABSENT (no quoted PascalCase identifiers).
    expect(allSql).not.toMatch(/"UserActivity"/);
    expect(allSql).not.toMatch(/"XPLogs"/);
    expect(allSql).not.toMatch(/"createdAt"/);
    expect(allSql).not.toMatch(/\bJOIN article a\b/); // singular legacy form
  });

  it("binds the period boundaries as parameters (not inlined)", async () => {
    await getDashboardSummary(makeReq());

    for (const call of executeMock.mock.calls) {
      const { text, params } = renderSql(call[0]);
      // Every period boundary used in WHERE/JOIN clauses must reach the
      // driver as a bound parameter (Date object), never as an inline literal.
      expect(text).toMatch(/\$\d+/);
      for (const p of params) {
        if (p instanceof Date) {
          expect(text).not.toContain(p.toISOString());
        }
      }
    }
  });

  it("returns 401 when no session is present", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/v1/dashboard/summary",
    ) as ExtendedNextRequest;
    // Intentionally no session.
    const res = await getDashboardSummary(req);
    expect(res.status).toBe(401);
    expect(executeMock).not.toHaveBeenCalled();
  });
});
