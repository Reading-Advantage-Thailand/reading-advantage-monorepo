// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  selectQueue: [] as unknown[][],
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/models/schoolModel", () => ({ getSchoolDetail: vi.fn() }));

/** Chainable Drizzle stub that resolves to the next queued select result. */
function selectChain() {
  const rows = mocks.selectQueue.shift() ?? [];
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "where", "innerJoin", "leftJoin", "limit", "orderBy"]) {
    stub[m] = () => stub;
  }
  stub.then = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return stub;
}

/** Write stub that records the call and resolves to a school row. */
function writeChain(spy: (...args: unknown[]) => void) {
  return (...args: unknown[]) => {
    spy(...args);
    const stub: Record<string, unknown> = {};
    stub.values = (v: unknown) => {
      spy(v);
      return stub;
    };
    stub.set = () => stub;
    stub.where = () => stub;
    stub.returning = () => Promise.resolve([{ id: "new-school", name: "S", ownerId: "u1" }]);
    stub.then = (resolve: (v: unknown) => unknown) => Promise.resolve([]).then(resolve);
    return stub;
  };
}

const fakeDb = {
  select: () => selectChain(),
  insert: writeChain(mocks.insert),
  update: writeChain(mocks.update),
  delete: writeChain(mocks.delete),
  unscoped: () => fakeDb,
};
vi.mock("@reading-advantage/domain", () => ({
  getTenantDB: () => fakeDb,
  getUnscopedDB: () => fakeDb,
}));

import { DELETE } from "../route";

/**
 * Queues the selects of a DELETE: caller row, school row, then the optional roles lookup.
 * @param role The users.role value of the caller.
 * @param rolesRows The roles lookup rows of setUserRole; empty on a migrated database.
 */
function queue(role: string, rolesRows: unknown[] = []) {
  mocks.selectQueue = [
    [{ id: "u1", name: "U", email: "u@x.test", schoolId: "school-1", role }],
    [{ id: "school-1", name: "S", ownerId: "u1" }],
    rolesRows,
  ];
}

describe("DELETE /api/users/me/school owner role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", role: "ADMIN", schoolId: "school-1" });
  });

  it("downgrades a migrated owner (no user_roles, no roles rows) and clears the school", async () => {
    queue("ADMIN");
    const response = await DELETE();
    expect(response.status).toBe(200);
    // one update for users.role, one for users.schoolId; the school row is deleted
    expect(mocks.update).toHaveBeenCalled();
    expect(mocks.delete).toHaveBeenCalledTimes(1);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("also replaces the user_roles row when the roles row exists", async () => {
    queue("ADMIN", [{ id: "r-student" }]);
    const response = await DELETE();
    expect(response.status).toBe(200);
    expect(mocks.delete).toHaveBeenCalledTimes(2);
    expect(mocks.insert).toHaveBeenCalled();
  });

  it("leaves a non-admin owner role untouched", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", role: "SYSTEM", schoolId: "school-1" });
    queue("SYSTEM");
    const response = await DELETE();
    expect(response.status).toBe(200);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
