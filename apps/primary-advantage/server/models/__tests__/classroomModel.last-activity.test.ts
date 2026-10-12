// @vitest-environment node
/**
 * FR-3 (TCH-05): the three student-list reads return `lastActivity`, the newest `created_at` of the
 * student's `user_activity` and `xp_logs` rows. Runs against a real in-process Postgres (PGlite).
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

import {
  getAllStudentsByAdmin,
  getAllStudentsByTeacher,
  getAllStudentsInSystem,
} from "../classroomModel";

const SCHOOL = "00000000-0000-0000-0000-0000000000f1";
const CLASS = "00000000-0000-0000-0000-0000000000c1";
const STUDENT_ROLE = "00000000-0000-0000-0000-0000000000a1";

let h: TestDb;

/** Seeds one teacher, one admin, one class, and three students (activity only, XP only, none). */
async function seed() {
  await h.db.execute(sql`INSERT INTO schools (id, name) VALUES (${SCHOOL}, 'School')`);
  await h.db.execute(sql`INSERT INTO roles (id, name) VALUES (${STUDENT_ROLE}, 'student')`);
  for (const id of ["t1", "adm", "s1", "s2", "s3"]) {
    await h.db.execute(sql`INSERT INTO users (id, username, display_username, name, role, school_id)
      VALUES (${id}, ${id}, ${id}, ${id}, ${id.startsWith("s") ? "STUDENT" : "TEACHER"}, ${SCHOOL})`);
  }
  await h.db.execute(sql`INSERT INTO classrooms (id, name, school_id, teacher_id) VALUES (${CLASS}, 'Math', ${SCHOOL}, 't1')`);
  for (const id of ["s1", "s2", "s3"]) {
    await h.db.execute(sql`INSERT INTO user_roles (user_id, role_id) VALUES (${id}, ${STUDENT_ROLE})`);
    await h.db.execute(sql`INSERT INTO classroom_students (classroom_id, student_id) VALUES (${CLASS}, ${id})`);
  }
  await h.db.execute(sql`INSERT INTO classroom_teachers (classroom_id, teacher_id) VALUES (${CLASS}, 't1')`);
  await h.db.execute(sql`INSERT INTO school_admins (school_id, user_id) VALUES (${SCHOOL}, 'adm')`);
  // s1: activity on Oct 1, XP log on Oct 5 (newest). s2: activity only. s3: nothing.
  await h.db.execute(sql`INSERT INTO user_activity (user_id, activity_type, created_at) VALUES
    ('s1', 'ARTICLE_READ', '2026-10-01T10:00:00'), ('s2', 'ARTICLE_READ', '2026-10-03T10:00:00')`);
  await h.db.execute(sql`INSERT INTO xp_logs (user_id, xp_earned, activity_id, activity_type, created_at)
    VALUES ('s1', 5, 'a1', 'ARTICLE_READ', '2026-10-05T10:00:00')`);
}

/** Maps a list result to `{ studentId: ISO string or null }`. */
function byId(rows: Array<{ id: string; lastActivity: Date | null }>) {
  return Object.fromEntries(rows.map((r) => [r.id, r.lastActivity ? new Date(r.lastActivity).toISOString() : null]));
}

describe("student list reads return lastActivity (PGlite)", () => {
  beforeAll(async () => {
    h = await createTestDb();
  }, 60_000);
  afterAll(async () => {
    await h.close();
  });
  afterEach(async () => {
    await h.reset();
  });

  const expected = {
    s1: "2026-10-05T10:00:00.000Z",
    s2: "2026-10-03T10:00:00.000Z",
    s3: null,
  };

  it("getAllStudentsByTeacher", async () => {
    await seed();
    expect(byId(await getAllStudentsByTeacher("t1", SCHOOL))).toEqual(expected);
  });

  it("getAllStudentsByAdmin", async () => {
    await seed();
    expect(byId(await getAllStudentsByAdmin("adm", SCHOOL))).toEqual(expected);
  });

  it("getAllStudentsInSystem", async () => {
    await seed();
    expect(byId(await getAllStudentsInSystem())).toEqual(expected);
  });

  it("ignores activity of a student outside the list", async () => {
    await seed();
    await h.db.execute(sql`INSERT INTO users (id, username, display_username, name, role) VALUES ('x1','x1','x1','x1','STUDENT')`);
    await h.db.execute(sql`INSERT INTO user_activity (user_id, activity_type, created_at) VALUES ('x1','ARTICLE_READ','2026-10-09T10:00:00')`);
    const rows = await getAllStudentsByTeacher("t1", SCHOOL);
    expect(rows.map((r: { id: string }) => r.id).sort()).toEqual(["s1", "s2", "s3"]);
  });
});
