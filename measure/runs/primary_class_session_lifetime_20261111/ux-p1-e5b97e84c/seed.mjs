/**
 * Seed for the UX browser review of the class session lifetime control.
 *
 * One school, one teacher with an Argon2id credential, one class, two students.
 * Raw SQL through postgres-js against the scratch database of this run.
 * The shared databases (reading_advantage, primary_advantage, science_advantage)
 * are never touched.
 */
import { writeFileSync } from "node:fs";
import postgres from "postgres";
import argon2 from "@node-rs/argon2";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("seed: DATABASE_URL is not set");
  process.exit(2);
}
const idsFile = process.env.IDS_FILE;
if (!idsFile) {
  console.error("seed: IDS_FILE is not set");
  process.exit(2);
}

// The same Argon2id parameters as packages/auth/src/password.ts.
const ARGON2ID = { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };
const PASSWORD = "UxReview!2026";

const sql = postgres(url, { max: 1, prepare: false });

const schoolId = crypto.randomUUID();
const teacherId = crypto.randomUUID();
const studentAId = crypto.randomUUID();
const studentBId = crypto.randomUUID();
const classroomId = crypto.randomUUID();

const hash = await argon2.hash(PASSWORD, ARGON2ID);

await sql`INSERT INTO schools (id, name) VALUES (${schoolId}, ${"UX Review School"})`;
await sql`
  INSERT INTO users (id, username, display_username, name, role, school_id, xp, level, cefr_level)
  VALUES
    (${teacherId}, ${"ux-review-teacher"}, ${"ux-review-teacher"}, ${"UX Review Teacher"}, ${"TEACHER"}, ${schoolId}, 0, 1, ${"A1-"}),
    (${studentAId}, ${"ux-review-student-a"}, ${"ux-review-student-a"}, ${"UX Review Student A"}, ${"STUDENT"}, ${schoolId}, 0, 1, ${"A1-"}),
    (${studentBId}, ${"ux-review-student-b"}, ${"ux-review-student-b"}, ${"UX Review Student B"}, ${"STUDENT"}, ${schoolId}, 0, 1, ${"A1-"})
`;
await sql`
  INSERT INTO accounts (id, user_id, provider_id, password)
  VALUES (${`${teacherId}_credential`}, ${teacherId}, ${"credential"}, ${hash})
`;
await sql`
  INSERT INTO classrooms (id, name, school_id, teacher_id, grade, class_code, picture_password_enabled, archived)
  VALUES (${classroomId}, ${"UX Review Class"}, ${schoolId}, ${teacherId}, 4, ${"UXREVIEW"}, ${true}, ${false})
`;
await sql`
  INSERT INTO classroom_students (classroom_id, student_id)
  VALUES (${classroomId}, ${studentAId}), (${classroomId}, ${studentBId})
`;
await sql`
  INSERT INTO classroom_teachers (classroom_id, teacher_id, role)
  VALUES (${classroomId}, ${teacherId}, ${"member"})
`;

const ids = {
  schoolId,
  teacherId,
  studentAId,
  studentBId,
  classroomId,
  username: "ux-review-teacher",
  password: PASSWORD,
};
writeFileSync(idsFile, JSON.stringify(ids, null, 2));
console.log(`seed: ok school=${schoolId} teacher=${teacherId} classroom=${classroomId}`);
await sql.end();
