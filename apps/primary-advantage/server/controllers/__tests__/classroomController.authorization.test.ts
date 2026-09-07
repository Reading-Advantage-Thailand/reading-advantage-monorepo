// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  createClassroom: vi.fn(),
  deleteClassroom: vi.fn(),
  getAllClassrooms: vi.fn(),
  getClassroomWithStudents: vi.fn(),
  updateClassroom: vi.fn(),
  enrollStudentInClassroom: vi.fn(),
  unenrollStudentFromClassroom: vi.fn(),
  getAvailableStudentsForClassroom: vi.fn(),
  generateClassCode: vi.fn(),
  getAllStudentsByTeacher: vi.fn(),
  getAllStudentsByAdmin: vi.fn(),
  getAllStudentsInSystem: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/server/models/classroomModel", () => ({
  ...mocks,
}));

import {
  enrollStudentController,
  createClassroomController,
  deleteClassroomController,
  fetchClassrooms,
  fetchStudentsByRole,
  generateClassCodeController,
  getClassroomController,
  updateClassroomController,
} from "../classroomController";

const student = {
  id: "student-1",
  role: "STUDENT",
  schoolId: "00000000-0000-0000-0000-000000000001",
};
const teacher = {
  id: "teacher-1",
  role: "TEACHER",
  schoolId: "00000000-0000-0000-0000-000000000001",
};

function request(body?: unknown): NextRequest {
  return new Request("http://localhost/api/classroom/class-1", {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "content-type": "application/json" } : undefined,
  }) as NextRequest;
}

describe("classroom controller authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("denies student classroom operations before model access", async () => {
    mocks.currentUser.mockResolvedValue(student);
    const context = { params: Promise.resolve({ id: "class-1" }) };

    const responses = await Promise.all([
      fetchClassrooms(),
      fetchStudentsByRole(),
      getClassroomController(request(), context),
      updateClassroomController(request({ classroomName: "New name" }), context),
      enrollStudentController(request({ studentId: "student-2" }), context),
      generateClassCodeController(request({}), context),
    ]);
    await expect(createClassroomController("Class A")).rejects.toThrow(
      "FAILED_CREATE",
    );
    expect(await deleteClassroomController("class-1", student.id, student.role)).toEqual({
      success: false,
      error: "Insufficient permissions to delete classroom",
    });

    expect(responses.map((response) => response.status)).toEqual([
      403, 403, 403, 403, 403, 403,
    ]);
    expect(mocks.getAllClassrooms).not.toHaveBeenCalled();
    expect(mocks.createClassroom).not.toHaveBeenCalled();
    expect(mocks.deleteClassroom).not.toHaveBeenCalled();
    expect(mocks.getClassroomWithStudents).not.toHaveBeenCalled();
    expect(mocks.updateClassroom).not.toHaveBeenCalled();
    expect(mocks.enrollStudentInClassroom).not.toHaveBeenCalled();
    expect(mocks.generateClassCode).not.toHaveBeenCalled();
  });

  it("passes the teacher actor to owned classroom operations", async () => {
    mocks.currentUser.mockResolvedValue(teacher);
    mocks.getClassroomWithStudents.mockResolvedValue({ classroom: {} });
    mocks.enrollStudentInClassroom.mockResolvedValue({ id: "enrollment-1" });
    mocks.generateClassCode.mockResolvedValue({
      passwordStudents: "ABCD1234",
      codeExpiresAt: new Date(),
    });
    const context = { params: Promise.resolve({ id: "class-1" }) };
    mocks.createClassroom.mockResolvedValue({ success: true });

    await expect(createClassroomController("Class A")).resolves.toMatchObject({
      success: true,
    });
    expect((await getClassroomController(request(), context)).status).toBe(200);
    expect(
      (await enrollStudentController(request({ studentId: "student-2" }), context)).status,
    ).toBe(201);
    expect((await generateClassCodeController(request({}), context)).status).toBe(200);
    expect(mocks.getClassroomWithStudents).toHaveBeenCalledWith("class-1", teacher);
    expect(mocks.createClassroom).toHaveBeenCalledWith({
      name: "Class A",
      classCode: undefined,
      grade: undefined,
      actor: teacher,
    });
    expect(mocks.enrollStudentInClassroom).toHaveBeenCalledWith(
      "student-2",
      "class-1",
      teacher,
    );
    expect(mocks.generateClassCode).toHaveBeenCalledWith("class-1", teacher);
  });

  it("permits the admin student list path", async () => {
    const admin = { ...teacher, id: "admin-1", role: "ADMIN" };
    mocks.currentUser.mockResolvedValue(admin);
    mocks.getAllStudentsByAdmin.mockResolvedValue([]);

    const response = await fetchStudentsByRole();

    expect(response.status).toBe(200);
    expect(mocks.getAllStudentsByAdmin).toHaveBeenCalledWith(
      "admin-1",
      teacher.schoolId,
    );
  });

  it("returns not found when a teacher does not own the classroom", async () => {
    mocks.currentUser.mockResolvedValue(teacher);
    mocks.enrollStudentInClassroom.mockRejectedValue(
      new Error("Classroom not found or access denied"),
    );

    const response = await enrollStudentController(
      request({ studentId: "student-2" }),
      { params: Promise.resolve({ id: "foreign-class" }) },
    );

    expect(response.status).toBe(404);
  });
});
