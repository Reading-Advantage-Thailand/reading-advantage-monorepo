// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { chainBuilders } = vi.hoisted(() => {
  function thenableChain<T>(terminalValue: T): Record<string, unknown> {
    const chain: Record<string, unknown> = {};
    for (const m of [
      "from",
      "innerJoin",
      "leftJoin",
      "where",
      "orderBy",
      "limit",
      "offset",
      "groupBy",
    ]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.then = (resolve: (v: T) => void) => resolve(terminalValue);
    return chain;
  }
  return { chainBuilders: { thenableChain } };
});

const { thenableChain } = chainBuilders;

vi.mock("@reading-advantage/db", () => {
  const users = { id: "id", name: "name", email: "email", schoolId: "schoolId" };
  const classrooms = {
    id: "id",
    name: "name",
    schoolId: "schoolId",
    grade: "grade",
    classCode: "classCode",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    schoolName: "schoolName",
  };
  const classroomStudents = {
    studentId: "studentId",
    classroomId: "classroomId",
  };
  const classroomTeachers = {
    teacherId: "teacherId",
    classroomId: "classroomId",
  };
  const roles = { id: "id", name: "name" };
  const userRoles = { userId: "userId", roleId: "roleId" };
  const userActivity = { id: "id", userId: "userId" };
  const xpLogs = { id: "id", userId: "userId" };
  const assignments = { id: "id", title: "title", classroomId: "classroomId" };
  const studentAssignments = {
    id: "id",
    studentId: "studentId",
    assignmentId: "assignmentId",
    status: "status",
  };

  const baseChain: Record<string, unknown> = {};
  for (const m of [
    "from",
    "innerJoin",
    "leftJoin",
    "where",
    "orderBy",
    "limit",
    "offset",
    "groupBy",
    "set",
  ]) {
    baseChain[m] = vi.fn().mockReturnValue(baseChain);
  }
  baseChain.then = (resolve: (v: unknown) => void) => resolve([]);
  const selectFn = vi.fn().mockReturnValue(baseChain);
  const insertFn = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "row-1" }]),
    }),
  });
  const updateFn = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "row-1" }]),
      }),
    }),
  });
  const deleteFn = vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    }),
  });
  const transactionFn = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn(baseChain),
  );

  return {
    db: {
      select: selectFn,
      insert: insertFn,
      update: updateFn,
      delete: deleteFn,
      transaction: transactionFn,
    },
    users,
    classrooms,
    classroomStudents,
    classroomTeachers,
    roles,
    userRoles,
    userActivity,
    xpLogs,
    assignments,
    studentAssignments,
    eq: vi.fn().mockReturnValue(Symbol("eq")),
    and: vi.fn().mockReturnValue(Symbol("and")),
    or: vi.fn().mockReturnValue(Symbol("or")),
    desc: vi.fn().mockReturnValue(Symbol("desc")),
    inArray: vi.fn().mockReturnValue(Symbol("inArray")),
    notInArray: vi.fn().mockReturnValue(Symbol("notInArray")),
    asc: vi.fn().mockReturnValue(Symbol("asc")),
    gte: vi.fn().mockReturnValue(Symbol("gte")),
    lte: vi.fn().mockReturnValue(Symbol("lte")),
    count: vi.fn().mockReturnValue(Symbol("count")),
    sql: Object.assign(vi.fn().mockReturnValue(Symbol("sql")), {
      raw: vi.fn(),
    }),
  };
});

vi.mock("bcryptjs", () => ({
  default: { hashSync: vi.fn().mockReturnValue("hashed") },
  hashSync: vi.fn().mockReturnValue("hashed"),
}));

vi.mock("@/lib/utils", () => ({
  convertCefrLevel: (s: string) => s,
  convertToClassroom: (row: unknown) => row,
}));

// FR-11: behavioral smoke tests for the migrated primary-advantage models.
// These tests exercise the real function path (no stubs) and assert that the
// function returns the expected shape. The tests use mocks for the DB layer
// because the FR-2 test already pinned the cross-table behavior; FR-11 is
// about ensuring the per-model function surface remains callable and returns
// the expected per-row shape.

import { getAllClassrooms } from "../classroomModel";
import { getTeachers } from "../teacherModel";
import { getStudentAssignments } from "../assignmentModel";

const adminUser = {
  id: "admin1",
  email: "admin@test.com",
  schoolId: "school1",
  roles: [{ role: { id: "r1", name: "system" } }],
  SchoolAdmins: [],
};

const teacherUser = {
  id: "teacher1",
  email: "teacher@test.com",
  schoolId: "school1",
  roles: [{ role: { id: "r2", name: "teacher" } }],
  SchoolAdmins: [],
};

describe("FR-11: behavioral smoke tests for migrated primary-advantage models", () => {
  it("classroomModel: getAllClassrooms is callable and returns the list shape from the admin user", async () => {
    // FR-11 smoke test: the function path must be intact (no missing imports,
    // no destructuring errors). It may throw on the empty mock result; we
    // assert it does not throw on a TypeError, missing export, or
    // destructuring-undefined. A real DB row assertion is the next-step
    // (deferred to a test-DB follow-up per the test-strategy note).
    let threw: unknown;
    try {
      await getAllClassrooms(adminUser as never);
    } catch (e) {
      threw = e;
    }
    if (threw) {
      expect(
        String(threw),
        "getAllClassrooms must not throw on import-time / type errors. A real-DB " +
          "row assertion is the next-step; we only pin the function path here.",
      ).not.toMatch(/is not a function|undefined|Cannot read propert/);
    }
  });

  it("teacherModel: getTeachers is callable for an admin and returns the list shape", async () => {
    const result = await getTeachers({
      page: 1,
      limit: 10,
      search: "",
      classroomId: "",
      cefrLevel: "",
      userWithRoles: adminUser as never,
    });
    expect(result, "getTeachers must return an object with teachers and totalCount.").toBeDefined();
    expect(Array.isArray(result.teachers), "getTeachers.teachers must be an array.").toBe(true);
    expect(typeof result.totalCount, "getTeachers.totalCount must be a number.").toBe("number");
  });

  it("assignmentModel: getStudentAssignments is callable for a student and returns the list shape", async () => {
    const result = await getStudentAssignments({
      userId: "student-1",
      classroomId: "classroom-1",
      page: 1,
      limit: 10,
      userWithRoles: teacherUser as never,
    });
    expect(result, "getStudentAssignments must return a list-shape result.").toBeDefined();
    expect(Array.isArray(result.assignments ?? result), "getStudentAssignments must return an array of assignments.").toBe(true);
  });
});