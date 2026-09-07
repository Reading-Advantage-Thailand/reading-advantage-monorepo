// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "./helpers/testDb";

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  const dbProxy = new Proxy(
    {},
    {
      get(_target, property) {
        const real = (globalThis as Record<string, unknown>).__TEST_DB__ as
          | Record<string | symbol, unknown>
          | undefined;
        if (!real) throw new Error("Test DB not initialized");
        const value = real[property];
        return typeof value === "function"
          ? (value as (...args: unknown[]) => unknown).bind(real)
          : value;
      },
    },
  );
  return { ...actual, db: dbProxy };
});

import {
  enrollStudentInClassroom,
  generateClassCode,
  getClassroomWithStudents,
} from "../classroomModel";

const SCHOOL_A = "00000000-0000-0000-0000-000000000001";
const SCHOOL_B = "00000000-0000-0000-0000-000000000002";
const CLASS_A = "00000000-0000-0000-0000-0000000000a1";

let harness: TestDb;

async function seedClassroom(): Promise<void> {
  await harness.db.execute(sql`INSERT INTO schools (id, name) VALUES (${SCHOOL_A}, 'A'), (${SCHOOL_B}, 'B')`);
  await harness.db.execute(sql`INSERT INTO users (id, username, display_username, name, role, school_id)
    VALUES
      ('teacher-a', 'teacher-a', 'teacher-a', 'Teacher A', 'TEACHER', ${SCHOOL_A}),
      ('teacher-b', 'teacher-b', 'teacher-b', 'Teacher B', 'TEACHER', ${SCHOOL_B}),
      ('admin-a', 'admin-a', 'admin-a', 'Admin A', 'ADMIN', ${SCHOOL_A}),
      ('student-a', 'student-a', 'student-a', 'Student A', 'STUDENT', ${SCHOOL_A}),
      ('student-b', 'student-b', 'student-b', 'Student B', 'STUDENT', ${SCHOOL_B})`);
  await harness.db.execute(sql`INSERT INTO classrooms (id, name, school_id, teacher_id)
    VALUES (${CLASS_A}, 'Class A', ${SCHOOL_A}, 'teacher-a')`);
  await harness.db.execute(sql`INSERT INTO classroom_teachers (classroom_id, teacher_id)
    VALUES (${CLASS_A}, 'teacher-a')`);
}

describe("classroom model authorization", () => {
  beforeAll(async () => {
    harness = await createTestDb();
  }, 60_000);

  afterEach(async () => harness.reset());
  afterAll(async () => harness.close());

  it("denies a foreign teacher and performs zero enrollment or code writes", async () => {
    await seedClassroom();
    const foreignTeacher = { id: "teacher-b", role: "TEACHER", schoolId: SCHOOL_B } as const;

    await expect(
      enrollStudentInClassroom("student-a", CLASS_A, foreignTeacher),
    ).rejects.toThrow("access denied");
    expect(await generateClassCode(CLASS_A, foreignTeacher)).toBeNull();

    const enrollmentCount = await harness.db.execute(
      sql`SELECT count(*)::int AS count FROM classroom_students`,
    );
    const classroomRows = await harness.db.execute(
      sql`SELECT password_students FROM classrooms WHERE id = ${CLASS_A}`,
    );
    expect(enrollmentCount.rows[0]?.count).toBe(0);
    expect(classroomRows.rows[0]?.password_students).toBeNull();
  });

  it("generates a secure uppercase and digit compatible login code", async () => {
    await seedClassroom();
    const randomSpy = vi.spyOn(crypto, "getRandomValues");

    const result = await generateClassCode(CLASS_A, {
      id: "teacher-a",
      role: "TEACHER",
      schoolId: SCHOOL_A,
    });

    expect(randomSpy).toHaveBeenCalled();
    expect(result?.passwordStudents).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("denies student reads", async () => {
    await seedClassroom();
    const studentActor = { id: "student-a", role: "STUDENT", schoolId: SCHOOL_A } as const;

    await expect(getClassroomWithStudents(CLASS_A, studentActor)).resolves.toBeNull();
  });

  it("permits the owner teacher and same-school admin", async () => {
    await seedClassroom();
    const teacher = { id: "teacher-a", role: "TEACHER", schoolId: SCHOOL_A } as const;
    const admin = { id: "admin-a", role: "ADMIN", schoolId: SCHOOL_A } as const;

    await expect(getClassroomWithStudents(CLASS_A, teacher)).resolves.toMatchObject({
      classroom: { id: CLASS_A, teacherId: "teacher-a" },
    });
    await expect(
      enrollStudentInClassroom("student-a", CLASS_A, admin),
    ).resolves.toMatchObject({ student: { id: "student-a" } });
  });

  it("rejects a student from another school before enrollment", async () => {
    await seedClassroom();
    const admin = { id: "admin-a", role: "ADMIN", schoolId: SCHOOL_A } as const;

    await expect(
      enrollStudentInClassroom("student-b", CLASS_A, admin),
    ).rejects.toThrow("invalid role");
    const enrollmentCount = await harness.db.execute(
      sql`SELECT count(*)::int AS count FROM classroom_students`,
    );
    expect(enrollmentCount.rows[0]?.count).toBe(0);
  });
});
