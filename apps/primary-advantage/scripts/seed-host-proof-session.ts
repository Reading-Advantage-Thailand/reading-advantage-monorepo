/**
 * Idempotent seed script for the Primary Advantage host-proof E2E surface.
 *
 * Creates a stable school, classroom, teacher, and student in the
 * primary_advantage database so Playwright tests can authenticate against a
 * known session. The script is safe to run multiple times.
 *
 * Usage (from repo root):
 *   npx tsx apps/primary-advantage/scripts/seed-host-proof-session.ts
 */

import "dotenv/config";
import { db } from "@reading-advantage/db";
import { users, schools, classrooms, classroomStudents, accounts } from "@reading-advantage/db/schema";
import { hashPassword } from "@reading-advantage/auth";
import { eq } from "drizzle-orm";
import { getHostProofTestCredentials } from "../host-proof-test-config";

const { classCode: CLASS_CODE, studentUsername: STUDENT_USERNAME } =
  getHostProofTestCredentials();
const STUDENT_NAME = process.env.HOST_PROOF_TEST_STUDENT_NAME ?? "Host Proof Student";
const STUDENT_EMAIL = "host-proof-student@primary-advantage.local";
const TEACHER_EMAIL = "host-proof-teacher@primary-advantage.local";
const TEACHER_USERNAME = "host-proof-teacher";

async function seedHostProofSession() {
  const [existingSchool] = await db.select().from(schools).where(eq(schools.name, "Host Proof School")).limit(1);
  let schoolId = existingSchool?.id;
  if (!schoolId) {
    const [school] = await db
      .insert(schools)
      .values({ name: "Host Proof School" })
      .returning({ id: schools.id });
    schoolId = school.id;
  }

  const [existingTeacher] = await db.select().from(users).where(eq(users.username, TEACHER_USERNAME)).limit(1);
  let teacherId = existingTeacher?.id;
  if (!teacherId) {
    const [teacher] = await db
      .insert(users)
      .values({
        id: TEACHER_USERNAME,
        username: TEACHER_USERNAME,
        displayUsername: TEACHER_USERNAME,
        name: "Host Proof Teacher",
        email: TEACHER_EMAIL,
        role: "TEACHER",
        schoolId,
      })
      .returning({ id: users.id });
    teacherId = teacher.id;
  }

  const [existingClassroom] = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.passwordStudents, CLASS_CODE))
    .limit(1);
  let classroomId = existingClassroom?.id;
  if (!classroomId) {
    const [classroom] = await db
      .insert(classrooms)
      .values({
        name: "Host Proof Classroom",
        schoolId,
        teacherId,
        passwordStudents: CLASS_CODE,
      })
      .returning({ id: classrooms.id });
    classroomId = classroom.id;
  }

  const [existingStudent] = await db.select().from(users).where(eq(users.username, STUDENT_USERNAME)).limit(1);
  let studentId = existingStudent?.id;
  if (!studentId) {
    const [student] = await db
      .insert(users)
      .values({
        id: STUDENT_USERNAME,
        username: STUDENT_USERNAME,
        displayUsername: STUDENT_USERNAME,
        name: STUDENT_NAME,
        email: STUDENT_EMAIL,
        role: "STUDENT",
        schoolId,
      })
      .returning({ id: users.id });
    studentId = student.id;
  }

  const [existingMembership] = await db
    .select()
    .from(classroomStudents)
    .where(eq(classroomStudents.studentId, studentId))
    .limit(1);
  if (!existingMembership) {
    await db.insert(classroomStudents).values({
      classroomId,
      studentId,
    });
  }

  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, studentId))
    .limit(1);
  if (!existingAccount) {
    const passwordHash = await hashPassword(CLASS_CODE);
    await db.insert(accounts).values({
      id: `account-${STUDENT_USERNAME}`,
      userId: studentId,
      providerId: "credential",
      password: passwordHash,
    });
  }

  // eslint-disable-next-line no-console
  console.log("Host-proof test session seeded.");
  // eslint-disable-next-line no-console
  console.log(`  Class code: ${CLASS_CODE}`);
  // eslint-disable-next-line no-console
  console.log(`  Student name: ${STUDENT_NAME}`);
  // eslint-disable-next-line no-console
  console.log(`  Student username: ${STUDENT_USERNAME}`);
}

seedHostProofSession()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to seed host-proof session:", error);
    process.exit(1);
  });
