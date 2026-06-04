import { eq, sql } from "drizzle-orm";
import { scienceClasses, scienceClassStudents } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

/**
 * Fetches all science classes belonging to a specific teacher.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context (used for authorization)
 * @param tenant - Tenant (school) context
 * @param teacherId - The teacher's user ID
 * @returns Array of classes with id, name, gradeLevel, joinCode, standardsAlignment, and createdAt
 */
export async function getTeacherClasses({
  db,
  user,
  tenant,
  teacherId,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  teacherId: string;
}) {
  assertCan(user, "teachers:read:own", tenant);

  return db
    .select({
      id: scienceClasses.id,
      name: scienceClasses.name,
      gradeLevel: scienceClasses.gradeLevel,
      joinCode: scienceClasses.joinCode,
      standardsAlignment: scienceClasses.standardsAlignment,
      createdAt: scienceClasses.createdAt,
    })
    .from(scienceClasses)
    .where(eq(scienceClasses.teacherId, teacherId));
}

/**
 * Fetches all science classes belonging to a specific teacher, including
 * the count of enrolled students per class.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context (used for authorization)
 * @param tenant - Tenant (school) context
 * @param teacherId - The teacher's user ID
 * @returns Array of classes with id, name, gradeLevel, joinCode, standardsAlignment, createdAt, and studentCount
 */
export async function getTeacherClassesWithCounts({
  db,
  user,
  tenant,
  teacherId,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  teacherId: string;
}) {
  assertCan(user, "teachers:read:own", tenant);

  return db
    .select({
      id: scienceClasses.id,
      name: scienceClasses.name,
      gradeLevel: scienceClasses.gradeLevel,
      joinCode: scienceClasses.joinCode,
      standardsAlignment: scienceClasses.standardsAlignment,
      createdAt: scienceClasses.createdAt,
      studentCount: sql<number>`cast(count(${scienceClassStudents.studentId}) as int)`,
    })
    .from(scienceClasses)
    .leftJoin(
      scienceClassStudents,
      eq(scienceClasses.id, scienceClassStudents.classId)
    )
    .where(eq(scienceClasses.teacherId, teacherId))
    .groupBy(
      scienceClasses.id,
      scienceClasses.name,
      scienceClasses.gradeLevel,
      scienceClasses.joinCode,
      scienceClasses.standardsAlignment,
      scienceClasses.createdAt
    );
}
