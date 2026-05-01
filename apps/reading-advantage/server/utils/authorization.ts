/**
 * Authorization Helper Utilities
 * 
 * This module provides helper functions for checking permissions and building
 * authorization predicates for database queries.
 * 
 * These helpers enable:
 * - School-scoped data access
 * - Classroom-scoped data access
 * - Student self-access validation
 * - Role-based query filtering
 * 
 * @module server/utils/authorization
 */

import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface UserContext {
  id: string;
  role: Role;
  school_id?: string;
  teacher_class_ids?: string[];
  student_class_ids?: string[];
}

/**
 * Check if user can access a specific school's data.
 * 
 * @param user - User context with role and school information
 * @param targetSchoolId - School ID to check access for
 * @returns True if user can access the school
 */
export function canAccessSchool(
  user: UserContext,
  targetSchoolId: string | null | undefined
): boolean {
  // SYSTEM role has access to all schools
  if (user.role === Role.SYSTEM) {
    return true;
  }

  // No school ID means no access (except for SYSTEM)
  if (!targetSchoolId) {
    return false;
  }

  // User must belong to the same school
  return user.school_id === targetSchoolId;
}

/**
 * Check if user can access a specific classroom's data.
 * 
 * @param user - User context with role and classroom assignments
 * @param classroomId - Classroom ID to check access for
 * @returns True if user can access the classroom
 */
export function canAccessClassroom(
  user: UserContext,
  classroomId: string
): boolean {
  // SYSTEM role has access to all classrooms
  if (user.role === Role.SYSTEM) {
    return true;
  }

  // Teachers can access classrooms they are assigned to
  if (user.role === Role.TEACHER) {
    return user.teacher_class_ids?.includes(classroomId) ?? false;
  }

  // Students can access classrooms they are enrolled in
  if (user.role === Role.STUDENT) {
    return user.student_class_ids?.includes(classroomId) ?? false;
  }

  // ADMIN can access classrooms in their school (requires school check separately)
  if (user.role === Role.ADMIN) {
    return true;
  }

  return false;
}

/**
 * Check if user can access a specific student's data.
 * 
 * @param user - User context with role information
 * @param studentId - Student user ID to check access for
 * @param studentClassroomIds - Optional array of classroom IDs the student belongs to
 * @returns True if user can access the student's data
 */
export function canAccessStudent(
  user: UserContext,
  studentId: string,
  studentClassroomIds?: string[]
): boolean {
  // SYSTEM role has access to all students
  if (user.role === Role.SYSTEM) {
    return true;
  }

  // Students can only access their own data
  if (user.role === Role.STUDENT) {
    return user.id === studentId;
  }

  // ADMIN can access students in their school (requires school check separately)
  if (user.role === Role.ADMIN) {
    return true;
  }

  // Teachers can access students in their classrooms
  if (user.role === Role.TEACHER && studentClassroomIds) {
    return studentClassroomIds.some((classId) =>
      user.teacher_class_ids?.includes(classId)
    );
  }

  return false;
}

/**
 * Check if the user is accessing their own data.
 * 
 * @param user - User context
 * @param targetUserId - Target user ID
 * @returns True if accessing own data
 */
export function isOwnData(user: UserContext, targetUserId: string): boolean {
  return user.id === targetUserId;
}

/**
 * Build a Prisma where clause for school-scoped queries.
 * Returns an object that can be spread into a Prisma where clause.
 * 
 * @param user - User context
 * @returns Prisma where clause object for school filtering
 * 
 * @example
 * ```typescript
 * const licenses = await prisma.license.findMany({
 *   where: {
 *     ...buildSchoolFilter(user),
 *     // other conditions
 *   }
 * });
 * ```
 */
export function buildSchoolFilter(user: UserContext): { schoolId?: string } | {} {
  // SYSTEM role sees all schools
  if (user.role === Role.SYSTEM) {
    return {};
  }

  // All other roles are scoped to their school
  if (user.school_id) {
    return { schoolId: user.school_id };
  }

  // If no school ID, return a filter that matches nothing
  return { schoolId: "__NO_SCHOOL__" };
}

/**
 * Build a Prisma where clause for classroom-scoped queries.
 * Returns an object that can be spread into a Prisma where clause.
 * 
 * @param user - User context
 * @returns Prisma where clause object for classroom filtering
 * 
 * @example
 * ```typescript
 * const assignments = await prisma.assignment.findMany({
 *   where: {
 *     ...buildClassroomFilter(user),
 *   }
 * });
 * ```
 */
