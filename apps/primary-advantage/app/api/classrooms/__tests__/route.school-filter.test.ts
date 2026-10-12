// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  selectQueue: [] as unknown[][],
  whereArgs: [] as unknown[],
}));
vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));

/** Chainable Drizzle stub that records the argument of each where call. */
function chain() {
  const rows = mocks.selectQueue.shift() ?? [];
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "innerJoin", "leftJoin", "limit", "orderBy"]) stub[m] = () => stub;
  stub.where = (arg: unknown) => {
    mocks.whereArgs.push(arg);
    return stub;
  };
  stub.then = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return stub;
}
const fakeDb = { select: () => chain(), unscoped: () => fakeDb };
vi.mock("@reading-advantage/domain", () => ({
  getTenantDB: () => fakeDb,
  getUnscopedDB: () => fakeDb,
}));

import { GET } from "../route";

const SCHOOL = "5c5c5c5c-0000-4000-8000-000000000001";
const get = (query: string) => new Request(`http://localhost/api/classrooms${query}`) as NextRequest;

/** The where argument of the classroom listing (the fourth select: caller, roles, admin rows, classrooms). */
const listingWhere = () => mocks.whereArgs[3];

describe("GET /api/classrooms ?schoolId filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectQueue = [[{ id: "u1" }], [], [], [{ id: "c1", name: "Class", grade: 1 }], []];
    mocks.whereArgs = [];
  });

  it("filters by the school for SYSTEM", async () => {
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "SYSTEM", schoolId: null });
    const response = await GET(get(`?schoolId=${SCHOOL}`));
    expect(response.status).toBe(200);
    expect(listingWhere()).toBeDefined();
  });

  it("does not filter for SYSTEM without a schoolId, or with a bad value", async () => {
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "SYSTEM", schoolId: null });
    await GET(get(""));
    expect(listingWhere()).toBeUndefined();
    mocks.whereArgs = [];
    mocks.selectQueue = [[{ id: "u1" }], [], [], [], []];
    await GET(get("?schoolId=not-a-uuid"));
    expect(listingWhere()).toBeUndefined();
  });

  it("ignores the schoolId for an ADMIN", async () => {
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "ADMIN", schoolId: "school-a" });
    const response = await GET(get(`?schoolId=${SCHOOL}`));
    expect(response.status).toBe(200);
    expect(listingWhere()).toBeUndefined();
  });
});
