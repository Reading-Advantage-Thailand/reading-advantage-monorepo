import { and, eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { schoolAdmins } from "@reading-advantage/db/schema";
import { normalizeRole } from "@/lib/authorization";

/** One school_admins row, in the shape that the permission checks read. */
export interface SchoolAdminRow {
  id: string;
  schoolId: string;
}

/**
 * Loads the school_admins rows of a user for the user's own school.
 * A row of another school never lifts the user, so only the own school counts.
 * @param userId The user to look up.
 * @param schoolId The home school of the user.
 * @returns The matching rows, an empty list when there is none.
 */
export async function loadOwnSchoolAdminRows(userId: string, schoolId: string): Promise<SchoolAdminRow[]> {
  return db
    .select({ id: schoolAdmins.id, schoolId: schoolAdmins.schoolId })
    .from(schoolAdmins)
    .where(and(eq(schoolAdmins.userId, userId), eq(schoolAdmins.schoolId, schoolId)));
}

/**
 * Adds the `SchoolAdmins` list to a session user, so the menu shows the school links to a TEACHER
 * with a school_admins row. Only a TEACHER needs the query: ADMIN and SYSTEM pass on the role.
 * @param user The session user.
 * @returns The user with a `SchoolAdmins` list.
 */
export async function withSchoolAdminRows<T extends { id: string; role?: unknown; schoolId?: string | null }>(
  user: T,
): Promise<T & { SchoolAdmins: SchoolAdminRow[] }> {
  if (normalizeRole(user.role) !== "TEACHER" || !user.schoolId) return { ...user, SchoolAdmins: [] };
  return { ...user, SchoolAdmins: await loadOwnSchoolAdminRows(user.id, user.schoolId) };
}
