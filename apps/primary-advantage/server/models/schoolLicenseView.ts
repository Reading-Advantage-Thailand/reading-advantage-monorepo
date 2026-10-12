import { db } from "@reading-advantage/db";
import { licenses } from "@reading-advantage/domain";
import { AuthError, type UserContext } from "@reading-advantage/auth";

/**
 * Loads the license view of the caller's school for the school profile. Only a school admin gets it
 * (ADMIN, SYSTEM, or a TEACHER with a `school_admins` row, checked by the domain function).
 * @param user The session user.
 * @returns The license view, or null when the caller has no school or is not a school admin.
 */
export async function getLicenseViewForCaller(
  user: UserContext,
): Promise<licenses.SchoolLicenseViewOutput | null> {
  if (!user.schoolId) return null;
  try {
    return await licenses.getSchoolLicenseView({ db, user, schoolId: user.schoolId });
  } catch (error) {
    if (error instanceof AuthError) return null;
    throw error;
  }
}

/**
 * Loads one page of the seat holders (students) of the caller's school.
 * @param user The session user, who needs a school.
 * @param page The page number, from 1.
 * @returns The page of students.
 * @throws {AuthError} When the caller is not a school admin of the school.
 */
export async function getSeatHoldersForCaller(
  user: UserContext & { schoolId: string },
  page: number,
): Promise<licenses.SeatHoldersOutput> {
  return licenses.listSeatHolders({ db, user, schoolId: user.schoolId, page });
}
