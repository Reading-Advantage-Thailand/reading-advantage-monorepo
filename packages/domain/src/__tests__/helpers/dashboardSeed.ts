/**
 * Seed data for the Primary dashboard PGlite tests: two schools with students, teachers, classes,
 * licenses, and activity events. School B has activity that school A must never count.
 * Time "now" is 2026-10-12 10:00 in Bangkok. A 7-day window starts at 2026-10-05T17:00:00Z.
 */
import { sql } from "drizzle-orm";
import type { TestDb } from "./testDb.js";

export const SCHOOL_A = "10000000-0000-4000-8000-00000000000a";
export const SCHOOL_B = "10000000-0000-4000-8000-00000000000b";
export const NOW = new Date("2026-10-12T10:00:00+07:00");
const C1 = "20000000-0000-4000-8000-000000000001";
const C2 = "20000000-0000-4000-8000-000000000002";
const C3 = "20000000-0000-4000-8000-000000000003";
const C4 = "20000000-0000-4000-8000-000000000004";
const CB = "20000000-0000-4000-8000-0000000000bb";
const BOOK = "30000000-0000-4000-8000-000000000001";

/** Runs a list of SQL statements. */
async function run(h: TestDb, statements: string[]): Promise<void> {
  for (const statement of statements) await h.db.execute(sql.raw(statement));
}

const user = (id: string, role: string, school: string, cefr: string, created = "2026-01-01T00:00:00") =>
  `insert into users (id, username, display_username, name, role, school_id, cefr_level, created_at) values ('${id}', '${id}', '${id}', 'Name ${id}', '${role}', '${school}', '${cefr}', '${created}')`;

/**
 * Loads the seed. The statements run with foreign keys off (replica role), so the seed names only
 * the columns that the dashboard reads.
 * @param h The test database.
 */
export async function seedDashboard(h: TestDb): Promise<void> {
  await run(h, [
    "set session_replication_role = replica",
    `insert into schools (id, name) values ('${SCHOOL_A}', 'School A'), ('${SCHOOL_B}', 'School B')`,
    user("s1", "STUDENT", SCHOOL_A, "A1-"),
    user("s2", "STUDENT", SCHOOL_A, "A1+"),
    user("s3", "STUDENT", SCHOOL_A, "B1"),
    user("s4", "STUDENT", SCHOOL_A, "A0-"),
    user("s5", "STUDENT", SCHOOL_A, "A2", "2026-10-10T03:00:00"),
    user("tA1", "TEACHER", SCHOOL_A, "A1-"),
    user("tA2", "TEACHER", SCHOOL_A, "A1-"),
    user("tA3", "TEACHER", SCHOOL_A, "A1-"),
    user("adminA", "ADMIN", SCHOOL_A, "A1-"),
    user("sb1", "STUDENT", SCHOOL_B, "A1-"),
    user("tB", "TEACHER", SCHOOL_B, "A1-"),
    // Classes: c1 (grade 4, tA1: s1 s2), c2 (grade 4, tA1 owner and tA2 co-teacher: s1 s3),
    // c3 (grade 5, tA2: s3), c4 (archived, grade 6: s4). s5 has no class.
    `insert into classrooms (id, name, school_id, teacher_id, archived, grade) values
      ('${C1}', 'C1', '${SCHOOL_A}', 'tA1', false, 4), ('${C2}', 'C2', '${SCHOOL_A}', 'tA1', false, 4),
      ('${C3}', 'C3', '${SCHOOL_A}', 'tA2', false, 5), ('${C4}', 'C4', '${SCHOOL_A}', 'tA1', true, 6),
      ('${CB}', 'CB', '${SCHOOL_B}', 'tB', false, 4)`,
    `insert into classroom_students (classroom_id, student_id) values
      ('${C1}', 's1'), ('${C1}', 's2'), ('${C2}', 's1'), ('${C2}', 's3'), ('${C3}', 's3'), ('${C4}', 's4'), ('${CB}', 'sb1')`,
    `insert into classroom_teachers (classroom_id, teacher_id) values ('${C2}', 'tA2')`,
    // Activity. 2026-10-11T18:00Z is 01:00 on 12 October in Bangkok. 2026-10-11T16:30Z is 23:30 on 11 October.
    `insert into user_activity (user_id, activity_type, created_at, target_id) values
      ('s1', 'ARTICLE_READ', '2026-10-12T02:00:00', 'a1'),
      ('s3', 'ARTICLE_READ', '2026-09-20T05:00:00', 'a2'),
      ('s4', 'ARTICLE_READ', '2026-10-12T17:00:00', 'a3'),
      ('sb1', 'ARTICLE_READ', '2026-10-12T02:00:00', 'a4'),
      ('sb1', 'MC_QUESTION', '2026-10-10T02:00:00', 'a5')`,
    `insert into xp_logs (user_id, xp_earned, activity_id, activity_type, created_at) values
      ('s1', 50, 'x1', 'article', '2026-10-11T18:00:00'),
      ('s2', 20, 'x2', 'article', '2026-10-11T16:30:00'),
      ('s5', 7, 'x3', 'article', '2026-10-05T17:00:00'),
      ('s3', 9, 'x4', 'article', '2026-08-01T05:00:00'),
      ('sb1', 1000, 'x5', 'article', '2026-10-11T18:00:00')`,
    `insert into primary_student_lesson_steps (class_book_id, student_id, lesson_number, app_step, status, done_at) values
      ('${BOOK}', 's2', 1, 1, 'done', '2026-10-08T05:00:00'),
      ('${BOOK}', 's2', 1, 2, 'in_progress', '2026-10-09T05:00:00'),
      ('${BOOK}', 's4', 1, 1, 'done', '2026-08-01T05:00:00'),
      ('${BOOK}', 'sb1', 1, 1, 'done', '2026-10-08T05:00:00')`,
    // Teacher sign-ins: tA1 by an audit event, tA2 by a class sign-in session, tA3 outside the 7-day window.
    `insert into audit_events (id, actor_user_id, action, created_at) values
      ('e1', 'tA1', 'auth:login', '2026-10-10T03:00:00Z'), ('e2', 'tA3', 'auth:login', '2026-10-05T16:59:59Z'),
      ('e3', 'tB', 'auth:login', '2026-10-10T03:00:00Z'), ('e4', 'tA3', 'auth:logout', '2026-10-10T03:00:00Z')`,
    `insert into primary_class_login_sessions (school_id, classroom_id, teacher_id, code_hash, starts_at, expires_at, created_at) values
      ('${SCHOOL_A}', '${C3}', 'tA2', 'hash1', '2026-10-09T01:00:00', '2026-10-09T09:00:00', '2026-10-09T01:00:00')`,
    "set session_replication_role = origin",
  ]);
}

/**
 * Adds licenses to school A.
 * @param h The test database.
 * @param licenses The licenses: seats, status, and end date (UTC ISO text, or null).
 */
export async function seedLicenses(
  h: TestDb,
  licenses: Array<{ school?: string; maxUsers: number; status: string; expiry: string | null }>,
): Promise<void> {
  await run(
    h,
    licenses.map(
      (l, i) =>
        `insert into licenses (key, max_users, school_name, school_id, status, expiry_date) values ('k${Math.random()}${i}', ${l.maxUsers}, 'x', '${l.school ?? SCHOOL_A}', '${l.status}', ${l.expiry ? `'${l.expiry}'` : "null"})`,
    ),
  );
}
