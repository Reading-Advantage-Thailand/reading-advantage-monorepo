import { and, eq } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { classrooms, classroomTeachers } from "@reading-advantage/db/schema";
import type { UserContext } from "@reading-advantage/auth";
import { createTenantDB, type TenantDB } from "../db-contract.js";
import { StudentLoginError } from "./errors.js";

/** A class the actor may manage, with its school, name, and picture-password setting. */
export interface ManagedClassroom {
  id: string;
  schoolId: string;
  name: string;
  picturePasswordEnabled: boolean;
}

/**
 * Checks that the user is a teacher of the class or an admin of the class school.
 * The class is read through the tenant-scoped DB, so a class of another school reads as missing.
 * @param db Database client.
 * @param user The signed-in user.
 * @param classroomId The class to manage.
 * @returns The class and a DB scoped to its school.
 * @throws {StudentLoginError} `forbidden` for other roles or a teacher who is not on the class,
 * `not_found` for an unknown, archived, or other-school class.
 */
export async function authorizeClassroom(
  db: DB,
  user: UserContext,
  classroomId: string,
): Promise<{ classroom: ManagedClassroom; tenantDb: TenantDB }> {
  if ((user.role !== "TEACHER" && user.role !== "ADMIN") || !user.schoolId) {
    throw new StudentLoginError("forbidden", "Not allowed.");
  }
  const tenantDb = createTenantDB(db, { schoolId: user.schoolId });
  const [row] = await tenantDb
    .select({
      id: classrooms.id,
      schoolId: classrooms.schoolId,
      name: classrooms.name,
      teacherId: classrooms.teacherId,
      archived: classrooms.archived,
      picturePasswordEnabled: classrooms.picturePasswordEnabled,
    })
    .from(classrooms)
    .where(eq(classrooms.id, classroomId))
    .limit(1);
  if (!row || row.archived || !row.schoolId) throw new StudentLoginError("not_found", "Class not found.");
  if (user.role === "TEACHER" && row.teacherId !== user.id) {
    const [member] = await tenantDb
      .unscoped("classroomTeachers has no schoolId, scoped via the classroom read above")
      .select({ id: classroomTeachers.id })
      .from(classroomTeachers)
      .where(and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.teacherId, user.id)))
      .limit(1);
    if (!member) throw new StudentLoginError("forbidden", "Not allowed.");
  }
  return {
    classroom: { id: row.id, schoolId: row.schoolId, name: row.name, picturePasswordEnabled: row.picturePasswordEnabled },
    tenantDb,
  };
}
