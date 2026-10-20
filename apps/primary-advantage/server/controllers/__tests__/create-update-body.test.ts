// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createTeacher: vi.fn(),
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: vi.fn().mockResolvedValue({ id: "admin-1" }) }));
vi.mock("@/server/utils/auth", () => ({
  validateUser: vi.fn().mockResolvedValue({ id: "admin-1", schoolId: "s1", roles: [], SchoolAdmins: [] }),
  checkAdminPermissions: vi.fn().mockResolvedValue(true),
  effectiveCallerRole: vi.fn().mockReturnValue("ADMIN"),
}));
vi.mock("@/server/models/teacherModel", () => ({
  createTeacher: mocks.createTeacher,
  updateTeacher: vi.fn(),
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
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/teachers", () => ({ MoveTeacherSchoolError: class extends Error {}, moveTeacherToSchool: vi.fn() }));
vi.mock("@/lib/observability/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { createTeacherController } from "../teacherController";
import { createStudentController, updateStudentController } from "../studentController";

/** Builds a JSON request. */
const req = (body: unknown) =>
  new Request("http://localhost/api/x", { method: "POST", body: JSON.stringify(body) }) as NextRequest;
const ctx = { params: Promise.resolve({ id: "u1" }) };
const teacher = { name: "N", email: "n@x.test", role: "teacher" };

describe("teacher create body", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTeacher.mockResolvedValue({ success: true, teacher: { id: "t" } });
  });

  it.each([
    ["a string body", "x"],
    ["a number name", { ...teacher, name: 5 }],
    ["an object email", { ...teacher, email: { a: 1 } }],
    ["an unknown role", { ...teacher, role: "root" }],
    ["classroomIds as a string", { ...teacher, classroomIds: "c1" }],
    ["classroomIds with numbers", { ...teacher, classroomIds: [1] }],
    ["a bad schoolId", { ...teacher, schoolId: "../x" }],
    ["force as a string", { ...teacher, force: "yes" }],
  ])("returns 400 for %s", async (_n, body) => {
    expect((await createTeacherController(req(body))).status).toBe(400);
    expect(mocks.createTeacher).not.toHaveBeenCalled();
  });

  it("passes the client body and drops unknown fields", async () => {
    const res = await createTeacherController(
      req({ ...teacher, classroomIds: ["c1"], password: "long-enough-1", force: true, extra: "x" }),
    );
    expect(res.status).toBe(201);
    const call = mocks.createTeacher.mock.calls[0][0];
    expect(call).toMatchObject({ name: "N", email: "n@x.test", role: "teacher", classroomIds: ["c1"], force: true });
    expect(call).not.toHaveProperty("extra");
  });
});

describe("student create and update body", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createStudent.mockResolvedValue({ success: true, student: { id: "s" } });
    mocks.updateStudent.mockResolvedValue({ success: true, student: { id: "s" } });
  });

  it.each([
    ["a string body", "x"],
    ["an object name", { name: { a: 1 } }],
    ["a missing name", {}],
    ["classroomId as a number", { name: "N", classroomId: 5 }],
    ["a bad schoolId", { name: "N", schoolId: "x" }],
  ])("create returns 400 for %s", async (_n, body) => {
    expect((await createStudentController(req(body))).status).toBe(400);
    expect(mocks.createStudent).not.toHaveBeenCalled();
  });

  it("create accepts the admin form bodies and drops the role field", async () => {
    const res = await createStudentController(req({ name: "N", cefrLevel: "A1", role: "student" }));
    expect(res.status).toBe(201);
    expect(mocks.createStudent.mock.calls[0][0]).toMatchObject({ name: "N", cefrLevel: "A1" });
    expect(mocks.createStudent.mock.calls[0][0]).not.toHaveProperty("role");
  });

  it.each([
    ["a number name", { name: 5 }],
    ["cefrLevel as an object", { cefrLevel: {} }],
    ["a string body", "x"],
  ])("update returns 400 for %s", async (_n, body) => {
    expect((await updateStudentController(req(body), ctx)).status).toBe(400);
    expect(mocks.updateStudent).not.toHaveBeenCalled();
  });

  it("update passes the client body and drops unknown fields", async () => {
    const res = await updateStudentController(req({ name: "N", cefrLevel: "A2", role: "student" }), ctx);
    expect(res.status).toBe(200);
    expect(mocks.updateStudent.mock.calls[0][1]).toEqual({ name: "N", cefrLevel: "A2" });
  });
});
