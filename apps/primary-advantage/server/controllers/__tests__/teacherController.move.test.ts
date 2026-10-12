// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  moveTeacherToSchool: vi.fn(),
  updateTeacher: vi.fn(),
  effectiveCallerRole: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/server/utils/auth", () => ({
  validateUser: vi.fn().mockResolvedValue({ id: "u1", role: "ADMIN", roles: [] }),
  checkAdminPermissions: vi.fn().mockResolvedValue(true),
  effectiveCallerRole: mocks.effectiveCallerRole,
}));
vi.mock("@/server/models/teacherModel", () => ({ updateTeacher: mocks.updateTeacher }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/teachers", async () => {
  class MoveTeacherSchoolError extends Error {
    status: number;
    constructor(readonly code: string, message: string, readonly classNames: string[] = []) {
      super(message);
      this.status = code === "OWNS_CLASSES" ? 409 : 400;
    }
  }
  return { MoveTeacherSchoolError, moveTeacherToSchool: mocks.moveTeacherToSchool };
});
vi.mock("@/lib/observability/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { moveTeacherController, updateTeacherController } from "../teacherController";
import { MoveTeacherSchoolError } from "@reading-advantage/domain/teachers";

const SCHOOL = "5c5c5c5c-0000-4000-8000-000000000001";
const CLASS = "6d6d6d6d-0000-4000-8000-000000000001";
const params = Promise.resolve({ id: "t1" });
const post = (body: unknown) =>
  new Request("http://localhost/api/teachers/t1/move", { method: "POST", body: JSON.stringify(body) }) as NextRequest;
const put = (body: unknown) =>
  new Request("http://localhost/api/teachers/t1", { method: "PUT", body: JSON.stringify(body) }) as NextRequest;

describe("moveTeacherController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: "sys", role: "SYSTEM", schoolId: null });
  });

  it("moves the teacher for SYSTEM", async () => {
    mocks.moveTeacherToSchool.mockResolvedValue({ teacherId: "t1", schoolId: SCHOOL, classroomIds: [CLASS] });
    const response = await moveTeacherController(post({ schoolId: SCHOOL, classroomIds: [CLASS] }), { params });
    expect(response.status).toBe(200);
    expect(mocks.moveTeacherToSchool.mock.calls[0][0].input).toEqual({ teacherId: "t1", schoolId: SCHOOL, classroomIds: [CLASS] });
  });

  it("returns 403 for an ADMIN before the domain call", async () => {
    mocks.currentUser.mockResolvedValue({ id: "a1", role: "ADMIN", schoolId: "x" });
    const response = await moveTeacherController(post({ schoolId: SCHOOL }), { params });
    expect(response.status).toBe(403);
    expect(mocks.moveTeacherToSchool).not.toHaveBeenCalled();
  });

  it("returns 401 with no session and 400 for a bad body", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await moveTeacherController(post({ schoolId: SCHOOL }), { params })).status).toBe(401);
    mocks.currentUser.mockResolvedValue({ id: "sys", role: "SYSTEM", schoolId: null });
    expect((await moveTeacherController(post({ schoolId: "nope" }), { params })).status).toBe(400);
    expect(mocks.moveTeacherToSchool).not.toHaveBeenCalled();
  });

  it("returns 409 with the class names when the teacher owns classes", async () => {
    mocks.moveTeacherToSchool.mockRejectedValue(new MoveTeacherSchoolError("OWNS_CLASSES", "The teacher owns classes", ["Class A"]));
    const response = await moveTeacherController(post({ schoolId: SCHOOL }), { params });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "OWNS_CLASSES", classNames: ["Class A"] });
  });

  it("returns 400 for a class of another school", async () => {
    mocks.moveTeacherToSchool.mockRejectedValue(new MoveTeacherSchoolError("CROSS_SCHOOL_CLASSROOM", "A class is not in the target school"));
    expect((await moveTeacherController(post({ schoolId: SCHOOL, classroomIds: [CLASS] }), { params })).status).toBe(400);
  });
});

describe("updateTeacherController schoolId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: "a1", role: "ADMIN", schoolId: "x" });
    mocks.updateTeacher.mockResolvedValue({ success: true, teacher: { id: "t1" } });
  });

  it("returns 403 and writes nothing when an ADMIN sends a schoolId", async () => {
    mocks.effectiveCallerRole.mockReturnValue("ADMIN");
    const response = await updateTeacherController(put({ name: "N", schoolId: SCHOOL }), { params });
    expect(response.status).toBe(403);
    expect(mocks.updateTeacher).not.toHaveBeenCalled();
  });

  it("still updates an ADMIN request without a schoolId", async () => {
    mocks.effectiveCallerRole.mockReturnValue("ADMIN");
    const response = await updateTeacherController(put({ name: "N" }), { params });
    expect(response.status).toBe(200);
    expect(mocks.updateTeacher).toHaveBeenCalled();
  });
});
