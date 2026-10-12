// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  selectQueue: [] as unknown[][],
  insertSpy: vi.fn(),
  setSpy: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));

/** Chainable Drizzle stub that resolves to the next queued select result. */
function selectChain() {
  const rows = mocks.selectQueue.shift() ?? [];
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "where", "innerJoin", "limit", "orderBy"]) stub[m] = () => stub;
  stub.then = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return stub;
}
/** Write stub that records values and set payloads. */
function writeChain() {
  const stub: Record<string, unknown> = {};
  stub.values = (v: unknown) => { mocks.insertSpy(v); return stub; };
  stub.set = (v: unknown) => { mocks.setSpy(v); return stub; };
  stub.where = () => stub;
  stub.returning = () => Promise.resolve([]);
  stub.then = (resolve: (v: unknown) => unknown) => Promise.resolve([]).then(resolve);
  return stub;
}
const fakeDb = {
  select: () => selectChain(),
  insert: () => writeChain(),
  update: () => writeChain(),
  delete: () => writeChain(),
  unscoped: () => fakeDb,
};
vi.mock("@reading-advantage/domain", () => ({ getTenantDB: () => fakeDb, getUnscopedDB: () => fakeDb }));

import { POST } from "../route";

/** Builds a POST request for the target user. */
function post() {
  return new Request("http://localhost/api/users/me/school/admins", {
    method: "POST",
    body: JSON.stringify({ userId: "t1" }),
    headers: { "content-type": "application/json" },
  }) as NextRequest;
}

describe("POST /api/users/me/school/admins on a migrated database", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "owner", role: "ADMIN", schoolId: "s1" });
  });

  it("sets users.role to ADMIN for a TEACHER that has no user_roles row", async () => {
    mocks.selectQueue = [
      [{ id: "owner", schoolId: "s1" }],
      [{ id: "s1", ownerId: "owner" }],
      [{ id: "t1", schoolId: "s1", role: "TEACHER" }],
      [], // target user_roles
      [], // existing school_admins
      [], // roles lookup in setUserRole (empty table)
    ];
    const response = await POST(post());
    expect(response.status).toBe(200);
    expect(mocks.setSpy).toHaveBeenCalledWith({ role: "ADMIN" });
    await expect(response.json()).resolves.toMatchObject({ roleUpgraded: true });
  });
});
