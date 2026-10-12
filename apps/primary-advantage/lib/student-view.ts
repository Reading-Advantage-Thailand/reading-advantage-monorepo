import { z } from "zod";
import { isStaffRole } from "./permissions";
import { normalizeRole } from "./authorization";
import { roleDefaultRedirects } from "./route-policies";
import { STUDENT_HOME } from "./student-home";
import { logger } from "./observability/logger";

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

/** The error code of a write that Preview mode refuses. */
export const PREVIEW_READ_ONLY = "PREVIEW_READ_ONLY";

/** The result that a server action returns to staff instead of a save. */
export type PreviewActionResult = { status: "preview" };

/** Thrown by `assertStudentWriter` when the session role is not STUDENT. */
export class PreviewWriteError extends Error {
  readonly code = PREVIEW_READ_ONLY;
  constructor(readonly operation: string) {
    super("Preview: not saved");
    this.name = "PreviewWriteError";
  }
}

/**
 * Tells whether a user may write student records. Only the STUDENT session role may.
 * @param user The session user, or null.
 * @returns True for a student; false for staff, INTERN, an unknown role, or no user.
 */
export function isStudentWriter(user: { role?: string | null } | null | undefined): boolean {
  return normalizeRole(user?.role) === "STUDENT";
}

/**
 * Refuses a student-record write unless the session role is STUDENT. Logs one info line.
 * @param user The session user, or null.
 * @param operation A stable snake_case name of the write path, for the log.
 * @throws PreviewWriteError When the user is not a student.
 */
export function assertStudentWriter(user: { role?: string | null } | null | undefined, operation: string): void {
  if (isStudentWriter(user)) return;
  logger.info("preview_write_refused", { operation, role: normalizeRole(user?.role) });
  throw new PreviewWriteError(operation);
}

/**
 * Guards a server action. Call it first, before any read of student rows or write.
 * @param user The session user.
 * @param operation The write path name.
 * @returns The preview result for a non-student; null for a student.
 */
export function guardStudentAction(user: { role?: string | null } | null | undefined, operation: string): PreviewActionResult | null {
  try {
    assertStudentWriter(user, operation);
    return null;
  } catch (error) {
    if (error instanceof PreviewWriteError) return { status: "preview" };
    throw error;
  }
}

/**
 * Guards an API route. Call it first, before any read of the body or any write.
 * @param user The session user.
 * @param operation The write path name.
 * @returns A 403 `PREVIEW_READ_ONLY` response with no data for a non-student; null for a student.
 */
export function guardStudentRoute(user: { role?: string | null } | null | undefined, operation: string): Response | null {
  try {
    assertStudentWriter(user, operation);
    return null;
  } catch (error) {
    if (error instanceof PreviewWriteError) {
      return Response.json(
        { error: { code: PREVIEW_READ_ONLY, message: "Preview: not saved" } },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw error;
  }
}
