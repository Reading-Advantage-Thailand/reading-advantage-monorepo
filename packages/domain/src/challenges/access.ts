import { and, eq } from "drizzle-orm";
import type { Tenant, UserContext } from "@reading-advantage/auth";
import { classrooms, classroomStudents, users } from "@reading-advantage/db/schema";

import type { TenantDB } from "../db-contract.js";

/** Verifies that the caller owns, administers, or belongs to a tenant class. */
export async function requireClassChallengeAccess({
  db,
  user,
  tenant,
  classId,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  classId: string;
}): Promise<{ teacherId: string }> {
  const [classroom] = await db.select({ teacherId: classrooms.teacherId })
    .from(classrooms)
    .where(eq(classrooms.id, classId))
    .limit(1);
  if (!classroom) throw new Error("Class not found");
  if (classroom.teacherId === user.id || user.role === "ADMIN" || user.role === "SYSTEM") return classroom;
  if (user.role !== "STUDENT" || !tenant.schoolId) throw new Error("Forbidden");

  const rawDb = db.unscoped(
    "classroomStudents is REFERENTIAL; class and user school ownership bound the membership read",
  );
  const membership = await rawDb.select({ studentId: classroomStudents.studentId })
    .from(classroomStudents)
    .innerJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
    .innerJoin(users, eq(users.id, classroomStudents.studentId))
    .where(and(
      eq(classroomStudents.classroomId, classId),
      eq(classroomStudents.studentId, user.id),
      eq(classrooms.schoolId, tenant.schoolId),
      eq(users.schoolId, tenant.schoolId),
    ))
    .limit(1);
  if (membership.length === 0) throw new Error("Forbidden");
  return classroom;
}
