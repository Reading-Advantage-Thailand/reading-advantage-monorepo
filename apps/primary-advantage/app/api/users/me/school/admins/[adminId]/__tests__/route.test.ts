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

import { DELETE } from "../route";

/** Calls DELETE for one admin; the admins list sends the user id. */
function remove(adminId = "t1") {
  return DELETE({} as NextRequest, { params: Promise.resolve({ adminId }) });
}

describe("DELETE /api/users/me/school/admins/[adminId] on a migrated database", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "owner", role: "ADMIN", schoolId: "s1" });
  });

  it("sets users.role back to TEACHER when the admin has no user_roles row", async () => {
    mocks.selectQueue = [
      [{ id: "owner", schoolId: "s1" }],
      [{ id: "s1", ownerId: "owner" }],
      [{ id: "t1", schoolId: "s1", role: "ADMIN" }], // target user
      [{ id: "a1", schoolId: "s1", userId: "t1" }], // its school_admins rows
      [], // other school_admins rows
      [], // target user_roles
      [], // roles lookup in setUserRole (empty table)
    ];
    const response = await remove();
    expect(response.status).toBe(200);
    expect(mocks.setSpy).toHaveBeenCalledWith({ role: "TEACHER" });
  });

  it("removes an ADMIN that has no school_admins row and keeps the account in the school", async () => {
    mocks.selectQueue = [
      [{ id: "owner", schoolId: "s1" }],
      [{ id: "s1", ownerId: "owner" }],
      [{ id: "t1", schoolId: "s1", role: "ADMIN" }],
      [], [], [], [],
    ];
    const response = await remove();
    expect(response.status).toBe(200);
    expect(mocks.setSpy).toHaveBeenCalledWith({ role: "TEACHER" });
    expect(mocks.setSpy).not.toHaveBeenCalledWith({ schoolId: null });
  });

  it("gives 404 for a TEACHER that is not an admin, and writes nothing", async () => {
    mocks.selectQueue = [
      [{ id: "owner", schoolId: "s1" }],
      [{ id: "s1", ownerId: "owner" }],
      [{ id: "t1", schoolId: "s1", role: "TEACHER" }],
      [],
    ];
    const response = await remove();
    expect(response.status).toBe(404);
    expect(mocks.setSpy).not.toHaveBeenCalled();
  });

  it("lets a migrated ADMIN without a school_admins row remove an admin of an ownerless school", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "adm", role: "ADMIN", schoolId: "s1" });
    mocks.selectQueue = [
      [{ id: "adm", schoolId: "s1", role: "ADMIN" }],
      [{ id: "s1", ownerId: null }],
      [{ id: "t1", schoolId: "s1", role: "ADMIN" }],
      [{ id: "a1", schoolId: "s1", userId: "t1" }],
      [], [], [],
    ];
    const response = await remove();
    expect(response.status).toBe(200);
  });

  it("refuses a TEACHER who is not the owner", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "tch", role: "ADMIN", schoolId: "s1" });
    mocks.selectQueue = [
      [{ id: "tch", schoolId: "s1", role: "TEACHER" }],
      [{ id: "s1", ownerId: "owner" }],
    ];
    const response = await remove();
    expect(response.status).toBe(403);
  });

  it("refuses an ADMIN who is not the owner when the target is the school owner (M-6)", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "adm", role: "ADMIN", schoolId: "s1" });
    mocks.selectQueue = [
      [{ id: "adm", schoolId: "s1", role: "ADMIN" }],
      [{ id: "s1", ownerId: "owner" }],
      [{ id: "owner", schoolId: "s1", role: "ADMIN" }],
      [{ id: "a1", schoolId: "s1", userId: "owner" }],
      [], [], [],
    ];
    const response = await remove("owner");
    expect(response.status).toBe(403);
    expect(mocks.setSpy).not.toHaveBeenCalled();
  });

  it("lets SYSTEM remove the school owner from the admins (M-6)", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "sys", role: "SYSTEM", schoolId: "s1" });
    mocks.selectQueue = [
      [{ id: "sys", schoolId: "s1", role: "SYSTEM" }],
      [{ id: "s1", ownerId: "owner" }],
      [{ id: "owner", schoolId: "s1", role: "ADMIN" }],
      [{ id: "a1", schoolId: "s1", userId: "owner" }],
      [], [], [],
    ];
    const response = await remove("owner");
    expect(response.status).toBe(200);
  });
});
