import { eq } from "drizzle-orm";
import { users, classroomStudents, classrooms } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

interface ListStudentsInput {
  classroomId: string;
}

interface ImportRosterInput {
  classroomId: string;
  students: Array<{ name: string; username: string }>;
}

/**
 * Lists all students enrolled in a classroom, returning their id, name, email,
 * role, xp, level, and cefrLevel. Verifies the classroom belongs to the caller's school.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `classroomId`
 * @returns Array of student user records enrolled in the classroom
 */
export async function listStudents({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: ListStudentsInput;
}) {
  assertCan(user, "student:list", tenant);

  // Verify classroom belongs to caller's school
  const [classroom] = await db
    .select({ schoolId: classrooms.schoolId })
    .from(classrooms)
    .where(eq(classrooms.id, input.classroomId))
    .limit(1);

  if (!classroom || classroom.schoolId !== tenant.schoolId) {
    throw new Error("Classroom not found");
  }

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      xp: users.xp,
      level: users.level,
      cefrLevel: users.cefrLevel,
    })
    .from(classroomStudents)
    .innerJoin(users, eq(classroomStudents.studentId, users.id))
    .where(eq(classroomStudents.classroomId, input.classroomId));
}

/**
 * Imports or upserts a roster of students into a classroom. Existing usernames
 * are reused; new usernames are created as STUDENT role. Teacher must own the
 * classroom or be ADMIN/SYSTEM. Runs inside a transaction.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `classroomId` and `students` array of {name, username}
 * @returns Array of {username, id} for each processed student
 */
export async function importRoster({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: ImportRosterInput;
}) {
  assertCan(user, "student:import", tenant);

  // Verify classroom belongs to caller's school and teacher owns it
  const [classroom] = await db
    .select({ schoolId: classrooms.schoolId, teacherId: classrooms.teacherId })
    .from(classrooms)
    .where(eq(classrooms.id, input.classroomId))
    .limit(1);

  if (!classroom || classroom.schoolId !== tenant.schoolId) {
    throw new Error("Classroom not found");
  }

  if (
    classroom.teacherId !== user.id &&
    user.role !== "ADMIN" &&
    user.role !== "SYSTEM"
  ) {
    throw new Error("You do not own this classroom");
  }

  return db.transaction(async (tx) => {
    const results = [];

    for (const student of input.students) {
      const lowerUsername = student.username.toLowerCase();

      const [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.username, lowerUsername));

      let studentId: string;

      if (existingUser) {
        studentId = existingUser.id;
      } else {
        const [newUser] = await tx
          .insert(users)
          .values({
            id: crypto.randomUUID(),
            username: lowerUsername,
            displayUsername: student.username,
            name: student.name,
            role: "STUDENT",
            schoolId: tenant.schoolId,
          })
          .returning();
        studentId = newUser.id;
      }

      await tx
        .insert(classroomStudents)
        .values({
          classroomId: input.classroomId,
          studentId,
        })
        .onConflictDoNothing();

      results.push({ username: lowerUsername, id: studentId });
    }

    return results;
  });
}
