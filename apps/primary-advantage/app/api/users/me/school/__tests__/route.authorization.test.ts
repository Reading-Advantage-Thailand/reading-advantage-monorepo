// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getSchoolDetail: vi.fn(),
  selectQueue: [] as unknown[][],
  update: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/models/schoolModel", () => ({ getSchoolDetail: mocks.getSchoolDetail }));
vi.mock("@/server/models/schoolLicenseView", () => ({ getLicenseViewForCaller: vi.fn().mockResolvedValue(null) }));

/** Chainable Drizzle stub that resolves to the next queued select result. */
function selectChain() {
  const rows = mocks.selectQueue.shift() ?? [];
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "where", "innerJoin", "leftJoin", "limit", "orderBy"]) stub[m] = () => stub;
  stub.then = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return stub;
}
/** Write stub that records the set payload and returns the school row. */
function writeChain() {
  const stub: Record<string, unknown> = {};
  stub.set = (v: unknown) => { mocks.update(v); return stub; };
  stub.where = () => stub;
  stub.returning = () => Promise.resolve([{ id: "s1", name: "New", ownerId: null }]);
  stub.then = (resolve: (v: unknown) => unknown) => Promise.resolve([]).then(resolve);
  return stub;
}
const fakeDb = {
  select: () => selectChain(),
  update: () => writeChain(),
  unscoped: () => fakeDb,
};
vi.mock("@reading-advantage/domain", () => ({
  getTenantDB: () => fakeDb,
  getUnscopedDB: () => fakeDb,
}));

import { GET, PATCH } from "../route";

/** Builds a PATCH request that renames the school. */
function patch() {
  return new Request("http://localhost/api/users/me/school", {
    method: "PATCH",
    body: JSON.stringify({ name: "New", contactEmail: "c@x.test" }),
    headers: { "content-type": "application/json" },
  }) as NextRequest;
}

/**
 * Queues the selects of a PATCH: caller row, school row, same-name school, admins, licenses, count.
 * @param role The users.role of the caller row.
 * @param ownerId The school owner id.
 */
function queuePatch(role: string, ownerId: string | null = null) {
  mocks.selectQueue = [
    [{ id: "u1", role, schoolId: "s1" }],
    [{ id: "s1", name: "Old", ownerId }],
    [], [], [], [],
  ];
}

describe("PATCH /api/users/me/school needs a school admin", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["STUDENT", "TEACHER"])("refuses a %s and writes nothing", async (role) => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", role, schoolId: "s1" });
    queuePatch(role);
    const response = await PATCH(patch());
    expect(response.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("serves an ADMIN of the school that has no owner", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", role: "ADMIN", schoolId: "s1" });
    queuePatch("ADMIN", null);
    const response = await PATCH(patch());
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalled();
  });

  it("serves the owner of the school", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", role: "TEACHER", schoolId: "s1" });
    queuePatch("TEACHER", "u1");
    const response = await PATCH(patch());
    expect(response.status).toBe(200);
  });
});

describe("GET /api/users/me/school hides staff emails from a STUDENT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSchoolDetail.mockResolvedValue({ id: "s1" });
  });

  it.each([["STUDENT", true], ["TEACHER", false], ["ADMIN", false]])(
    "passes hideStaffEmails for %s = %s",
    async (role, hidden) => {
      mocks.getCurrentUser.mockResolvedValue({ id: "u1", role, schoolId: "s1" });
      mocks.selectQueue = [[{ id: "u1", role, schoolId: "s1" }]];
      const response = await GET();
      expect(response.status).toBe(200);
      expect(mocks.getSchoolDetail).toHaveBeenCalledWith("s1", expect.objectContaining({ hideStaffEmails: hidden }));
    },
  );
});
