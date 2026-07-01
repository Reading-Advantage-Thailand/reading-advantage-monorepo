/**
 * Audit Events Red Tests
 *
 * Proves that destructive user/classroom/enrollment operations call
 * `recordAuditEvent` with actor, resource, and school context. Currently
 * reading-advantage has zero live callers of `recordAuditEvent`, so these
 * assertions fail with call count 0.
 *
 * Evidence refs: Reading C-RA-CRIT-03; Reading migration C-4 / M-RA-SEC-2.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

const recordAuditEventMock = jest.fn().mockResolvedValue(undefined);

var deleteMock: jest.Mock;
var selectMock: jest.Mock;
var fromMock: jest.Mock;
var whereMock: jest.Mock;
var limitMock: jest.Mock;
var returningMock: jest.Mock;
var insertMock: jest.Mock;
var updateMock: jest.Mock;
var transactionMock: jest.Mock;

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");

  deleteMock = jest.fn();
  selectMock = jest.fn();
  fromMock = jest.fn();
  whereMock = jest.fn();
  limitMock = jest.fn();
  returningMock = jest.fn();
  insertMock = jest.fn();
  updateMock = jest.fn();
  transactionMock = jest.fn();

  const mockDb: any = {};
  mockDb.select = selectMock.mockImplementation(() => mockDb);
  mockDb.from = fromMock.mockImplementation(() => mockDb);
  mockDb.where = whereMock.mockImplementation(() => mockDb);
  mockDb.limit = limitMock.mockResolvedValue([]);
  mockDb.delete = deleteMock.mockImplementation(() => mockDb);
  mockDb.update = updateMock.mockImplementation(() => mockDb);
  mockDb.insert = insertMock.mockImplementation(() => mockDb);
  mockDb.returning = returningMock.mockResolvedValue([]);
  mockDb.transaction = transactionMock.mockImplementation(async (fn: any) => fn(mockDb));

  return {
    ...actual,
    db: mockDb,
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@reading-advantage/auth", () => ({
  ...jest.requireActual("@reading-advantage/auth"),
  recordAuditEvent: recordAuditEventMock,
}));

import { getCurrentUser } from "@/lib/session";
import {
  deleteClassroom,
  patchClassroomUnenroll,
} from "@/server/controllers/classroom-controller";
import { deleteUser } from "@/server/controllers/user-controller";

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;

function makeRequest(
  path: string,
  body?: object,
  method = "DELETE"
): ExtendedNextRequest {
  const req = new NextRequest(`http://localhost:3000${path}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  }) as ExtendedNextRequest;
  return req;
}

function classroomContext(classroomId: string) {
  return { params: Promise.resolve({ classroomId }) };
}

describe("destructive operations emit audit events (Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recordAuditEventMock.mockResolvedValue(undefined);
    limitMock.mockResolvedValue([]);
    returningMock.mockResolvedValue([]);
  });

  it("deleteClassroom calls recordAuditEvent with actor/resource/school (expected call count: 1)", async () => {
    const ownerId = "teacher-owner";
    const schoolId = "school-a";
    const classroomId = "classroom-1";

    limitMock.mockResolvedValue([
      {
        id: classroomId,
        name: "Test Classroom",
        teacherId: ownerId,
        schoolId,
      },
    ]);

    mockedGetCurrentUser.mockResolvedValue({
      id: ownerId,
      role: "TEACHER",
      schoolId,
      license_id: "license-a",
    } as any);

    const res = await deleteClassroom(
      makeRequest(`/api/v1/classrooms/${classroomId}`),
      classroomContext(classroomId)
    );

    expect(res.status).toBe(200);

    const auditCallCount = recordAuditEventMock.mock.calls.length;
    expect(auditCallCount).toBeGreaterThan(0);

    const lastCall = recordAuditEventMock.mock.calls[auditCallCount - 1];
    const [ctx, payload] = lastCall;
    expect(ctx.actorUserId).toBe(ownerId);
    expect(ctx.actorRole).toBe("TEACHER");
    expect(payload.action).toMatch(/classroom:delete|class:delete/i);
    expect(payload.targetType).toBe("classroom");
    expect(payload.targetId).toBe(classroomId);
    expect(payload.metadata?.schoolId).toBe(schoolId);
  });

  it("patchClassroomUnenroll calls recordAuditEvent with actor/resource/student/school (expected call count: 1)", async () => {
    const ownerId = "teacher-owner";
    const schoolId = "school-a";
    const classroomId = "classroom-1";
    const studentId = "student-1";

    limitMock.mockResolvedValue([
      {
        id: classroomId,
        name: "Test Classroom",
        teacherId: ownerId,
        schoolId,
      },
    ]);
    returningMock.mockResolvedValue([{ classroomId, studentId }]);

    mockedGetCurrentUser.mockResolvedValue({
      id: ownerId,
      role: "TEACHER",
      schoolId,
      license_id: "license-a",
    } as any);

    const res = await patchClassroomUnenroll(
      makeRequest(
        `/api/v1/classrooms/${classroomId}`,
        { studentId },
        "PATCH"
      ),
      classroomContext(classroomId)
    );

    expect(res.status).toBe(200);

    const auditCallCount = recordAuditEventMock.mock.calls.length;
    expect(auditCallCount).toBeGreaterThan(0);

    const lastCall = recordAuditEventMock.mock.calls[auditCallCount - 1];
    const [ctx, payload] = lastCall;
    expect(ctx.actorUserId).toBe(ownerId);
    expect(ctx.actorRole).toBe("TEACHER");
    expect(payload.action).toMatch(/classroom:unenroll|class:remove_student/i);
    expect(payload.targetId).toBe(classroomId);
    expect(payload.metadata?.studentId).toBe(studentId);
  });

  it("deleteUser calls recordAuditEvent with actor/resource/school (expected call count: 1)", async () => {
    const adminId = "admin-a";
    const schoolId = "school-a";
    const userId = "student-1";

    limitMock.mockResolvedValue([
      {
        id: userId,
        name: "Student One",
        role: "STUDENT",
        schoolId,
      },
    ]);

    mockedGetCurrentUser.mockResolvedValue({
      id: adminId,
      role: "ADMIN",
      schoolId,
      license_id: "license-a",
    } as any);

    const res = await deleteUser(
      makeRequest("/api/v1/users/delete", { id: userId }, "POST")
    );

    expect(res.status).toBe(200);

    const auditCallCount = recordAuditEventMock.mock.calls.length;
    expect(auditCallCount).toBeGreaterThan(0);

    const lastCall = recordAuditEventMock.mock.calls[auditCallCount - 1];
    const [ctx, payload] = lastCall;
    expect(ctx.actorUserId).toBe(adminId);
    expect(ctx.actorRole).toBe("ADMIN");
    expect(payload.action).toMatch(/user:delete/i);
    expect(payload.targetType).toBe("user");
    expect(payload.targetId).toBe(userId);
    expect(payload.metadata?.schoolId).toBe(schoolId);
  });

  it("aggregated audit event count across the three destructive successes is 3", async () => {
    const ownerId = "teacher-owner";
    const adminId = "admin-a";
    const schoolId = "school-a";
    const classroomId = "classroom-1";
    const studentId = "student-1";

    limitMock.mockResolvedValue([
      {
        id: classroomId,
        name: "Test Classroom",
        teacherId: ownerId,
        schoolId,
      },
    ]);

    mockedGetCurrentUser.mockResolvedValue({
      id: ownerId,
      role: "TEACHER",
      schoolId,
      license_id: "license-a",
    } as any);

    await deleteClassroom(
      makeRequest(`/api/v1/classrooms/${classroomId}`),
      classroomContext(classroomId)
    );

    returningMock.mockResolvedValue([{ classroomId, studentId }]);
    await patchClassroomUnenroll(
      makeRequest(
        `/api/v1/classrooms/${classroomId}`,
        { studentId },
        "PATCH"
      ),
      classroomContext(classroomId)
    );

    limitMock.mockResolvedValue([
      {
        id: studentId,
        name: "Student One",
        role: "STUDENT",
        schoolId,
      },
    ]);
    mockedGetCurrentUser.mockResolvedValue({
      id: adminId,
      role: "ADMIN",
      schoolId,
      license_id: "license-a",
    } as any);

    await deleteUser(
      makeRequest("/api/v1/users/delete", { id: studentId }, "POST")
    );

    expect(recordAuditEventMock).toHaveBeenCalledTimes(3);
  });
});
