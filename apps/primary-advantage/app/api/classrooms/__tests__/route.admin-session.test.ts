// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  selectQueue: [] as unknown[][],
  unscopedCalls: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));

/** Chainable Drizzle stub resolving to the next queued select result. */
function chain() {
  const rows = mocks.selectQueue.shift() ?? [];
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "where", "innerJoin", "leftJoin", "limit", "orderBy"]) stub[m] = () => stub;
  stub.then = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return stub;
}
const fakeDb = { select: () => chain(), unscoped: () => fakeDb };
vi.mock("@reading-advantage/domain", () => ({
  getTenantDB: () => fakeDb,
  getUnscopedDB: (reason: string) => {
    mocks.unscopedCalls(reason);
    return fakeDb;
  },
}));

import { GET } from "../route";

describe("GET /api/classrooms authorizes the users.role session (FR-5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectQueue = [];
  });

  it("serves an ADMIN session user who has no legacy role rows", async () => {
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "ADMIN", schoolId: "school-a" });
    // caller row, legacy role names, legacy school-admin rows, classrooms
    mocks.selectQueue = [[{ id: "u1" }], [], [], [{ id: "c1", name: "Class", grade: 1 }], [], ];
    const response = await GET({} as NextRequest);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { id: "c1", name: "Class", grade: "1", studentCount: 0 },
    ]);
  });

  it("returns nothing, with no unscoped read, for a school-less ADMIN", async () => {
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "ADMIN", schoolId: null });
    mocks.selectQueue = [[{ id: "u1" }], [], []];
    const response = await GET({} as NextRequest);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
    // Only the caller self-lookup may be unscoped; never the classroom listing.
    expect(mocks.unscopedCalls).toHaveBeenCalledTimes(1);
  });
});
