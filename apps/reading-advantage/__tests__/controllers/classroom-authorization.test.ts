/**
 * Classroom Authorization Red Tests
 *
 * Proves that destructive classroom operations fail-closed across schools:
 * a teacher who does NOT own the classroom (and is not an admin of the same
 * school) must receive a 403, while the owning teacher and same-school admin
 * may proceed.
 *
 * Evidence refs: Reading C-007 / C-RA-CRIT-03; Reading migration C-1 / M-RA-SEC-1.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

var deleteMock: jest.Mock;
var selectMock: jest.Mock;
var fromMock: jest.Mock;
var whereMock: jest.Mock;
var limitMock: jest.Mock;
var returningMock: jest.Mock;

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");

  deleteMock = jest.fn();
  selectMock = jest.fn();
  fromMock = jest.fn();
  whereMock = jest.fn();
  limitMock = jest.fn();
  returningMock = jest.fn();

  const mockDb: any = {};
  mockDb.select = selectMock.mockImplementation(() => mockDb);
  mockDb.from = fromMock.mockImplementation(() => mockDb);
  mockDb.where = whereMock.mockImplementation(() => mockDb);
  mockDb.limit = limitMock.mockResolvedValue([]);
  mockDb.delete = deleteMock.mockImplementation(() => mockDb);
  mockDb.update = jest.fn().mockImplementation(() => mockDb);
  mockDb.insert = jest.fn().mockImplementation(() => mockDb);
  mockDb.returning = returningMock.mockResolvedValue([]);

  return {
    ...actual,
    db: mockDb,
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

import { getCurrentUser } from "@/lib/session";
import {
  deleteClassroom,
  patchClassroomUnenroll,
} from "@/server/controllers/classroom-controller";

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;

function makeRequest(
  classroomId: string,
  body?: object,
  method = "DELETE"
): ExtendedNextRequest {
  const url = `http://localhost:3000/api/v1/classrooms/${classroomId}`;
  const req = new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  }) as ExtendedNextRequest;
  return req;
}

function makeContext(classroomId: string) {
  return { params: Promise.resolve({ classroomId }) };
}

function setupClassroomRow(ownerTeacherId: string, schoolId: string | null) {
  const row = {
    id: "classroom-1",
    name: "Test Classroom",
    classCode: "ABC123",
    grade: 5,
    archived: false,
    createdAt: new Date(),
    createdBy: ownerTeacherId,
    teacherId: ownerTeacherId,
    schoolId,
    updatedAt: new Date(),
  };
  limitMock.mockResolvedValue([row]);
}

function setupUnenrollReturn(classroomId: string, studentId: string) {
  returningMock.mockResolvedValue([{ classroomId, studentId }]);
}

describe("classroom destructive authorization (Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    limitMock.mockResolvedValue([]);
    returningMock.mockResolvedValue([]);
  });

  it("cross-school teacher cannot delete a classroom (forbidden result count: expected 1)", async () => {
    const ownerId = "teacher-owner";
    const attackerId = "teacher-other-school";
    const schoolId = "school-a";

    setupClassroomRow(ownerId, schoolId);

    // Attacker is authenticated but from a different school / is not the owner.
    mockedGetCurrentUser.mockResolvedValue({
      id: attackerId,
      role: "TEACHER",
      schoolId: "school-b",
      license_id: "license-b",
    } as any);

    const res = await deleteClassroom(
      makeRequest("classroom-1"),
      makeContext("classroom-1")
    );

    expect(res.status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("owning teacher can delete their classroom (success result count: expected 1)", async () => {
    const ownerId = "teacher-owner";
    const schoolId = "school-a";

    setupClassroomRow(ownerId, schoolId);

    mockedGetCurrentUser.mockResolvedValue({
      id: ownerId,
      role: "TEACHER",
      schoolId,
      license_id: "license-a",
    } as any);

    const res = await deleteClassroom(
      makeRequest("classroom-1"),
      makeContext("classroom-1")
    );

    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalled();
  });

  it("admin of the same school can delete a classroom (success result count: expected 1)", async () => {
    const ownerId = "teacher-owner";
    const adminId = "admin-a";
    const schoolId = "school-a";

    setupClassroomRow(ownerId, schoolId);

    mockedGetCurrentUser.mockResolvedValue({
      id: adminId,
      role: "ADMIN",
      schoolId,
      license_id: "license-a",
    } as any);

    const res = await deleteClassroom(
      makeRequest("classroom-1"),
      makeContext("classroom-1")
    );

    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalled();
  });

  it("cross-school teacher cannot unenroll a student (forbidden result count: expected 1)", async () => {
    const ownerId = "teacher-owner";
    const attackerId = "teacher-other-school";
    const schoolId = "school-a";
    const studentId = "student-1";

    setupClassroomRow(ownerId, schoolId);
    setupUnenrollReturn("classroom-1", studentId);

    mockedGetCurrentUser.mockResolvedValue({
      id: attackerId,
      role: "TEACHER",
      schoolId: "school-b",
      license_id: "license-b",
    } as any);

    const res = await patchClassroomUnenroll(
      makeRequest("classroom-1", { studentId }, "PATCH"),
      makeContext("classroom-1")
    );

    expect(res.status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("owning teacher can unenroll a student (success result count: expected 1)", async () => {
    const ownerId = "teacher-owner";
    const schoolId = "school-a";
    const studentId = "student-1";

    setupClassroomRow(ownerId, schoolId);
    setupUnenrollReturn("classroom-1", studentId);

    mockedGetCurrentUser.mockResolvedValue({
      id: ownerId,
      role: "TEACHER",
      schoolId,
      license_id: "license-a",
    } as any);

    const res = await patchClassroomUnenroll(
      makeRequest("classroom-1", { studentId }, "PATCH"),
      makeContext("classroom-1")
    );

    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalled();
  });

  it("aggregated forbidden result count across delete+unenroll cross-school attempts is 2", async () => {
    const ownerId = "teacher-owner";
    const attackerId = "teacher-other-school";
    const schoolId = "school-a";
    const studentId = "student-1";

    setupClassroomRow(ownerId, schoolId);
    setupUnenrollReturn("classroom-1", studentId);

    mockedGetCurrentUser.mockResolvedValue({
      id: attackerId,
      role: "TEACHER",
      schoolId: "school-b",
      license_id: "license-b",
    } as any);

    const [deleteRes, unenrollRes] = await Promise.all([
      deleteClassroom(makeRequest("classroom-1"), makeContext("classroom-1")),
      patchClassroomUnenroll(
        makeRequest("classroom-1", { studentId }, "PATCH"),
        makeContext("classroom-1")
      ),
    ]);

    const forbiddenCount = [deleteRes, unenrollRes].filter(
      (r) => r.status === 403
    ).length;
    expect(forbiddenCount).toBe(2);
  });
});
