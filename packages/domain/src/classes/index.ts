import { eq, and } from "drizzle-orm";
import { classrooms } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

export { listClassesWithCounts } from "./list-classes-with-counts.js";
export { createScienceClass } from "./create-science-class.js";
export { joinClass, AlreadyEnrolledError } from "./join-class.js";
export { getClassDetail } from "./get-class.js";
export { updateClass } from "./update-class.js";
export { archiveClass } from "./archive-class.js";
export { getClassCurriculum } from "./get-class-curriculum.js";
export { getClassRoster, removeStudentFromClass } from "./get-class-roster.js";
export { getClassAnalyticsOverview } from "./get-class-analytics-overview.js";
export { getClassLessonAnalytics } from "./get-class-lesson-analytics.js";
export { listAssignments } from "./list-assignment.js";
export { createAssignment } from "./create-assignment.js";
export { deleteAssignment } from "./delete-assignment.js";

interface CreateClassInput {
  name: string;
}

interface ListClassesInput {
  includeArchived: boolean;
}

/**
 * Creates a new class (classroom) for the caller's school.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the class name
 * @returns The newly created classroom
 */
export async function createClass({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: CreateClassInput;
}) {
  assertCan(user, "class:create", tenant);

  const [klass] = await db
    .insert(classrooms)
    .values({
      name: input.name,
      schoolId: tenant.schoolId,
      teacherId: user.id,
    })
    .returning();

  return klass;
}

/**
 * Lists all classes (classrooms) for the caller's school. Teachers only see their own classes.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing includeArchived flag
 * @returns Array of classrooms
 */
export async function listClasses({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: ListClassesInput;
}) {
  assertCan(user, "class:list", tenant);

  const conditions = [];

  if (!input.includeArchived) {
    conditions.push(eq(classrooms.archived, false));
  }

  if (user.role === "TEACHER") {
    conditions.push(eq(classrooms.teacherId, user.id));
  }

  return db
    .select()
    .from(classrooms)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
}
