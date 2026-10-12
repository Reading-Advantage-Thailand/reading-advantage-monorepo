import { z } from "zod";
import { isStaffRole } from "./permissions";
import { normalizeRole } from "./authorization";
import { roleDefaultRedirects } from "./route-policies";
import { STUDENT_HOME } from "./student-home";

/** The mode of a student page: a student saves, a staff member only previews. */
export const StudentViewModeSchema = z.enum(["student", "preview"]);

/** One mode of the student pages. */
export type StudentViewMode = z.infer<typeof StudentViewModeSchema>;

/**
 * Derives the student view mode from the session role. The mode is a server fact: no query
 * parameter, cookie, or client value sets it. `users.role` is the truth, so this never reads
 * `user_roles` (migrated accounts have no row there).
 * @param role The session role, in any letter case.
 * @returns "student" for a student, "preview" for staff, and null for any other role.
 */
export function studentViewModeFor(role: string | null | undefined): StudentViewMode | null {
  const normalized = normalizeRole(role);
  if (normalized === "STUDENT") return "student";
  return isStaffRole(normalized) ? "preview" : null;
}

/**
 * Finds the home page of a role, the way out of the student view.
 * @param role The session role, in any letter case.
 * @returns The role home path, or the student home when the role has none.
 */
export function roleHomeFor(role: string | null | undefined): string {
  return roleDefaultRedirects[normalizeRole(role).toLowerCase()] ?? STUDENT_HOME;
}
