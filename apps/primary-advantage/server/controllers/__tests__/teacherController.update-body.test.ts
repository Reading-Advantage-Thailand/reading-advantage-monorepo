// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  updateTeacher: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/server/utils/auth", () => ({
  validateUser: vi.fn().mockResolvedValue({ id: "u1", role: "ADMIN", roles: [] }),
  checkAdminPermissions: vi.fn().mockResolvedValue(true),
  effectiveCallerRole: vi.fn().mockReturnValue("ADMIN"),
}));
vi.mock("@/server/models/teacherModel", () => ({ updateTeacher: mocks.updateTeacher }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/teachers", () => ({ MoveTeacherSchoolError: class extends Error {}, moveTeacherToSchool: vi.fn() }));
vi.mock("@/lib/observability/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { updateTeacherController } from "../teacherController";

const params = Promise.resolve({ id: "t1" });
const put = (body: unknown) =>
  new Request("http://localhost/api/teachers/t1", { method: "PUT", body: JSON.stringify(body) }) as NextRequest;

describe("updateTeacherController body", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: "u1" });
    mocks.updateTeacher.mockResolvedValue({ success: true, teacher: { id: "t1" } });
  });

  it.each(["system", "student", "ADMIN", 5])("returns 400 for the role %s before the model call", async (role) => {
    const response = await updateTeacherController(put({ role }), { params });
    expect(response.status).toBe(400);
    expect(mocks.updateTeacher).not.toHaveBeenCalled();
  });

  it("passes a teacher or admin role and drops unknown fields", async () => {
    const response = await updateTeacherController(put({ role: "admin", name: "N", extra: "x" }), { params });
    expect(response.status).toBe(200);
    expect(mocks.updateTeacher.mock.calls[0][1]).toEqual({ role: "admin", name: "N" });
  });

  it("returns 400 for a body that is not an object", async () => {
    const response = await updateTeacherController(put("x"), { params });
    expect(response.status).toBe(400);
  });
});
