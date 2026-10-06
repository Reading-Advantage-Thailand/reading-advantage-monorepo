import { and, eq, isNull } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { classroomStudents, primaryStudentCredentials, users } from "@reading-advantage/db/schema";
import { createTenantDB } from "../db-contract.js";

/**
 * Creates an empty credential row (no picture password yet) for each student of the class
 * that has none. Existing rows stay as they are, so the call is safe to repeat. It is also
 * the backfill path for students that exist before student login.
 * @param db Database client.
 * @param schoolId The school of the class. Students of other schools are never touched.
 * @param classroomId The class whose students get rows.
 * @returns The number of rows created.
 */
export async function ensureStudentCredentials(db: DB, schoolId: string, classroomId: string): Promise<number> {
  const tenantDb = createTenantDB(db, { schoolId });
  const missing = await tenantDb
    .unscoped("classroomStudents has no schoolId, scoped via classroom id and users.schoolId")
    .select({ userId: users.id })
    .from(classroomStudents)
    .innerJoin(users, eq(users.id, classroomStudents.studentId))
    .leftJoin(primaryStudentCredentials, eq(primaryStudentCredentials.userId, users.id))
    .where(
      and(
        eq(classroomStudents.classroomId, classroomId),
        eq(users.schoolId, schoolId),
        eq(users.role, "STUDENT"),
        isNull(primaryStudentCredentials.id),
      ),
    );
  if (missing.length === 0) return 0;
  await tenantDb
    .insert(primaryStudentCredentials)
    .values(missing.map((row) => ({ schoolId, userId: row.userId })))
    .onConflictDoNothing();
  return missing.length;
}
