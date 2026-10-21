// @vitest-environment node
/**
 * PR found on 2026-10-21 that the student "not started" filter hid new assignments: the app wrote
 * the student rows without a status (null), and the filter matched only "NOT_STARTED".
 */
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ select: vi.fn(), or: vi.fn(() => "or"), isNull: vi.fn(() => "isNull"), eq: vi.fn((column: unknown, value: unknown) => ({ column, value })) }));

vi.mock("@/lib/session", () => ({ currentUser: vi.fn(), getCurrentUser: vi.fn() }));
vi.mock("@reading-advantage/db", async (importOriginal) => ({
  // The real tables stay: the domain and auth modules register them when they load.
  ...(await importOriginal<typeof import("@reading-advantage/db")>()),
  db: { select: mocks.select },
  assignments: { id: "assignments.id" },
  studentAssignments: { studentId: "sa.studentId", status: "sa.status", createdAt: "sa.createdAt" },
  eq: mocks.eq,
  or: mocks.or,
  isNull: mocks.isNull,
  and: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
  count: vi.fn(() => ({})),
}));

import { getStudentAssignments } from "../assignmentModel";

/**
 * Builds a chainable Drizzle stub resolving to rows.
 * @param value The rows returned when awaited.
 * @returns A stub with the select chain methods.
 */
function chain<T>(value: T) {
  const stub: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["from", "leftJoin", "where", "orderBy", "limit", "offset"]) stub[method] = () => stub;
  (stub as Record<string, unknown>).then = (resolve: (value: T) => unknown) => Promise.resolve(value).then(resolve);
  return stub;
}

describe("getStudentAssignments status filter", () => {
  it("matches NOT_STARTED and a missing status for the 'not started' filter", async () => {
    mocks.select.mockReturnValueOnce(chain([{ value: 0 }])).mockReturnValueOnce(chain([]));
    await getStudentAssignments({ studentId: "student-1", page: 1, limit: 10, status: "0" });
    expect(mocks.eq).toHaveBeenCalledWith("sa.status", "NOT_STARTED");
    expect(mocks.isNull).toHaveBeenCalledWith("sa.status");
    expect(mocks.or).toHaveBeenCalledWith({ column: "sa.status", value: "NOT_STARTED" }, "isNull");
  });
});
