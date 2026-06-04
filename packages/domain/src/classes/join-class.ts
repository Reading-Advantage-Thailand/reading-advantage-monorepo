import { and, eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { scienceClasses, scienceClassStudents, users } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";

export class AlreadyEnrolledError extends Error {
  constructor() {
    super("ALREADY_ENROLLED");
    this.name = "AlreadyEnrolledError";
  }
}

function isUniqueViolation(error: unknown): boolean {
  const candidates: unknown[] = [error];
  if (error && typeof error === "object" && "cause" in error) {
    candidates.push((error as { cause: unknown }).cause);
  }
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && "code" in candidate && (candidate as { code: unknown }).code === "23505") {
      return true;
    }
  }
  return false;
}

/**
 * Allows a student to join a class using a join code.
 * @param user - Authenticated user context (must be STUDENT)
 * @param tenant - Tenant (school) context
 * @param input - Object containing the joinCode
 * @returns Class enrollment details
 * @throws {AlreadyEnrolledError} If student is already enrolled
 */
export async function joinClass({
  user,
  tenant,
  input,
}: {
  user: UserContext;
  tenant: Tenant;
  input: { joinCode: string };
}) {
  assertCan(user, "class:join", tenant);

  // Use raw db (not tenantDb) so join-code lookup works across schools.
  // The join-code model permits cross-school enrollment.
  const [classRow] = await db
    .select({ id: scienceClasses.id, schoolId: scienceClasses.schoolId, name: scienceClasses.name, gradeLevel: scienceClasses.gradeLevel, teacherName: users.name })
    .from(scienceClasses)
    .leftJoin(users, eq(users.id, scienceClasses.teacherId))
    .where(eq(scienceClasses.joinCode, input.joinCode))
    .limit(1);

  if (!classRow) throw new Error("Join code not found");

  try {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ classId: scienceClassStudents.classId })
        .from(scienceClassStudents)
        .where(and(eq(scienceClassStudents.classId, classRow.id), eq(scienceClassStudents.studentId, user.id)))
        .limit(1);
      if (existing.length > 0) throw new AlreadyEnrolledError();
      await tx.insert(scienceClassStudents).values({ schoolId: classRow.schoolId, classId: classRow.id, studentId: user.id });
    });
  } catch (error) {
    if (error instanceof AlreadyEnrolledError) throw error;
    if (isUniqueViolation(error)) throw new AlreadyEnrolledError();
    throw error;
  }

  return {
    success: true,
    classEnrollment: {
      id: `${classRow.id}:${user.id}`,
      classId: classRow.id,
      className: classRow.name,
      gradeLevel: classRow.gradeLevel,
      teacherName: classRow.teacherName ?? "Teacher",
    },
  };
}
