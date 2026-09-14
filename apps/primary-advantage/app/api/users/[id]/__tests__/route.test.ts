// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
// The route imports createTenantDB from @reading-advantage/domain, whose
// tenant-registry transitively imports every table from @reading-advantage/db.
// Spread the real (inert) schema so those named imports resolve and
// identity-based classifyTable() keeps working; the db client stays mocked.
vi.mock("@reading-advantage/db", async () => ({
  ...(await import("@reading-advantage/db/schema")),
  db: { select: mocks.select, transaction: mocks.transaction },
  eq: vi.fn(() => ({})),
}));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn() } }));

import { PATCH } from "../route";

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

describe("PATCH /api/users/[id] authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects anonymous callers without touching the database", async () => {
    mocks.currentUser.mockResolvedValue(null);

    const { request, context } = patchRequest("student-1", { name: "X" });
    const response = await PATCH(request, context);

    expect(response.status).toBe(401);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a student promoting their own account without writing roles", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "student-1",
      role: "STUDENT",
      schoolId: "school-a",
    });

    const { request, context } = patchRequest("student-1", { role: "SYSTEM" });
    const response = await PATCH(request, context);

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a student changing another user's password", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "student-1",
      role: "STUDENT",
      schoolId: "school-a",
    });

    const { request, context } = patchRequest("student-2", {
      password: "new-password-1",
    });
    const response = await PATCH(request, context);

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a student writing XP on any user", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "student-1",
      role: "STUDENT",
      schoolId: "school-a",
    });

    const { request, context } = patchRequest("student-2", { xp: 99999 });
    const response = await PATCH(request, context);

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an admin self-role change", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      schoolId: "school-a",
    });

    const { request, context } = patchRequest("admin-1", { role: "SYSTEM" });
    const response = await PATCH(request, context);

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects invalid bodies with 400", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      schoolId: "school-a",
    });

    const { request, context } = patchRequest("student-1", { xp: -10 });
    const response = await PATCH(request, context);

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
