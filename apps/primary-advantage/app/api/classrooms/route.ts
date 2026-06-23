import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { db, eq, and, asc } from '@reading-advantage/db';
import { users, classrooms, classroomStudents, userRoles, roles } from '@reading-advantage/db';

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

    // Check if user has admin permissions (replaces Prisma `findUnique({ include: roles, SchoolAdmins })`).
    const [userWithRoles] = await db.select().from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch the user's roles via join.
    const userRoleRows = await db.select({
      roleName: roles.name,
    })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, user.id));

    const roleNames = userRoleRows.map((r) => r.roleName);

    // Fetch the user's school admin records.
    const schoolAdminRows = await db.select().from(userRoles)
      .where(and(eq(userRoles.userId, user.id), eq(userRoles.userId, user.id)));

    const isAdmin = roleNames.some((n) => n === "admin" || n === "system");

    if (!isAdmin && schoolAdminRows.length === 0) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Build where clause based on user's permissions
    const whereConditions: any[] = [];

    // If user is school admin, only show classrooms from their school
    if (schoolAdminRows.length > 0 && !roleNames.includes("system")) {
      if (userWithRoles.schoolId) {
        whereConditions.push(eq(classrooms.schoolId, userWithRoles.schoolId));
      }
    }

    // Fetch classrooms with student count
    const classroomRows = whereConditions.length > 0
      ? await db.select().from(classrooms)
        .where(and(...whereConditions))
        .orderBy(asc(classrooms.name))
      : await db.select().from(classrooms)
        .orderBy(asc(classrooms.name));

    // For each classroom, fetch students + their roles for the count.
    const classroomsData: ClassroomData[] = await Promise.all(
      classroomRows.map(async (classroom) => {
        const studentRows = await db.select({
          studentId: classroomStudents.studentId,
        })
          .from(classroomStudents)
          .where(eq(classroomStudents.classroomId, classroom.id));

        const studentIds = studentRows.map((s) => s.studentId);
        let studentRoleCount = 0;
        if (studentIds.length > 0) {
          const studentRoleRows = await db.select({ userId: userRoles.userId })
            .from(userRoles)
            .innerJoin(roles, eq(roles.id, userRoles.roleId))
            .where(and(
              eq(roles.name, "student"),
              // userIds match
              ...studentIds.map((sid) => eq(userRoles.userId, sid)).slice(0, 1),
            ));
          // Simpler: count distinct students with student role.
          const allStudentRoleRows = await db.select({ userId: userRoles.userId })
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