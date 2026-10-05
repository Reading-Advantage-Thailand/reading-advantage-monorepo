// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  select: vi.fn(),
  fetchUserActivity: vi.fn(),
  fetchUserArticleRecords: vi.fn(),
  fetchUserReminderReread: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
// The routes import createTenantDB from @reading-advantage/domain, whose
// tenant-registry transitively imports every table from @reading-advantage/db.
// Spread the real (inert) schema so those named imports resolve and
// identity-based classifyTable() recognizes the FLAT users table passed
// through tenantDb; the db client stays mocked.
vi.mock("@reading-advantage/db", async () => ({
  ...(await import("@reading-advantage/db/schema")),
  db: { select: mocks.select },
  eq: vi.fn(() => ({})),
}));
vi.mock("@/server/controllers/userController", () => ({
  fetchUserActivity: mocks.fetchUserActivity,
  fetchUserArticleRecords: mocks.fetchUserArticleRecords,
  fetchUserReminderReread: mocks.fetchUserReminderReread,
}));

import { GET as getArticleRecords } from "../[id]/article-records/route";
import { GET as getReminderReread } from "../[id]/reminder-reread/route";

/**
 * Builds a chainable Drizzle stub resolving to rows.
 * @param value The rows returned when awaited.
 * @returns A stub with from/where/limit support.
 */
function chain<T>(value: T) {
  const stub: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["from", "where", "limit"]) {
    stub[method] = () => stub;
  }
  (stub as Record<string, unknown>).then = (resolve: (value: T) => unknown) =>
    Promise.resolve(value).then(resolve);
  return stub;
}

/**
 * Builds a record request for a target user.
 * @param id The target user id.
 * @returns The request and route context.
 */
function recordRequest(id: string, query = "") {
  const request = new Request(
    `http://localhost/api/users/${id}/article-records${query}`,
  ) as NextRequest;
  return { request, context: { params: Promise.resolve({ id }) } };
}

const teacherA = { id: "teacher-a", role: "TEACHER", schoolId: "school-a" };

describe("cross-tenant user record reads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("denies article-records across schools", async () => {
    mocks.currentUser.mockResolvedValue(teacherA);
    mocks.select.mockReturnValueOnce(
      chain([{ id: "student-b", schoolId: "school-b" }]),
    );

    const { request, context } = recordRequest("student-b");
    const response = await getArticleRecords(request, context);

    expect(response.status).toBe(403);
    expect(mocks.fetchUserActivity).not.toHaveBeenCalled();
    expect(mocks.fetchUserArticleRecords).not.toHaveBeenCalled();
  });

  it("serves the article records (data and pagination) within the same school", async () => {
    // The route used to return fetchUserActivity ({ activity, xpLogs, user }): the history table
    // read `data` and showed "No articles found" next to a filled reminder list, and the response
    // carried the full users row (with the password hash column).
    mocks.currentUser.mockResolvedValue(teacherA);
    mocks.select.mockReturnValueOnce(
      chain([{ id: "student-a", schoolId: "school-a" }]),
    );
    const records = {
      success: true,
      data: [{ id: "article-1", title: "The Moon", scores: "N/A", updated_at: "2026-10-04T09:00:00.000Z", rated: 0, status: "UNRATED" }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    mocks.fetchUserArticleRecords.mockResolvedValue(records);

    const { request, context } = recordRequest("student-a");
    const response = await getArticleRecords(request, context);

    expect(response.status).toBe(200);
    expect(mocks.fetchUserArticleRecords).toHaveBeenCalledWith({ userId: "student-a", page: 1, limit: 10, search: undefined });
    expect(mocks.fetchUserActivity).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body).toEqual(records);
    expect(body).not.toHaveProperty("user");
  });

  it("passes page, limit, and search from the query, and falls back on bad values", async () => {
    mocks.currentUser.mockResolvedValue(teacherA);
    mocks.select.mockReturnValue(chain([{ id: "student-a", schoolId: "school-a" }]));
    mocks.fetchUserArticleRecords.mockResolvedValue({ success: true, data: [], pagination: {} });

    const first = recordRequest("student-a", "?page=2&limit=5&search=%20moon%20");
    expect((await getArticleRecords(first.request, first.context)).status).toBe(200);
    expect(mocks.fetchUserArticleRecords).toHaveBeenLastCalledWith({ userId: "student-a", page: 2, limit: 5, search: "moon" });

    const bad = recordRequest("student-a", "?page=0&limit=999&search=");
    expect((await getArticleRecords(bad.request, bad.context)).status).toBe(200);
    expect(mocks.fetchUserArticleRecords).toHaveBeenLastCalledWith({ userId: "student-a", page: 1, limit: 10, search: undefined });
  });

  it("denies reminder-reread across schools", async () => {
    mocks.currentUser.mockResolvedValue(teacherA);
    mocks.select.mockReturnValueOnce(
      chain([{ id: "student-b", schoolId: "school-b" }]),
    );

    const request = new Request(
      "http://localhost/api/users/student-b/reminder-reread",
    ) as NextRequest;
    const response = await getReminderReread(request, {
      params: Promise.resolve({ id: "student-b" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.fetchUserReminderReread).not.toHaveBeenCalled();
  });
});
