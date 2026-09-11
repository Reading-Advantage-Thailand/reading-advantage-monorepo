/**
 * Returns true when the role can use teacher-only features.
 * @param role The user's role, for example "TEACHER", "CO_TEACHER", or "ADMIN".
 * @returns True for teachers, co-teachers, admins, and system users.
 */
export function isAtLeastTeacher(role: string): boolean {
  return (
    role.includes("TEACHER") ||
    role.includes("ADMIN") ||
    role.includes("SYSTEM")
  );
}