export function buildClassroomFilter(
  user: UserContext
): { classroomId?: { in: string[] } } | {} {
  // SYSTEM role sees all classrooms
  if (user.role === Role.SYSTEM) {
    return {};
  }

  // Teachers see classrooms they are assigned to
  if (user.role === Role.TEACHER && user.teacher_class_ids && user.teacher_class_ids.length > 0) {
    return { classroomId: { in: user.teacher_class_ids } };
  }

  // Students see classrooms they are enrolled in
  if (user.role === Role.STUDENT && user.student_class_ids && user.student_class_ids.length > 0) {
    return { classroomId: { in: user.student_class_ids } };
  }

  // ADMIN sees classrooms in their school (handled by school filter)
  if (user.role === Role.ADMIN) {
    return {};
  }

  // If no classrooms, return a filter that matches nothing
  return { classroomId: { in: [] } };
}

/**
 * Verify that a classroom belongs to the user's school.
 * Throws an error if the classroom does not exist or does not belong to the user's school.
 * 
 * @param user - User context
 * @param classroomId - Classroom ID to verify
 * @throws Error if classroom doesn't belong to user's school
 */
export async function verifyClassroomSchool(
  user: UserContext,
  classroomId: string
): Promise<void> {
  // SYSTEM role bypasses this check
  if (user.role === Role.SYSTEM) {
    return;
  }

  if (!user.school_id) {
    throw new Error("User does not belong to a school");
  }

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: { schoolId: true },
  });

  if (!classroom) {
    throw new Error("Classroom not found");
  }

  if (classroom.schoolId !== user.school_id) {
    throw new Error("Classroom belongs to a different school");
  }
}

/**
 * Verify that a student belongs to the user's school.
 * Throws an error if the student does not exist or does not belong to the user's school.
 * 
 * @param user - User context
 * @param studentId - Student user ID to verify
 * @throws Error if student doesn't belong to user's school
 */
export async function verifyStudentSchool(
  user: UserContext,
  studentId: string
): Promise<void> {
  // SYSTEM role bypasses this check
  if (user.role === Role.SYSTEM) {
    return;
  }

  if (!user.school_id) {
    throw new Error("User does not belong to a school");
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { schoolId: true, role: true },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  if (student.role !== Role.STUDENT) {
    throw new Error("User is not a student");
  }

  if (student.schoolId !== user.school_id) {
    throw new Error("Student belongs to a different school");
  }
}

/**
 * Get all classroom IDs accessible by a user (for teacher or student).
 * 
 * @param user - User context
 * @returns Array of classroom IDs the user can access
 */
export function getAccessibleClassroomIds(user: UserContext): string[] {
  if (user.role === Role.TEACHER) {
    return user.teacher_class_ids ?? [];
  }

  if (user.role === Role.STUDENT) {
    return user.student_class_ids ?? [];
  }

  return [];
}

/**
 * Build a student filter for queries.
 * For teachers, filters to students in their classrooms.
 * For students, filters to themselves.
 * For admins, filters to students in their school.
 * 
 * @param user - User context
 * @returns Prisma where clause for student filtering
 */
export function buildStudentFilter(user: UserContext): any {
  if (user.role === Role.SYSTEM) {
    return {};
  }

  if (user.role === Role.STUDENT) {
    return { id: user.id };
  }

  if (user.role === Role.TEACHER && user.teacher_class_ids && user.teacher_class_ids.length > 0) {
    return {
      studentClassrooms: {
        some: {
          classroomId: {
            in: user.teacher_class_ids,
          },
        },
      },
    };
  }

  if (user.role === Role.ADMIN && user.school_id) {
    return {
      schoolId: user.school_id,
      role: Role.STUDENT,
    };
  }

  // Default: no access
  return { id: "__NO_USER__" };
}

/**
 * Authorization error response generator.
 * Creates a standardized error response for authorization failures.
 * 
 * @param message - Error message
 * @param code - Error code
 * @param details - Additional error details
 * @returns Error response object
 */
export function authorizationError(
  message: string,
  code: string,
  details?: Record<string, any>
) {
  return {
    error: "Forbidden",
    message,
    code,
    ...details,
  };
}
