/**
 * RBAC Guards Middleware
 * 
 * This module provides guard utilities for enforcing role-based access control (RBAC)
 * and tenant-aware security on dashboard endpoints.
 * 
 * These guards verify:
 * - User authentication
 * - Role permissions
 * - School/tenant scope
 * - Classroom access
 * - Student self-access
 * 
 * @module server/middleware/guards
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { Role } from "@prisma/client";

export interface GuardContext {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
}

/**
 * Base guard that ensures user is authenticated.
 * Returns user context for subsequent guards.
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ user: GuardContext["user"] } | NextResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Authentication required. Please sign in to access this resource.",
        code: "AUTH_REQUIRED",
      },
      { status: 401 }
    );
  }

  return { user };
}

/**
 * Guard that restricts access to specific roles.
 * 
 * @param allowedRoles - Array of roles that are allowed to access the resource
 * @returns Middleware function that checks role authorization
 * 
 * @example
 * ```typescript
 * const authResult = await requireRole([Role.ADMIN, Role.SYSTEM])(req);
 * if (authResult instanceof NextResponse) return authResult;
 * const { user } = authResult;
 * ```
 */
export function requireRole(allowedRoles: Role[]) {
  return async (
    req: NextRequest
  ): Promise<{ user: GuardContext["user"] } | NextResponse> => {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: `Access denied. Required role: ${allowedRoles.join(" or ")}. Current role: ${user.role}`,
          code: "ROLE_FORBIDDEN",
          requiredRoles: allowedRoles,
          currentRole: user.role,
        },
        { status: 403 }
      );
    }

    return { user };
  };
}

/**
 * Guard that ensures user belongs to a specific school.
 * Useful for school-scoped admin dashboards.
 * 
 * @param schoolId - The school ID to check access for
 * @returns Middleware function that validates school access
 * 
 * @example
 * ```typescript
 * const authResult = await requireSchoolAccess(schoolId)(req);
 * if (authResult instanceof NextResponse) return authResult;
 * ```
 */
export function requireSchoolAccess(schoolId: string) {
  return async (
    req: NextRequest
  ): Promise<{ user: GuardContext["user"] } | NextResponse> => {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;

    // SYSTEM role has access to all schools
    if (user.role === Role.SYSTEM) {
      return { user };
    }

    if (user.school_id !== schoolId) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Access denied. You do not have permission to access this school's data.",
          code: "SCHOOL_FORBIDDEN",
          requestedSchool: schoolId,
          userSchool: user.school_id || null,
        },
        { status: 403 }
      );
    }

    return { user };
  };
}

/**
 * Guard that ensures user has access to a specific classroom.
 * Teachers can only access classrooms they are assigned to.
 * Students can only access classrooms they are enrolled in.
 * ADMIN and SYSTEM roles have broader access within their school scope.
 * 
 * @param classroomId - The classroom ID to check access for
 * @returns Middleware function that validates classroom access
 */
export function requireClassroomAccess(classroomId: string) {
  return async (
    req: NextRequest
  ): Promise<{ user: GuardContext["user"] } | NextResponse> => {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;

    // SYSTEM role has access to all classrooms
    if (user.role === Role.SYSTEM) {
      return { user };
    }

    // Teachers can only access their assigned classrooms
    if (user.role === Role.TEACHER) {
      const hasAccess = user.teacher_class_ids?.includes(classroomId);
      if (!hasAccess) {
        return NextResponse.json(
          {
            error: "Forbidden",
            message: "Access denied. You are not assigned to this classroom.",
            code: "CLASSROOM_FORBIDDEN",
            requestedClassroom: classroomId,
            userClassrooms: user.teacher_class_ids || [],
          },
          { status: 403 }
        );
      }
      return { user };
    }

    // Students can only access classrooms they are enrolled in
    if (user.role === Role.STUDENT) {
      const hasAccess = user.student_class_ids?.includes(classroomId);
      if (!hasAccess) {
        return NextResponse.json(
          {
            error: "Forbidden",
            message: "Access denied. You are not enrolled in this classroom.",
            code: "CLASSROOM_FORBIDDEN",
            requestedClassroom: classroomId,
            userClassrooms: user.student_class_ids || [],
          },
          { status: 403 }
        );
      }
      return { user };
    }

    // ADMIN role: Allow if classroom belongs to the same school
    // This requires additional database lookup to verify school association
    // For now, we'll allow ADMIN access and implement school-level validation in authorization helpers
    if (user.role === Role.ADMIN) {
      return { user };
    }

    return NextResponse.json(
      {
        error: "Forbidden",
        message: "Access denied. You do not have permission to access this classroom.",
        code: "CLASSROOM_FORBIDDEN",
      },
      { status: 403 }
    );
  };
}

/**
 * Guard that ensures user can only access their own data.
 * Students can only view their own records.
 * 
 * @param userId - The user ID to check access for
 * @returns Middleware function that validates self-access
 */
export function requireStudentSelf(userId: string) {
  return async (
    req: NextRequest
  ): Promise<{ user: GuardContext["user"] } | NextResponse> => {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;

    // SYSTEM, ADMIN can access any student data
    if (user.role === Role.SYSTEM || user.role === Role.ADMIN) {
      return { user };
    }

    // TEACHER can access students in their classrooms (validated elsewhere)
    if (user.role === Role.TEACHER) {
      return { user };
    }

    // STUDENT can only access their own data
    if (user.role === Role.STUDENT && user.id !== userId) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Access denied. Students can only access their own data.",
          code: "SELF_ACCESS_FORBIDDEN",
          requestedUser: userId,
          currentUser: user.id,
        },
        { status: 403 }
      );
    }

    return { user };
  };
}

/**
 * Guard that ensures the requesting user belongs to the same school as the target resource.
 * This is a helper guard that can be composed with other guards.
 * 
 * @param targetSchoolId - The school ID of the target resource
 * @returns Middleware function that validates school match
 */
export function requireSchoolMatch(targetSchoolId: string | null | undefined) {
  return async (
    req: NextRequest
  ): Promise<{ user: GuardContext["user"] } | NextResponse> => {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;

    // SYSTEM role bypasses school restrictions
    if (user.role === Role.SYSTEM) {
      return { user };
    }

    // If target resource has no school association, deny access unless SYSTEM
    if (!targetSchoolId) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Access denied. Target resource has no school association.",
          code: "SCHOOL_MATCH_FORBIDDEN",
        },
        { status: 403 }
      );
    }

    if (user.school_id !== targetSchoolId) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Access denied. This resource belongs to a different school.",
          code: "SCHOOL_MATCH_FORBIDDEN",
          userSchool: user.school_id || null,
          targetSchool: targetSchoolId,
        },
        { status: 403 }
      );
    }

    return { user };
  };
}

/**
 * Combines multiple guard functions into a single guard.
 * Executes guards in sequence and returns the first error or the final user context.
 * 
 * @param guards - Array of guard functions to execute
 * @returns Combined guard function
 * 
 * @example
 * ```typescript
 * const authResult = await combineGuards([
 *   requireRole([Role.TEACHER]),
 *   requireClassroomAccess(classroomId)
 * ])(req);
 * ```
 */
export function combineGuards(
  guards: Array<(req: NextRequest) => Promise<{ user: GuardContext["user"] } | NextResponse>>
) {
  return async (
    req: NextRequest
  ): Promise<{ user: GuardContext["user"] } | NextResponse> => {
    let result: { user: GuardContext["user"] } | NextResponse = { user: null as any };

    for (const guard of guards) {
      result = await guard(req);
      if (result instanceof NextResponse) {
        return result;
      }
    }

    return result;
  };
}
