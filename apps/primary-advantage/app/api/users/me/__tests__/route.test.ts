// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getCurrentSession: mocks.getCurrentSession }));
vi.mock("@reading-advantage/domain", () => ({
  getTenantDB: () => ({ tenant: true }),
  getUnscopedDB: () => ({ unscoped: true }),
  users: { updateUser: mocks.updateUser },
}));

import { PATCH } from "../route";

const student = { id: "u1", role: "STUDENT", schoolId: "s1", name: "Old" };
const req = (body: unknown) =>
  ({ json: async () => body }) as unknown as NextRequest;

describe("PATCH /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateUser.mockResolvedValue({ id: "u1", name: "New Name" });
  });

  it("changes the own name for a full session", async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: student, authStrength: "full" });
    const res = await PATCH(req({ name: "  New Name " }));
    expect(res.status).toBe(200);
    expect(mocks.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ input: { id: "u1", name: "New Name" } }),
    );
  });

  it("gives 403 for a code_only session", async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: student, authStrength: "code_only" });
    const res = await PATCH(req({ name: "New Name" }));
    expect(res.status).toBe(403);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("gives 401 with no session", async () => {
    mocks.getCurrentSession.mockResolvedValue(null);
    const res = await PATCH(req({ name: "New Name" }));
    expect(res.status).toBe(401);
  });

  it("strips id, username, and role from the body", async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: student, authStrength: "full" });
    await PATCH(req({ name: "New Name", id: "other", username: "x", role: "ADMIN" }));
    expect(mocks.updateUser.mock.calls[0][0].input).toEqual({ id: "u1", name: "New Name" });
  });

  it.each(["a", "x".repeat(41)])("gives 400 for the name %s", async (name) => {
    mocks.getCurrentSession.mockResolvedValue({ user: student, authStrength: "full" });
    const res = await PATCH(req({ name }));
    expect(res.status).toBe(400);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
