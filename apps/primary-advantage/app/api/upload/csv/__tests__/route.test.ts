// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const tables = {
    users: { id: "users.id" },
    schools: { id: "schools.id", name: "schools.name" },
    roles: {},
    classrooms: {},
    classroomStudents: {},
    classroomTeachers: {},
    userRoles: {},
  };
  return { currentUser: vi.fn(), select: vi.fn(), insert: vi.fn(), tables };
});

vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.currentUser }));
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
    limit: vi.fn().mockResolvedValue(rows),
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

const request = {
  formData: vi.fn().mockResolvedValue({ get: () => null }),
} as unknown as NextRequest;

describe("user CSV upload authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("denies a student before any write", async () => {
    mocks.currentUser.mockResolvedValue({ id: "student-1", role: "STUDENT" });
    mocks.select.mockReturnValueOnce(selectResult([{ id: "student-1", schoolId: null }]));

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("allows a teacher and reads the school from the schools table", async () => {
    const schoolId = "00000000-0000-0000-0000-000000000001";
    mocks.currentUser.mockResolvedValue({ id: "teacher-1", role: "TEACHER" });
    mocks.select
      .mockReturnValueOnce(selectResult([{ id: "teacher-1", schoolId }]))
      .mockReturnValueOnce(selectResult([{ id: schoolId, name: "School A" }]));

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mocks.select.mock.results[1]?.value.from).toHaveBeenCalledWith(
      mocks.tables.schools,
    );
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("allows a system actor without a school", async () => {
    mocks.currentUser.mockResolvedValue({ id: "system-1", role: "SYSTEM" });
    mocks.select.mockReturnValueOnce(selectResult([{ id: "system-1", schoolId: null }]));

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
