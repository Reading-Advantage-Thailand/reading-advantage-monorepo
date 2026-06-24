import { describe, it, expect, vi, beforeEach } from "vitest";

const { studentRows, countResult, callCounter, createChain } = vi.hoisted(() => {
  const studentRows = [
    {
      id: "s1",
      name: "Alice",
      email: "alice@test.com",
      cefrLevel: "A1",
      xp: 100,
      level: 2,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      classroomId: "c1",
      classroomName: "Math",
    },
    {
      id: "s1",
      name: "Alice",
      email: "alice@test.com",
      cefrLevel: "A1",
      xp: 100,
      level: 2,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      classroomId: "c2",
      classroomName: "Science",
    },
    {
      id: "s2",
      name: "Bob",
      email: "bob@test.com",
      cefrLevel: "B1",
      xp: 200,
      level: 3,
      createdAt: new Date("2026-01-02T00:00:00Z"),
      classroomId: "c3",
      classroomName: "English",
    },
  ];

  const countResult = [{ value: 2 }];

  let count = 0;
  const callCounter = {
    next: () => ++count,
    reset: () => {
      count = 0;
    },
  };

  const createChain = (result: unknown[]) => {
    const chain: Record<string, unknown> = {};
    for (const m of [
      "from",
      "innerJoin",
      "leftJoin",
      "where",
      "orderBy",
      "limit",
      "offset",
    ]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.then = (resolve: (v: unknown) => void) => resolve(result);
    return chain;
  };

  return { studentRows, countResult, callCounter, createChain };
});

vi.mock("@reading-advantage/db", () => {
  const col = (name: string) => Symbol(name);

  const users = {
    id: col("id"),
    name: col("name"),
    email: col("email"),
    cefrLevel: col("cefrLevel"),
    xp: col("xp"),
    level: col("level"),
    createdAt: col("createdAt"),
    schoolId: col("schoolId"),
    password: col("password"),
  };
  const classrooms = {
    id: col("id"),
    name: col("name"),
    schoolId: col("schoolId"),
  };
  const classroomStudents = {
    studentId: col("studentId"),
    classroomId: col("classroomId"),
  };
  const roles = { id: col("id"), name: col("name") };
  const userRoles = { userId: col("userId"), roleId: col("roleId") };
  const userActivity = {
    id: col("id"),
    userId: col("userId"),
    createdAt: col("createdAt"),
  };
  const xpLogs = { id: col("id"), userId: col("userId") };

  return {
    db: {
      select: vi.fn().mockImplementation(() => {
        const n = callCounter.next();
        return n === 1 ? createChain(studentRows) : createChain(countResult);
      }),
      transaction: vi.fn(),
    },
    eq: vi.fn().mockReturnValue(Symbol("eq")),
    and: vi.fn().mockReturnValue(Symbol("and")),
    desc: vi.fn().mockReturnValue(Symbol("desc")),
    inArray: vi.fn().mockReturnValue(Symbol("inArray")),
    gte: vi.fn().mockReturnValue(Symbol("gte")),
    count: vi.fn().mockReturnValue(Symbol("count")),
    sql: Object.assign(vi.fn().mockReturnValue(Symbol("sql")), {
      raw: vi.fn(),
    }),
    users,
    classrooms,
    classroomStudents,
    roles,
    userRoles,
    userActivity,
    xpLogs,
  };
});

vi.mock("bcryptjs", () => ({
  default: { hashSync: vi.fn().mockReturnValue("hashed") },
  hashSync: vi.fn().mockReturnValue("hashed"),
}));

import { getStudents } from "../studentModel";

const adminUser = {
  id: "admin1",
  email: "admin@test.com",
  schoolId: "school1",
  roles: [{ role: { id: "r1", name: "system" } }],
  SchoolAdmins: [],
};

describe("getStudents — FR-2 duplicate-row fan-out", () => {
  beforeEach(() => {
    callCounter.reset();
  });

  it("returns one row per distinct student, not per classroom enrollment", async () => {
    const { students } = await getStudents({
      page: 1,
      limit: 10,
      search: "",
      classroomId: "",
      cefrLevel: "",
      userWithRoles: adminUser as any,
    });

    expect(students).toHaveLength(2);
  });

  it("list length equals totalCount (no mismatch from fan-out)", async () => {
    const { students, totalCount } = await getStudents({
      page: 1,
      limit: 10,
      search: "",
      classroomId: "",
      cefrLevel: "",
      userWithRoles: adminUser as any,
    });

    expect(students).toHaveLength(totalCount);
  });
});
