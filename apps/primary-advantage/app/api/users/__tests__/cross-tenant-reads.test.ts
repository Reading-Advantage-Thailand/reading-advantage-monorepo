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
function recordRequest(id: string) {
  const request = new Request(
    `http://localhost/api/users/${id}/article-records`,
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

  it("serves article-records within the same school", async () => {
    mocks.currentUser.mockResolvedValue(teacherA);
    mocks.select.mockReturnValueOnce(
      chain([{ id: "student-a", schoolId: "school-a" }]),
    );
    mocks.fetchUserArticleRecords.mockResolvedValue({
      success: true,
      data: [],
      pagination: {},
    });
    mocks.fetchUserActivity.mockResolvedValue({
      activity: [],
      xpLogs: [],
      user: { id: "student-a" },
    });

    const { request, context } = recordRequest("student-a");
    const response = await getArticleRecords(request, context);

    expect(response.status).toBe(200);
    expect(mocks.fetchUserActivity).toHaveBeenCalledWith("student-a");
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
