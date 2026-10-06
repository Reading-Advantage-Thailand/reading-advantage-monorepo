// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createTeacher: vi.fn(),
  updateTeacher: vi.fn(),
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: vi.fn().mockResolvedValue({ id: "admin-1" }) }));
vi.mock("@/server/utils/auth", () => ({
  validateUser: vi.fn().mockResolvedValue({ id: "admin-1", schoolId: "s1", roles: [], SchoolAdmins: [] }),
  checkAdminPermissions: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/server/models/teacherModel", () => ({
  createTeacher: mocks.createTeacher,
  updateTeacher: mocks.updateTeacher,
  getTeachers: vi.fn(),
  getTeacherById: vi.fn(),
  deleteTeacher: vi.fn(),
  getTeacherStatistics: vi.fn(),
}));
vi.mock("@/server/models/studentModel", () => ({
  createStudent: mocks.createStudent,
  updateStudent: mocks.updateStudent,
  getStudents: vi.fn(),
  getStudentById: vi.fn(),
  deleteStudent: vi.fn(),
  getStudentStatistics: vi.fn(),
}));

import { createTeacherController, updateTeacherController } from "../teacherController";
import { createStudentController, updateStudentController } from "../studentController";

/** Builds a JSON request. */
function req(body: unknown) {
  return new Request("http://localhost/api/x", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as NextRequest;
}
const ctx = { params: Promise.resolve({ id: "u1" }) };
const base = { name: "N", email: "n@x.test" };

describe("controller password validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["short", "x".repeat(129), 12345678])("rejects password %j on teacher create", async (password) => {
    const res = await createTeacherController(req({ ...base, role: "teacher", password }));
    expect(res.status).toBe(400);
    expect(mocks.createTeacher).not.toHaveBeenCalled();
  });

  it("rejects a short password on teacher update", async () => {
    const res = await updateTeacherController(req({ password: "short" }), ctx);
    expect(res.status).toBe(400);
    expect(mocks.updateTeacher).not.toHaveBeenCalled();
  });

  it("rejects a short password on student create", async () => {
    const res = await createStudentController(req({ ...base, password: "short" }));
    expect(res.status).toBe(400);
    expect(mocks.createStudent).not.toHaveBeenCalled();
  });

  it("rejects a short password on student update", async () => {
    const res = await updateStudentController(req({ password: "short" }), ctx);
    expect(res.status).toBe(400);
    expect(mocks.updateStudent).not.toHaveBeenCalled();
  });

  it("passes a valid password through", async () => {
    mocks.updateStudent.mockResolvedValue({ success: true });
    const res = await updateStudentController(req({ password: "long-enough-1" }), ctx);
    expect(res.status).toBe(200);
  });
});
