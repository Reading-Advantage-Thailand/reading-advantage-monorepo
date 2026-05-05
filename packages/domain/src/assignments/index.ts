import { eq, and } from "drizzle-orm";
import {
  assignments,
  studentAssignments,
  classrooms,
  classroomStudents,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";


interface CreateAssignmentInput {
  title: string;
  classroomId: string;
  articleId?: string;
  lessonId?: string;
  dueDate?: Date;
  type: string;
  studentIds?: string[];
}

interface UpdateAssignmentInput {
  id: string;
  title?: string;
  dueDate?: Date | null;
}

interface SubmitAssignmentInput {
  assignmentId: string;
  score: number;
}

export async function createAssignment({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: CreateAssignmentInput;
}) {
  assertCan(user, "assignment:create", tenant);

  // Verify classroom belongs to caller's school
  const [classroom] = await db
    .select({ schoolId: classrooms.schoolId })
    .from(classrooms)
    .where(eq(classrooms.id, input.classroomId))
    .limit(1);

  if (!classroom || classroom.schoolId !== tenant.schoolId) {
    throw new Error("Classroom not found");
  }

  return db.transaction(async (tx) => {
    if (input.studentIds?.length) {
      const validRows = await tx
        .select({ studentId: classroomStudents.studentId })
        .from(classroomStudents)
        .innerJoin(classrooms, eq(classroomStudents.classroomId, classrooms.id))
        .where(
          and(
            eq(classroomStudents.classroomId, input.classroomId),
            eq(classrooms.schoolId, tenant.schoolId!)
          )
        );

      const validStudentIds = new Set(validRows.map((row) => row.studentId));
      const invalidStudentIds = input.studentIds.filter(
        (studentId) => !validStudentIds.has(studentId)
      );

      if (invalidStudentIds.length > 0) {
        throw new Error("Assignment contains students outside the classroom");
      }
    }

    const [assignment] = await tx
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
      await tx.insert(studentAssignments).values(
        input.studentIds.map((studentId) => ({
          assignmentId: assignment.id,
          studentId,
        }))
      );
    }

    return assignment;
  });
}

export async function listAssignments({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { classroomId: string };
}) {
  assertCan(user, "assignment:list", tenant);

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
    .select()
    .from(assignments)
    .where(eq(assignments.classroomId, input.classroomId));
}

export async function getAssignment({
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
  assertCan(user, "assignment:read", tenant);

  const [assignment] = await db
    .select()
    .from(assignments)
    .where(eq(assignments.id, input.id))
    .limit(1);

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  // Verify classroom ownership
  const [classroom] = await db
    .select({ schoolId: classrooms.schoolId })
    .from(classrooms)
    .where(eq(classrooms.id, assignment.classroomId))
    .limit(1);

  if (!classroom || classroom.schoolId !== tenant.schoolId) {
    throw new Error("Assignment not found");
  }

  return assignment;
}

export async function updateAssignment({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: UpdateAssignmentInput;
}) {
  assertCan(user, "assignment:update", tenant);

  // Verify assignment exists and is in tenant's classroom
  const [existing] = await db
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

  const [updated] = await db
    .update(assignments)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(assignments.id, id))
    .returning();

  return updated;
}

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

  const [existing] = await db
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

  await db.delete(assignments).where(eq(assignments.id, input.id));

  return { success: true };
}

export async function submitAssignment({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: SubmitAssignmentInput;
}) {
  assertCan(user, "assignment:submit", tenant);

  // Verify assignment's classroom belongs to caller's school
  const [assignment] = await db
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

  const [updated] = await db
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
