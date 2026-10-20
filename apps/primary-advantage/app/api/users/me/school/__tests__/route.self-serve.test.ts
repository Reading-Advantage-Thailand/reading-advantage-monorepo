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

import { POST } from "../route";

/** Builds a POST request carrying a school payload. */
function post() {
  return new Request("http://localhost/api/users/me/school", {
    method: "POST",
    body: JSON.stringify({ name: "My School" }),
    headers: { "content-type": "application/json" },
  }) as NextRequest;
}

/**
 * Queues the selects of a POST: caller row, same-name school, caller role names.
 * @param user The users row the route loads.
 * @param roleNames The caller's user_roles names.
 */
function queue(user: Record<string, unknown>, roleNames: string[]) {
  mocks.selectQueue = [
    [{ id: "u1", name: "U", email: "u@x.test", schoolId: null, ...user }],
    [],
    roleNames.map((roleName) => ({ roleId: `r-${roleName}`, roleName })),
    [{ id: "r-admin", name: "admin" }],
  ];
}

describe("POST /api/users/me/school self-serve gate (C2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", role: "STUDENT", schoolId: null });
  });

  it("refuses a school-less STUDENT and writes nothing", async () => {
    queue({ role: "STUDENT" }, ["user"]);
    const response = await POST(post());
    expect(response.status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("creates a school for a school-less TEACHER that has no user_roles row and makes it ADMIN", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", role: "TEACHER", schoolId: null });
    queue({ role: "TEACHER" }, []);
    const response = await POST(post());
    expect(response.status).toBe(201);
    expect(mocks.update).toHaveBeenCalled();
    expect(mocks.insert).toHaveBeenCalled();
  });

  it("creates a school for a school-less ADMIN", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", role: "ADMIN", schoolId: null });
    queue({ role: "ADMIN" }, []);
    const response = await POST(post());
    expect(response.status).toBe(201);
  });

  it("does not downgrade a SYSTEM account that creates a school", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", role: "SYSTEM", schoolId: null });
    queue({ role: "SYSTEM" }, []);
    const response = await POST(post());
    expect(response.status).toBe(201);
    expect(mocks.update).not.toHaveBeenCalledWith(expect.objectContaining({ role: "ADMIN" }));
  });

  it("refuses a user who already has a school", async () => {
    queue({ role: "TEACHER", schoolId: "school-x" }, ["user"]);
    const response = await POST(post());
    expect(response.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
