import { db, eq, and } from "@reading-advantage/db";
import { classrooms, classroomTeachers, classroomStudents } from "@reading-advantage/db";
import { normalizeRole } from "@/lib/authorization";

/** The session fields that the assignment access rules read. */
export interface AssignmentCaller {
  id: string;
  role?: string | null;
  schoolId?: string | null;
}

/**
 * Tells whether a role may manage assignments at all (TEACHER, ADMIN, or SYSTEM).
 * @param user The session user.
 * @returns True for staff that may manage assignments.
 */
export function isAssignmentManager(user: AssignmentCaller): boolean {
  const role = normalizeRole(user.role);
  return role === "TEACHER" || role === "ADMIN" || role === "SYSTEM";
}

/**
 * Tells whether the caller manages one class: SYSTEM, an ADMIN of the class school, or a
 * teacher of the class (the `classrooms.teacherId` column or a `classroom_teachers` row).
 * @param user The session user.
 * @param classroomId The class to check.
 * @returns True when the caller may read and write the assignments of the class.
 */
export async function canManageClassroom(user: AssignmentCaller, classroomId: string): Promise<boolean> {
  const role = normalizeRole(user.role);
  if (role === "SYSTEM") return true;
  if (role !== "ADMIN" && role !== "TEACHER") return false;
  const [classroom] = await db
    .select({ id: classrooms.id, schoolId: classrooms.schoolId, teacherId: classrooms.teacherId })
    .from(classrooms)
    .where(eq(classrooms.id, classroomId))
    .limit(1);
  if (!classroom || !user.schoolId || classroom.schoolId !== user.schoolId) return false;
  if (role === "ADMIN" || classroom.teacherId === user.id) return true;
  const [link] = await db
    .select({ id: classroomTeachers.id })
    .from(classroomTeachers)
    .where(and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.teacherId, user.id)))
    .limit(1);
  return Boolean(link);
}

/**
 * Tells whether the caller may read the assignments of one student: the student, SYSTEM, or
 * staff that manage a class of the student.
 * @param user The session user.
 * @param studentId The student whose records the caller asks for.
 * @returns True when the caller may read the records.
 */
export async function canReadStudentRecords(user: AssignmentCaller, studentId: string): Promise<boolean> {
  const role = normalizeRole(user.role);
  if (user.id === studentId || role === "SYSTEM") return true;
  if (role !== "ADMIN" && role !== "TEACHER") return false;
  const rows = await db
    .select({ classroomId: classroomStudents.classroomId })
    .from(classroomStudents)
    .where(eq(classroomStudents.studentId, studentId));
  for (const row of rows) {
    if (await canManageClassroom(user, row.classroomId)) return true;
  }
  return false;
}
