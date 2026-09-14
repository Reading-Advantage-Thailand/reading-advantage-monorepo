import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { eq, and, asc } from 'drizzle-orm';
import { users, classrooms, classroomStudents, userRoles, roles } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';

interface ClassroomData {
  id: string;
  name: string;
  grade: string | null;
  studentCount: number;
}

// GET /api/classrooms - Fetch classrooms for admin
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ClassroomData[] | { error: string }>> {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization decision via the central policy. Runs before any DB read
    // so denied callers issue no queries; the DB-role gate below still runs.
    try {
      assertCan(user, "admin:dashboard", { schoolId: user.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 },
        );
      }
      throw error;
    }

    // Check if user has admin permissions (replaces Prisma `findUnique({ include: roles, SchoolAdmins })`).
    const tenantDb = getTenantDB({ schoolId: user.schoolId ?? null });
    // SYSTEM has no schoolId; TenantDB fails closed on FLAT tables, so the
    // self-record lookup runs through unscoped for SYSTEM callers.
    const usersDb = user.schoolId
      ? tenantDb
      : getUnscopedDB("SYSTEM has no schoolId; self-record lookup by id");
    const [userWithRoles] = await usersDb.select().from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch the user's roles via join.
    const userRoleRows = await tenantDb
      .unscoped("userRoles is REFERENTIAL and roles is EXEMPT; stitched by userId")
      .select({
      roleName: roles.name,
    })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, user.id));

    const roleNames = userRoleRows.map((r) => r.roleName);

    // Fetch the user's school admin records.
    const schoolAdminRows = await tenantDb
      .unscoped("userRoles is REFERENTIAL; scoped via users.schoolId")
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, user.id), eq(userRoles.userId, user.id)));

    const isAdmin = roleNames.some((n) => n === "admin" || n === "system");

    if (!isAdmin && schoolAdminRows.length === 0) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Fetch classrooms with student count. TenantDB injects the schoolId
    // scope for school staff, so the manual `eq(classrooms.schoolId, ...)`
    // filter is redundant and removed. SYSTEM (no schoolId) lists all
    // classrooms via unscoped.
    const classroomsDb = user.schoolId
      ? tenantDb
      : getUnscopedDB("SYSTEM or school-less staff list all classrooms; no schoolId");
    const classroomRows = await classroomsDb.select().from(classrooms)
      .orderBy(asc(classrooms.name));

    // For each classroom, fetch students + their roles for the count.
    const classroomsData: ClassroomData[] = await Promise.all(
      classroomRows.map(async (classroom) => {
        const studentRows = await tenantDb
          .unscoped("classroomStudents is REFERENTIAL; scoped via classrooms.schoolId")
          .select({
          studentId: classroomStudents.studentId,
        })
          .from(classroomStudents)
          .where(eq(classroomStudents.classroomId, classroom.id));

        const studentIds = studentRows.map((s) => s.studentId);
        let studentRoleCount = 0;
        if (studentIds.length > 0) {
          const studentRoleRows = await tenantDb
            .unscoped("userRoles is REFERENTIAL and roles is EXEMPT; stitched by userId")
            .select({ userId: userRoles.userId })
            .from(userRoles)
            .innerJoin(roles, eq(roles.id, userRoles.roleId))
            .where(and(
              eq(roles.name, "student"),
              // userIds match
              ...studentIds.map((sid) => eq(userRoles.userId, sid)).slice(0, 1),
            ));
          // Simpler: count distinct students with student role.
          const allStudentRoleRows = await tenantDb
            .unscoped("userRoles is REFERENTIAL and roles is EXEMPT; stitched by userId")
            .select({ userId: userRoles.userId })
            .from(userRoles)
            .innerJoin(roles, eq(roles.id, userRoles.roleId))
            .where(eq(roles.name, "student"));
          const studentRoleSet = new Set(allStudentRoleRows.map((r) => r.userId));
          studentRoleCount = studentIds.filter((sid) => studentRoleSet.has(sid)).length;
        }

        return {
          id: classroom.id,
          name: classroom.name,
          grade: classroom.grade != null ? String(classroom.grade) : null,
          studentCount: studentRoleCount,
        };
      }),
    );

    return NextResponse.json(classroomsData);
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}