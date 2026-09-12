import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createTenantDB, type TenantDB } from "../db-contract.js";
import { listOwnedChallengeClasses, listStudentChallengeClasses } from "../challenges/queries.js";

vi.mock("@reading-advantage/auth", () => ({
  assertCan: vi.fn(),
  ROLES: { STUDENT: "STUDENT", TEACHER: "TEACHER", ADMIN: "ADMIN", SYSTEM: "SYSTEM" },
  registerDomainModulePermissions: vi.fn(),
}));

const SCHOOL_A = "10000000-0000-4000-8000-000000000001";
const SCHOOL_B = "10000000-0000-4000-8000-000000000002";
const STUDENT_A = "student-a";

describe("student challenge class discovery with PGlite", () => {
  let client: PGlite;
  let rawDb: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    client = new PGlite();
    rawDb = drizzle(client);
    await client.exec(`
      CREATE TABLE schools (id uuid PRIMARY KEY);
      CREATE TABLE users (id text PRIMARY KEY, school_id uuid REFERENCES schools(id));
      CREATE TABLE classrooms (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        school_id uuid REFERENCES schools(id),
        teacher_id text NOT NULL,
        archived boolean DEFAULT false NOT NULL
      );
      CREATE TABLE classroom_students (
        id uuid PRIMARY KEY,
        classroom_id uuid NOT NULL REFERENCES classrooms(id),
        student_id text NOT NULL REFERENCES users(id),
        joined_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT classroom_students_unique UNIQUE (classroom_id, student_id)
      );
      INSERT INTO schools (id) VALUES ('${SCHOOL_A}'), ('${SCHOOL_B}');
      INSERT INTO users (id, school_id) VALUES
        ('${STUDENT_A}', '${SCHOOL_A}'),
        ('student-a2', '${SCHOOL_A}'),
        ('teacher-a', '${SCHOOL_A}'),
        ('teacher-b', '${SCHOOL_A}');
      INSERT INTO classrooms (id, name, school_id, teacher_id, archived) VALUES
        ('20000000-0000-4000-8000-000000000001', 'Alpha', '${SCHOOL_A}', 'teacher-a', false),
        ('20000000-0000-4000-8000-000000000002', 'Beta', '${SCHOOL_A}', 'teacher-a', false),
        ('20000000-0000-4000-8000-000000000003', 'Gamma', '${SCHOOL_A}', 'teacher-a', false),
        ('20000000-0000-4000-8000-000000000004', 'Archived', '${SCHOOL_A}', 'teacher-a', true),
        ('20000000-0000-4000-8000-000000000005', 'Other teacher', '${SCHOOL_A}', 'teacher-b', false),
        ('20000000-0000-4000-8000-000000000006', 'Foreign', '${SCHOOL_B}', 'teacher-a', false);
      INSERT INTO classroom_students (id, classroom_id, student_id) VALUES
        ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '${STUDENT_A}'),
        ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '${STUDENT_A}'),
        ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '${STUDENT_A}'),
        ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', '${STUDENT_A}'),
        ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000005', 'student-a2'),
        ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000006', '${STUDENT_A}');
    `);
  }, 30_000);

  afterAll(async () => client?.close());

  it("filters memberships and pages active tenant classes", async () => {
    const unscoped = vi.fn(() => rawDb);
    const db = { unscoped } as unknown as TenantDB;
    const student = { id: STUDENT_A, role: "STUDENT" as const, schoolId: SCHOOL_A };

    await expect(listStudentChallengeClasses({
      db,
      user: student as never,
      tenant: { schoolId: SCHOOL_A },
      input: { limit: 2, offset: 0 },
    })).resolves.toEqual({
      classes: [
        { id: "20000000-0000-4000-8000-000000000001", name: "Alpha" },
        { id: "20000000-0000-4000-8000-000000000002", name: "Beta" },
      ],
      hasMore: true,
    });

    await expect(listStudentChallengeClasses({
      db,
      user: student as never,
      tenant: { schoolId: SCHOOL_A },
      input: { limit: 2, offset: 2 },
    })).resolves.toEqual({
      classes: [{ id: "20000000-0000-4000-8000-000000000003", name: "Gamma" }],
      hasMore: false,
    });

    unscoped.mockClear();
    await expect(listStudentChallengeClasses({
      db,
      user: student as never,
      tenant: { schoolId: SCHOOL_B },
      input: {},
    })).rejects.toThrow("Forbidden");
    await expect(listStudentChallengeClasses({
      db,
      user: { ...student, role: "TEACHER" } as never,
      tenant: { schoolId: SCHOOL_A },
      input: {},
    })).rejects.toThrow("Forbidden");
    expect(unscoped).not.toHaveBeenCalled();
  }, 30_000);

  it("limits teacher discovery to owned tenant classes", async () => {
    const db = createTenantDB(rawDb as never, { schoolId: SCHOOL_A });
    const teacher = { id: "teacher-a", role: "TEACHER" as const, schoolId: SCHOOL_A };

    await expect(listOwnedChallengeClasses({
      db,
      user: teacher as never,
      tenant: { schoolId: SCHOOL_A },
      input: { limit: 2, offset: 0 },
    })).resolves.toEqual({
      classes: [
        { id: "20000000-0000-4000-8000-000000000001", name: "Alpha" },
        { id: "20000000-0000-4000-8000-000000000002", name: "Beta" },
      ],
      hasMore: true,
    });
    await expect(listOwnedChallengeClasses({
      db,
      user: teacher as never,
      tenant: { schoolId: SCHOOL_A },
      input: { limit: 2, offset: 2 },
    })).resolves.toEqual({
      classes: [{ id: "20000000-0000-4000-8000-000000000003", name: "Gamma" }],
      hasMore: false,
    });

    const admin = { id: "admin-a", role: "ADMIN" as const, schoolId: SCHOOL_A };
    const adminPage = await listOwnedChallengeClasses({
      db,
      user: admin as never,
      tenant: { schoolId: SCHOOL_A },
      input: { limit: 25, offset: 0 },
    });
    expect(adminPage.classes.map(({ name }) => name)).toEqual(["Alpha", "Beta", "Gamma", "Other teacher"]);

    const blockedDb = { select: vi.fn() } as unknown as TenantDB;
    await expect(listOwnedChallengeClasses({
      db: blockedDb,
      user: { ...teacher, role: "STUDENT" } as never,
      tenant: { schoolId: SCHOOL_A },
      input: {},
    })).rejects.toThrow("Forbidden");
    await expect(listOwnedChallengeClasses({
      db: blockedDb,
      user: teacher as never,
      tenant: { schoolId: SCHOOL_B },
      input: {},
    })).rejects.toThrow("Forbidden");
    expect(blockedDb.select).not.toHaveBeenCalled();
  }, 30_000);
});
