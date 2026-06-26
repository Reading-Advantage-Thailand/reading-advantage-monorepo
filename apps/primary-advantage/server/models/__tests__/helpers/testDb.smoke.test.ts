// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "./testDb";

describe("PGlite harness smoke test", () => {
  let h: TestDb;
  // PGlite boots a WASM Postgres; under full-suite parallelism this can take
  // well over the default 10s hook timeout, so allow generous headroom.
  beforeAll(async () => {
    h = await createTestDb();
  }, 60_000);
  afterAll(async () => {
    await h.close();
  });

  it("boots a real Postgres and honors a fan-out leftJoin (3 rows for 2 students, 1 in 2 classrooms)", async () => {
    await h.db.execute(sql`INSERT INTO schools (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'S')`);
    await h.db.execute(sql`INSERT INTO users (id, username, display_username, role) VALUES
      ('s1','s1','s1','STUDENT'), ('s2','s2','s2','STUDENT'), ('t1','t1','t1','TEACHER')`);
    await h.db.execute(sql`INSERT INTO classrooms (id, name, teacher_id) VALUES
      ('00000000-0000-0000-0000-0000000000c1','Math','t1'),
      ('00000000-0000-0000-0000-0000000000c2','Science','t1'),
      ('00000000-0000-0000-0000-0000000000c3','English','t1')`);
    await h.db.execute(sql`INSERT INTO classroom_students (classroom_id, student_id) VALUES
      ('00000000-0000-0000-0000-0000000000c1','s1'),
      ('00000000-0000-0000-0000-0000000000c2','s1'),
      ('00000000-0000-0000-0000-0000000000c3','s2')`);

    const rows = await h.db.execute(sql`
      SELECT u.id FROM users u
      LEFT JOIN classroom_students cs ON cs.student_id = u.id
      WHERE u.role = 'STUDENT'`);
    // s1 fans out to 2 rows + s2 = 3 rows total — proves real JOIN fan-out.
    expect(rows.rows).toHaveLength(3);

    const distinct = await h.db.execute(sql`SELECT COUNT(*)::int AS value FROM users WHERE role = 'STUDENT'`);
    expect((distinct.rows[0] as { value: number }).value).toBe(2);
  });
});
