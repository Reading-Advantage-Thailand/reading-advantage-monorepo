// @vitest-environment node
/**
 * FR-2: behavioral tests for the migrated primary-advantage models against a
 * REAL in-process Postgres (PGlite). Unlike the prior fr11.behavior.test.ts
 * (which mocked @reading-advantage/db and asserted only callability/shape — and
 * even called getStudentAssignments with the wrong `userId` param), these insert
 * real rows and assert the queries return the seeded data.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "./helpers/testDb";

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  const dbProxy = new Proxy(
    {},
    {
      get(_t, prop) {
        const real = (globalThis as Record<string, unknown>).__TEST_DB__ as
          | Record<string | symbol, unknown>
          | undefined;
        if (!real) throw new Error("Test DB not initialized");
        const v = real[prop];
        return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
      },
    },
  );
  return { ...actual, db: dbProxy };
});

vi.mock("bcryptjs", () => ({
  default: { hashSync: vi.fn().mockReturnValue("hashed") },
  hashSync: vi.fn().mockReturnValue("hashed"),
}));

import { getAllClassrooms } from "../classroomModel";
import { getTeachers } from "../teacherModel";
import { getStudentAssignments } from "../assignmentModel";

const systemAdmin = {
  id: "admin1",
  email: "admin@test.com",
  schoolId: "school1",
  roles: [{ role: { id: "r1", name: "system" } }],
  SchoolAdmins: [],
} as never;

let h: TestDb;

const C1 = "00000000-0000-0000-0000-0000000000c1";
const C2 = "00000000-0000-0000-0000-0000000000c2";
const ROLE_TEACHER = "00000000-0000-0000-0000-0000000000b1";

async function seedTeacherAndClassrooms() {
  await h.db.execute(sql`INSERT INTO roles (id, name) VALUES (${ROLE_TEACHER}, 'teacher')`);
  await h.db.execute(sql`INSERT INTO users (id, username, display_username, name, email, role, created_at)
    VALUES ('t1','t1','t1','Ms Teacher','t1@x.com','TEACHER', now())`);
  await h.db.execute(sql`INSERT INTO user_roles (user_id, role_id) VALUES ('t1', ${ROLE_TEACHER})`);
  await h.db.execute(sql`INSERT INTO classrooms (id, name, teacher_id, created_at) VALUES
    (${C1},'Math 101','t1', '2026-01-01T00:00:00Z'),
    (${C2},'Science 201','t1', '2026-01-02T00:00:00Z')`);
}

describe("migrated primary-advantage models — behavioral (PGlite)", () => {
  beforeAll(async () => {
    h = await createTestDb();
  }, 60_000);
  afterAll(async () => {
    await h.close();
  });
  afterEach(async () => {
    await h.reset();
  });

  it("classroomModel.getAllClassrooms returns the seeded classrooms by name", async () => {
    await seedTeacherAndClassrooms();

    const result = await getAllClassrooms(systemAdmin);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    const names = (result as Array<{ name: string }>).map((c) => c.name).sort();
    expect(names).toEqual(["Math 101", "Science 201"]);
  });

  it("teacherModel.getTeachers returns the seeded teacher with a matching totalCount", async () => {
    await seedTeacherAndClassrooms();

    const { teachers, totalCount } = await getTeachers({
      page: 1,
      limit: 10,
      search: "",
      role: "",
      userWithRoles: systemAdmin,
    } as never);

    expect(totalCount).toBe(1);
    expect(teachers).toHaveLength(1);
    expect(teachers[0]).toMatchObject({ id: "t1", name: "Ms Teacher" });
  });

  it("assignmentModel.getStudentAssignments returns the student's seeded assignment", async () => {
    await seedTeacherAndClassrooms();
    await h.db.execute(sql`INSERT INTO users (id, username, display_username, name, role, created_at)
      VALUES ('stu1','stu1','stu1','Student One','STUDENT', now())`);
    const A1 = "00000000-0000-0000-0000-0000000000d1";
    await h.db.execute(sql`INSERT INTO assignments (id, title, classroom_id, teacher_id, type, created_at)
      VALUES (${A1}, 'Chapter 1 Reading', ${C1}, 't1', 'reading', now())`);
    await h.db.execute(sql`INSERT INTO student_assignments (assignment_id, student_id, status, created_at)
      VALUES (${A1}, 'stu1', 'NOT_STARTED', now())`);

    const result = await getStudentAssignments({
      studentId: "stu1",
      page: 1,
      limit: 10,
    });

    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].assignment?.title).toBe("Chapter 1 Reading");
    expect(result.pagination.totalCount).toBe(1);
  });
});
