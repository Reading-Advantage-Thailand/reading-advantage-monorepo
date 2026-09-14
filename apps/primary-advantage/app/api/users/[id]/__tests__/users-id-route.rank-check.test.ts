// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
// The route calls getTenantDB/getUnscopedDB from @reading-advantage/domain,
// which wrap the shared db client imported inside the domain package. Mock the
// client barrel (keeping the real, inert schema exports so identity-based
// classifyTable() keeps working) so both factories resolve to this mock.
vi.mock("@reading-advantage/db", async () => ({
  ...(await import("@reading-advantage/db/schema")),
  db: {
    select: mocks.select,
    transaction: mocks.transaction,
    update: mocks.update,
    delete: mocks.delete,
    insert: mocks.insert,
  },
}));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn() } }));

import { PATCH } from "../route";

/** The raw (unwrapped) db client the route's TenantDB proxy wraps. */
const rawDb = {
  select: mocks.select,
  transaction: mocks.transaction,
  update: mocks.update,
  delete: mocks.delete,
  insert: mocks.insert,
};

/** Rows arrays returned by successive select() calls, one per query. */
let selectQueue: unknown[][] = [];

/**
 * Builds a chainable Drizzle stub resolving to the queued rows.
 * @param value The rows returned when the builder is awaited.
 * @returns A stub with from/where/innerJoin/limit support.
 */
function chain(value: unknown) {
  const stub: Record<string, unknown> = {};
  for (const method of [
    "from",
    "where",
    "innerJoin",
    "leftJoin",
    "limit",
    "orderBy",
  ]) {
    stub[method] = () => stub;
  }
  stub.then = (
    resolve: (value: unknown) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(value).then(resolve, reject);
  return stub;
}

/**
 * Builds a PATCH request with a JSON body.
 * @param id The target user id.
 * @param body The request payload.
 * @returns The request and route context.
 */
function patchRequest(id: string, body: unknown) {
  const request = new Request(`http://localhost/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as NextRequest;
  return { request, context: { params: Promise.resolve({ id }) } };
}

const adminCaller = { id: "admin-1", role: "ADMIN", schoolId: "school-a" };
const systemCaller = { id: "system-1", role: "SYSTEM" };

/**
 * Queues the rows for a successful role update: target lookup, role record,
 * updated user, and the stitched role rows. Each entry is one query's rows.
 * @param role The role name being assigned.
 */
function queueRoleUpdate(role: string) {
  selectQueue = [
    [{ id: "student-1", schoolId: "school-a" }],
    [{ id: "role-1", name: role }],
    [
      {
        id: "student-1",
        name: "Old Name",
        email: "old@example.com",
        xp: 10,
        level: 3,
        cefrLevel: "B1",
      },
    ],
    // The stitched-role rows query is awaited directly, so this entry is
    // the rows array itself.
    [{ roleId: "role-1", roleName: role }],
  ];
}

describe("PATCH /api/users/[id] role rank check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue = [];
    mocks.select.mockImplementation(() => chain(selectQueue.shift() ?? []));
    mocks.update.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
    mocks.delete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    mocks.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });
    mocks.transaction.mockImplementation(
      async (fn: (tx: unknown) => unknown) => fn(rawDb),
    );
  });

  it("blocks an ADMIN from assigning SYSTEM with the rank error", async () => {
    mocks.currentUser.mockResolvedValue(adminCaller);
    selectQueue = [[{ id: "student-1", schoolId: "school-a" }]];

    const { request, context } = patchRequest("student-1", { role: "SYSTEM" });
    const response = await PATCH(request, context);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Cannot assign a role above your own",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each(["TEACHER", "STUDENT", "ADMIN"])(
    "lets an ADMIN assign %s: not blocked by the rank check and reaches the transaction",
    async (role) => {
      mocks.currentUser.mockResolvedValue(adminCaller);
      queueRoleUpdate(role);

      const { request, context } = patchRequest("student-1", { role });
      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
      expect(mocks.transaction).toHaveBeenCalledTimes(1);
      await expect(response.json()).resolves.toEqual({
        message: "User updated successfully",
        user: {
          id: "student-1",
          name: "Old Name",
          email: "old@example.com",
          xp: 10,
          level: 3,
          cefrLevel: "B1",
          roles: [role],
        },
      });
    },
  );

  it("lets a SYSTEM caller assign SYSTEM", async () => {
    mocks.currentUser.mockResolvedValue(systemCaller);
    selectQueue = [
      [{ id: "student-1", schoolId: null }],
      [{ id: "role-1", name: "SYSTEM" }],
      [
        {
          id: "student-1",
          name: "Old Name",
          email: "old@example.com",
          xp: 10,
          level: 3,
          cefrLevel: "B1",
        },
      ],
      [{ roleId: "role-1", roleName: "SYSTEM" }],
    ];

    const { request, context } = patchRequest("student-1", { role: "SYSTEM" });
    const response = await PATCH(request, context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user.roles).toEqual(["SYSTEM"]);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("blocks a SALES_ADMIN at the management gate before any role logic", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "sales-1",
      role: "SALES_ADMIN",
      schoolId: null,
    });

    const { request, context } = patchRequest("student-1", {
      role: "STUDENT",
    });
    const response = await PATCH(request, context);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an unknown role string with 400 before any query", async () => {
    // Extends route.test.ts's 400 coverage (xp: -10) with the role refine case.
    mocks.currentUser.mockResolvedValue(adminCaller);

    const { request, context } = patchRequest("student-1", { role: "WIZARD" });
    const response = await PATCH(request, context);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request body",
    });
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
