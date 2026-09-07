// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const tables = {
    users: { id: "users.id", email: "users.email" },
    schools: { id: "schools.id", name: "schools.name" },
    roles: { id: "roles.id", name: "roles.name" },
    classrooms: { id: "classrooms.id", name: "classrooms.name", schoolId: "classrooms.schoolId" },
    classroomStudents: { classroomId: "classroomStudents.classroomId", studentId: "classroomStudents.studentId" },
    classroomTeachers: { classroomId: "classroomTeachers.classroomId", teacherId: "classroomTeachers.teacherId" },
    userRoles: { userId: "userRoles.userId", roleId: "userRoles.roleId" },
  };
  return {
    currentUser: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    parse: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    existsSync: vi.fn(() => true),
    unlink: vi.fn(),
    tables,
  };
});

vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("csv/sync", () => ({ parse: mocks.parse }));
vi.mock("fs/promises", () => ({ writeFile: mocks.writeFile, mkdir: mocks.mkdir }));
vi.mock("fs", () => ({ existsSync: mocks.existsSync, unlink: mocks.unlink }));
vi.mock("@reading-advantage/db", () => ({
  db: { select: mocks.select, insert: mocks.insert },
  ...mocks.tables,
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  inArray: vi.fn(() => ({})),
  or: vi.fn(() => ({})),
  ilike: vi.fn(() => ({})),
}));

import { POST } from "../route";

function selectResult(rows: unknown[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    innerJoin: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

function uploadRequest(name: string): NextRequest {
  const file = {
    name,
    size: 100,
    type: "text/csv",
    arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode("csv").buffer),
  };
  return { formData: vi.fn().mockResolvedValue({ get: () => file }) } as unknown as NextRequest;
}

describe("combined classroom and user CSV upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.existsSync.mockReturnValue(true);
  });

  it("denies a student before any write", async () => {
    mocks.currentUser.mockResolvedValue({ id: "student-1", role: "STUDENT" });
    mocks.select.mockReturnValueOnce(selectResult([{ id: "student-1", schoolId: null }]));

    const response = await POST(uploadRequest("students.csv"));

    expect(response.status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("imports a student with required account fields and a school-scoped role", async () => {
    const schoolId = "00000000-0000-0000-0000-000000000001";
    mocks.currentUser.mockResolvedValue({ id: "teacher-1", role: "TEACHER" });
    mocks.parse.mockReturnValue([
      {
        name: "Student One",
        email: "student@example.com",
        classroom_name: "Class A",
        role: "student",
      },
    ]);
    const results = [
      [{ id: "teacher-1", schoolId }],
      [{ id: schoolId, name: "School A" }],
      [],
      [{ name: "Class A" }],
      [{ id: "role-student", name: "student" }],
      [{ id: "student-1", email: "student@example.com" }],
      [{ id: "class-1", name: "Class A" }],
    ];
    for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));

    const insertedValues: unknown[] = [];
    mocks.insert.mockImplementation((table) => {
      const chain = {
        values: vi.fn((values) => {
          insertedValues.push({ table, values });
          return chain;
        }),
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      };
      return chain;
    });

    const response = await POST(uploadRequest("students.csv"));

    expect(response.status).toBe(200);
    const userWrite = insertedValues.find(
      (entry) => (entry as { table: unknown }).table === mocks.tables.users,
    ) as { values: Array<Record<string, unknown>> };
    expect(userWrite.values[0]).toMatchObject({
      username: "student@example.com",
      displayUsername: "student@example.com",
      role: "STUDENT",
      schoolId,
    });
    expect(userWrite.values[0].id).toEqual(expect.any(String));
    expect(mocks.select.mock.results[1]?.value.from).toHaveBeenCalledWith(
      mocks.tables.schools,
    );
  });

  it("rejects a role that does not match the upload filename", async () => {
    const schoolId = "00000000-0000-0000-0000-000000000001";
    mocks.currentUser.mockResolvedValue({ id: "teacher-1", role: "TEACHER" });
    mocks.parse.mockReturnValue([
      {
        name: "Unexpected Admin",
        email: "admin@example.com",
        classroom_name: "Class A",
        role: "admin",
      },
    ]);
    mocks.select
      .mockReturnValueOnce(selectResult([{ id: "teacher-1", schoolId }]))
      .mockReturnValueOnce(selectResult([{ id: schoolId, name: "School A" }]));

    const response = await POST(uploadRequest("students.csv"));

    expect(response.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("writes required classroom ownership fields", async () => {
    const schoolId = "00000000-0000-0000-0000-000000000001";
    mocks.currentUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mocks.parse.mockReturnValue([{ classroom_name: "Class A" }]);
    const results = [
      [{ id: "admin-1", schoolId }],
      [{ id: schoolId, name: "School A" }],
      [],
    ];
    for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));

    let classroomValues: Array<Record<string, unknown>> = [];
    mocks.insert.mockImplementation((table) => {
      const chain = {
        values: vi.fn((values) => {
          if (table === mocks.tables.classrooms) classroomValues = values;
          return chain;
        }),
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      };
      return chain;
    });

    const response = await POST(uploadRequest("classes.csv"));

    expect(response.status).toBe(200);
    expect(classroomValues[0]).toMatchObject({
      schoolId,
      teacherId: "admin-1",
      createdBy: "admin-1",
    });
  });
});
