import { eq } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { assignments, classrooms } from "@reading-advantage/db/schema";

/**
 * Lists all assignments for a specific classroom. Validates classroom ownership.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the classroomId
 * @returns Array of assignments for the classroom
 */
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

  const [classroom] = await db
    .select({ schoolId: classrooms.schoolId })
    .from(classrooms)
    .where(eq(classrooms.id, input.classroomId))
    .limit(1);

  if (!classroom || classroom.schoolId !== tenant.schoolId) {
    throw new Error("Classroom not found");
  }

  return db.unscoped("assignments is REFERENTIAL, scoped via classroomId FK")
    .select()
    .from(assignments)
    .where(eq(assignments.classroomId, input.classroomId));
}

/**
 * Gets a single assignment by ID. Validates assignment belongs to caller's school.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the assignment ID
 * @returns The assignment if found, throws Error if not found
 */
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

  const rawDb = db.unscoped("assignments is REFERENTIAL, scoped via classroomId FK");

  const [assignment] = await rawDb
    .select()
    .from(assignments)
    .where(eq(assignments.id, input.id))
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

  return assignment;
}
