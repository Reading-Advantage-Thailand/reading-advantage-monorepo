/**
 * In-process PostgreSQL test harness (PGlite).
 *
 * Boots a real Postgres engine (compiled to WASM) inside the test process so the
 * migrated primary-advantage model queries run against genuine SQL semantics —
 * real JOIN fan-out, real LIMIT/OFFSET, real COUNT — with no server, Docker, or
 * DATABASE_URL. This is what makes the FR-2 behavioral tests *behavioral*: a
 * DB-mock cannot exercise the row-vs-student pagination bug; real Postgres can.
 *
 * TEST-ONLY. PGlite is a devDependency and is imported only from this helper.
 * Production continues to use the managed Postgres via `@reading-advantage/db`.
 *
 * Usage:
 *   const h = await createTestDb();
 *   // mock @reading-advantage/db so the model-under-test uses h.db:
 *   vi.mock("@reading-advantage/db", async (importOriginal) => {
 *     const actual = await importOriginal<typeof import("@reading-advantage/db")>();
 *     return { ...actual, db: (globalThis as any).__TEST_DB__ };
 *   });
 *   await h.reset(); // truncate between tests
 *   ...
 *   await h.close();
 *
 * The DDL below is intentionally scoped to the tables the primary-advantage
 * student/classroom/teacher/assignment list queries touch. It mirrors the
 * column names and types in packages/db/src/schema/{users,classrooms,primary,
 * content}.ts. We create a focused subset rather than replaying all 24 drizzle
 * migrations (which include unrelated codecamp/science/marketing tables) to keep
 * the harness fast and resilient.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "@reading-advantage/db";

const DDL = `
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district text,
  province text,
  country text NOT NULL DEFAULT 'Thailand',
  contact_name text,
  contact_email text,
  owner_id text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE,
  display_username text NOT NULL UNIQUE,
  name text,
  email text,
  image text,
  github_username text UNIQUE,
  role text NOT NULL DEFAULT 'STUDENT',
  school_id uuid REFERENCES schools(id),
  license_id text,
  expired_date timestamp,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  cefr_level text NOT NULL DEFAULT 'A1-',
  grade_level integer,
  password text,
  email_verified timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS school_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  school_id uuid REFERENCES schools(id),
  teacher_id text NOT NULL REFERENCES users(id),
  archived boolean NOT NULL DEFAULT false,
  class_code text UNIQUE,
  code_expires_at timestamp,
  grade integer,
  created_by text REFERENCES users(id),
  password_students text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classroom_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, student_id)
);

CREATE TABLE IF NOT EXISTS classroom_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id text NOT NULL REFERENCES users(id),
  article_id uuid,
  lesson_id uuid,
  due_date timestamp,
  type text NOT NULL,
  description text,
  teacher_name text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  status text,
  score integer,
  started_at timestamp,
  completed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);
`;

const TABLES = [
  "student_assignments",
  "assignments",
  "classroom_teachers",
  "classroom_students",
  "classrooms",
  "school_admins",
  "user_roles",
  "roles",
  "users",
  "schools",
];

export interface TestDb {
  /** Drizzle instance bound to the in-process PGlite database. */
  db: ReturnType<typeof drizzle>;
  /** Truncate all harness tables (run between tests for isolation). */
  reset: () => Promise<void>;
  /** Tear down the PGlite instance. */
  close: () => Promise<void>;
}

/**
 * Boots a fresh in-process Postgres with the focused schema applied and
 * publishes the drizzle instance on `globalThis.__TEST_DB__` so a hoisted
 * `vi.mock("@reading-advantage/db")` factory can pick it up.
 */
export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await client.exec(DDL);
  (globalThis as Record<string, unknown>).__TEST_DB__ = db;

  return {
    db,
    reset: async () => {
      await db.execute(
        sql.raw(`TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE;`),
      );
    },
    close: async () => {
      (globalThis as Record<string, unknown>).__TEST_DB__ = undefined;
      await client.close();
    },
  };
}
