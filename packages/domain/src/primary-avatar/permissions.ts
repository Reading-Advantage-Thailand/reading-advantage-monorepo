import { AuthError, ROLES, hasPermission, registerDomainModulePermissions, type Permission, type UserContext } from "@reading-advantage/auth";

/** The permission to write a student record (avatar, inventory, GP, power-ups, heartbeats). STUDENT only. */
export const STUDENT_RECORD_WRITE = "primary:student-record:write";

registerDomainModulePermissions({
  moduleName: "primary-student-record",
  keys: [{ key: STUDENT_RECORD_WRITE, roles: [ROLES.STUDENT] }],
});

/**
 * Tells whether a user may write a student record. Staff in Preview mode may not.
 * @param user The signed-in user.
 * @returns True for a student.
 */
export function canWriteStudentRecord(user: Pick<UserContext, "role">): boolean {
  return hasPermission(user.role as never, STUDENT_RECORD_WRITE as Permission);
}

/**
 * Refuses a student-record write unless the user is a student.
 * @param user The signed-in user.
 * @throws {AuthError} FORBIDDEN when the user is not a student.
 */
export function assertStudentRecordWriter(user: Pick<UserContext, "id" | "role">): void {
  if (!canWriteStudentRecord(user)) {
    throw new AuthError(`User ${user.id} (${user.role}) lacks permission: ${STUDENT_RECORD_WRITE}`, "FORBIDDEN");
  }
}
