/**
 * Classroom Service
 *
 * Server-side classroom lookups shared by API controllers and server page
 * components.
 */

import { db, eq } from "@reading-advantage/db";
import { classroomStudents } from "@reading-advantage/db/schema";

/**
 * Resolves the classroom a student is enrolled in, if any.
 * @param userId The student's user id.
 * @returns The classroom id or null when unenrolled or the lookup fails.
 */
export async function getStudentClassroomId(
  userId: string,
): Promise<string | null> {
  try {
    const rows = await db
      .select({ classroomId: classroomStudents.classroomId })
      .from(classroomStudents)
      .where(eq(classroomStudents.studentId, userId))
      .limit(1);

    return rows.length > 0 ? rows[0].classroomId : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}
