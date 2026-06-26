// @vitest-environment node
/**
 * FR-1 / FR-2: behavioral pagination test for getStudents against a REAL
 * in-process Postgres (PGlite). This is the test the prior track's mock-based
 * studentModel.fr2.test.ts could not be: it exercises genuine LIMIT/OFFSET over
 * a fan-out leftJoin, so it FAILS on the row-based pagination bug (a page of
 * `limit` rows yields fewer than `limit` distinct students when enrollments fan
 * out) and passes only once pagination is keyed to distinct students.
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

import { getStudents } from "../studentModel";

const systemAdmin = {
  id: "admin1",
  email: "admin@test.com",
  schoolId: "school1",
  roles: [{ role: { id: "r1", name: "system" } }],
  SchoolAdmins: [],
} as never;

let h: TestDb;

/** Seed `n` students, each enrolled in 2 classrooms (fan-out = 2 rows/student). */
async function seedStudentsInTwoClassroomsEach(n: number) {
  await h.db.execute(sql`INSERT INTO roles (id, name) VALUES ('00000000-0000-0000-0000-0000000000a1','student')`);
  await h.db.execute(sql`INSERT INTO users (id, username, display_username, name, email, role, cefr_level, created_at)
    VALUES ('t1','t1','t1','Teacher','t@x.com','TEACHER','B1', now())`);
  await h.db.execute(sql`INSERT INTO classrooms (id, name, teacher_id) VALUES
    ('00000000-0000-0000-0000-0000000000c1','Math','t1'),
    ('00000000-0000-0000-0000-0000000000c2','Science','t1')`);

  for (let i = 0; i < n; i++) {
    const id = `s${i}`;
    // Distinct created_at so desc(createdAt) ordering is deterministic.
    const ts = new Date(2026, 0, 1, 0, 0, i).toISOString();
    await h.db.execute(sql`INSERT INTO users (id, username, display_username, name, email, role, cefr_level, created_at)
      VALUES (${id}, ${id}, ${id}, ${"Student " + i}, ${id + "@x.com"}, 'STUDENT', 'A1', ${ts})`);
    await h.db.execute(sql`INSERT INTO user_roles (user_id, role_id) VALUES (${id}, '00000000-0000-0000-0000-0000000000a1')`);
    await h.db.execute(sql`INSERT INTO classroom_students (classroom_id, student_id) VALUES
      ('00000000-0000-0000-0000-0000000000c1', ${id}),
      ('00000000-0000-0000-0000-0000000000c2', ${id})`);
  }
}

describe("getStudents — distinct-student pagination (PGlite)", () => {
  // PGlite boots a WASM Postgres; under full-suite parallelism this can take
  // well over the default 10s hook timeout, so allow generous headroom.
  beforeAll(async () => {
    h = await createTestDb();
  }, 60_000);
  afterAll(async () => {
    await h.close();
  });
  afterEach(async () => {
    await h.reset();
  });

  it("returns a FULL page of distinct students even when enrollments fan out across the page", async () => {
    await seedStudentsInTwoClassroomsEach(6); // 6 distinct students, 12 enrollment rows

    const { students, totalCount } = await getStudents({
      page: 1,
      limit: 4,
      search: "",
      classroomId: "",
      cefrLevel: "",
      userWithRoles: systemAdmin,
    });

    expect(totalCount).toBe(6);
    // Row-based pagination would fetch 4 ROWS = 2 distinct students → length 2.
    expect(students).toHaveLength(4);
    const ids = students.map((s) => s.id);
    expect(new Set(ids).size, "page must contain 4 DISTINCT students").toBe(4);
  });

  it("paging through all pages yields exactly totalCount distinct students with no duplicates", async () => {
    await seedStudentsInTwoClassroomsEach(6);

    const seen: string[] = [];
    for (let page = 1; page <= 2; page++) {
      const { students } = await getStudents({
        page,
        limit: 4,
        search: "",
        classroomId: "",
        cefrLevel: "",
        userWithRoles: systemAdmin,
      });
      seen.push(...students.map((s) => s.id));
    }

    expect(seen).toHaveLength(6);
    expect(new Set(seen).size, "no student appears on more than one page").toBe(6);
  });

  it("totalCount always equals the distinct student count, never the fan-out row count", async () => {
    await seedStudentsInTwoClassroomsEach(3);

    const { students, totalCount } = await getStudents({
      page: 1,
      limit: 50,
      search: "",
      classroomId: "",
      cefrLevel: "",
      userWithRoles: systemAdmin,
    });

    expect(totalCount).toBe(3);
    expect(students).toHaveLength(3);
  });
});
