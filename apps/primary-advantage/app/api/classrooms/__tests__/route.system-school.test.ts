// @vitest-environment node
/** M-10: a SYSTEM user who has a school id still lists the classes of the school in `?schoolId`. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  selectQueue: [] as unknown[][],
  whereArgs: [] as unknown[],
  tenantSelects: 0,
  unscopedReasons: [] as string[],
}));
vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));

/** Chainable Drizzle stub that records the argument of each where call. */
function chain() {
  const rows = mocks.selectQueue.shift() ?? [];
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "innerJoin", "leftJoin", "limit", "orderBy", "groupBy"]) stub[m] = () => stub;
  stub.where = (arg: unknown) => {
    mocks.whereArgs.push(arg);
    return stub;
  };
  stub.then = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return stub;
}
const unscopedDb = { select: () => chain() };
const tenantDb = {
  select: () => {
    mocks.tenantSelects++;
    return chain();
  },
  unscoped: () => unscopedDb,
};
vi.mock("@reading-advantage/domain", () => ({
  getTenantDB: () => tenantDb,
  getUnscopedDB: (reason: string) => {
    mocks.unscopedReasons.push(reason);
    return unscopedDb;
  },
}));

import { GET } from "../route";

const OWN = "5c5c5c5c-0000-4000-8000-000000000001";
const OTHER = "5c5c5c5c-0000-4000-8000-000000000002";
const get = (query: string) => new Request(`http://localhost/api/classrooms${query}`) as NextRequest;

describe("GET /api/classrooms for SYSTEM with a school id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectQueue = [[{ id: "u1" }], [], [{ id: "c1", name: "Class", grade: 1 }], []];
    mocks.whereArgs = [];
    mocks.tenantSelects = 0;
    mocks.unscopedReasons = [];
  });

  it("uses the unscoped handle and the validated schoolId, not the session school", async () => {
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "SYSTEM", schoolId: OWN });
    const response = await GET(get(`?schoolId=${OTHER}`));
    expect(response.status).toBe(200);
    expect(mocks.tenantSelects).toBe(0);
    expect(mocks.unscopedReasons.length).toBeGreaterThan(0);
    expect(mocks.whereArgs[2]).toBeDefined();
  });

  it("keeps the tenant scope for an ADMIN", async () => {
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "ADMIN", schoolId: OWN });
    await GET(get(`?schoolId=${OTHER}`));
    expect(mocks.tenantSelects).toBeGreaterThan(0);
  });
});
