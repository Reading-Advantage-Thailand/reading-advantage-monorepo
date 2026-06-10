import { eq, and } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import {
  assignments,
  studentAssignments,
  classrooms,
  classroomStudents,
} from "@reading-advantage/db/schema";

/**
 * Creates a new assignment for a classroom. Validates that the classroom belongs to the
 * caller's school and that all specified studentIds are enrolled in that classroom.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Assignment creation fields
 * @returns The newly created assignment
 */
export async function createAssignment({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: {
    title: string;
    classroomId: string;
    articleId?: string;
    lessonId?: string;
    dueDate?: Date;
    type: string;
    studentIds?: string[];
  };
}) {
  assertCan(user, "assignment:create", tenant);

  const [classroom] = await db
    .select({ schoolId: classrooms.schoolId })
    .from(classrooms)
    .where(eq(classrooms.id, input.classroomId))
    .limit(1);

  if (!classroom || classroom.schoolId !== tenant.schoolId) {
    throw new Error("Classroom not found");
  }

  return db.transaction(async (tx) => {
    const rawTx = "unscoped" in tx
      ? (tx as unknown as TenantDB).unscoped("assignments/classroomStudents/studentAssignments are REFERENTIAL")
      : tx;

    if (input.studentIds?.length) {
      const validRows = await rawTx
        .select({ studentId: classroomStudents.studentId })
        .from(classroomStudents)
        .innerJoin(classrooms, eq(classroomStudents.classroomId, classrooms.id))
        .where(
          and(
            eq(classroomStudents.classroomId, input.classroomId),
            eq(classrooms.schoolId, tenant.schoolId!)
          )
        );

      const validStudentIds = new Set(validRows.map((row: { studentId: string }) => row.studentId));
      const invalidStudentIds = input.studentIds.filter(
        (studentId) => !validStudentIds.has(studentId)
      );

      if (invalidStudentIds.length > 0) {
        throw new Error("Assignment contains students outside the classroom");
      }
    }

    const [assignment] = await rawTx
      .insert(assignments)
      .values({
        title: input.title,
        classroomId: input.classroomId,
        teacherId: user.id,
        articleId: input.articleId ?? null,
        lessonId: input.lessonId ?? null,
        dueDate: input.dueDate ?? null,
        type: input.type,
      })
      .returning();

    if (input.studentIds?.length) {
      await rawTx.insert(studentAssignments).values(
        input.studentIds.map((studentId) => ({
          assignmentId: assignment.id,
          studentId,
        }))
      );
    }

    return assignment;
  });
}

/**
 * Updates an assignment's title and/or due date. Validates assignment belongs to caller's school.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing assignment ID and optional title/dueDate
 * @returns The updated assignment
 */
export async function updateAssignment({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { id: string; title?: string; dueDate?: Date | null };
}) {
  assertCan(user, "assignment:update", tenant);

  const rawDb = db.unscoped("assignments is REFERENTIAL, scoped via classroomId FK");

  const [existing] = await rawDb
    .select()
    .from(assignments)
    .where(eq(assignments.id, input.id))
    .limit(1);

  if (!existing) {
    throw new Error("Assignment not found");
  }

  const [classroom] = await db
    .select({ schoolId: classrooms.schoolId })
    .from(classrooms)
    .where(eq(classrooms.id, existing.classroomId))
    .limit(1);

  if (!classroom || classroom.schoolId !== tenant.schoolId) {
    throw new Error("Assignment not found");
  }

  const { id, ...updates } = input;

  const [updated] = await rawDb
    .update(assignments)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(assignments.id, id))
    .returning();

  return updated;
}

/**
 * Deletes an assignment. Validates assignment belongs to caller's school.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the assignment ID
 * @returns Object with success flag
 */
export async function deleteAssignment({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { id: string };
}) {
  assertCan(user, "assignment:delete", tenant);

  const rawDb = db.unscoped("assignments is REFERENTIAL, scoped via classroomId FK");

  const [existing] = await rawDb
    .select()
    .from(assignments)
    .where(eq(assignments.id, input.id))
    .limit(1);

  if (!existing) {
    throw new Error("Assignment not found");
  }

  const [classroom] = await db
    .select({ schoolId: classrooms.schoolId })
    .from(classrooms)
    .where(eq(classrooms.id, existing.classroomId))
    .limit(1);

  if (!classroom || classroom.schoolId !== tenant.schoolId) {
    throw new Error("Assignment not found");
  }

  await rawDb.delete(assignments).where(eq(assignments.id, input.id));

  return { success: true };
}

/**
 * Submits an assignment with a score. Validates assignment belongs to caller's school.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing assignmentId and score
 * @returns The updated student assignment record
 */
export async function submitAssignment({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { assignmentId: string; score: number };
}) {
  assertCan(user, "assignment:submit", tenant);

  const rawDb = db.unscoped("assignments/studentAssignments are REFERENTIAL");

  const [assignment] = await rawDb
    .select({ classroomId: assignments.classroomId })
    .from(assignments)
    .where(eq(assignments.id, input.assignmentId))
    .limit(1);

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  const [classroom] = await db
    .select({ schoolId: classrooms.schoolId })
    .from(classrooms)
    .where(eq(classrooms.id, assignment.classroomId))
    .limit(1);

  if (!classroom || classroom.schoolId !== tenant.schoolId) {
    throw new Error("Assignment not found");
  }

  const [updated] = await rawDb
    .update(studentAssignments)
    .set({
      completed: true,
      score: input.score,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(studentAssignments.assignmentId, input.assignmentId),
        eq(studentAssignments.studentId, user.id)
      )
    )
    .returning();

  if (!updated) {
    throw new Error("Student not assigned to this assignment");
  }

  return updated;
}
