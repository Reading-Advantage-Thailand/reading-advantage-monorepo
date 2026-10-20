import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { z } from "zod";
import { eq, and, asc, inArray, countDistinct } from 'drizzle-orm';
import { roleSql } from '@/server/utils/role-sql';
import { users, classrooms, classroomStudents, userRoles, roles } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';
import { normalizeRole } from '@/lib/authorization';

interface ClassroomData {
  id: string;
  name: string;
  grade: string | null;
  studentCount: number;
}

// GET /api/classrooms - Fetch classrooms for admin
// ?schoolId=<uuid> narrows the list to one school. Only SYSTEM gets it; other roles ignore it.
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
    const isSystem = normalizeRole(user.role) === "SYSTEM";
    const usersDb = user.schoolId && !isSystem
      ? tenantDb
      : getUnscopedDB("SYSTEM is not tied to one school; self-record lookup by id");
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

    // The session role (users.role) is authoritative; legacy rows are additive.
    const sessionRole = normalizeRole(user.role);
    const isAdmin =
      sessionRole === "ADMIN" ||
      sessionRole === "SYSTEM" ||
      roleNames.some((n) => n === "admin" || n === "system");

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Fetch classrooms with student count. TenantDB injects the schoolId
    // scope for school staff, so the manual `eq(classrooms.schoolId, ...)`
    // filter is redundant and removed. SYSTEM (no schoolId) lists all
    // classrooms via unscoped.
    if (!user.schoolId && sessionRole !== "SYSTEM") {
      // Fail closed: school-less staff see no classrooms.
      return NextResponse.json([]);
    }
    // SYSTEM can have a users.school_id too, but it lists the school of `?schoolId`, not its own.
    const classroomsDb = user.schoolId && sessionRole !== "SYSTEM"
      ? tenantDb
      : getUnscopedDB("SYSTEM is not tied to one school; lists all classrooms or the validated schoolId");
    const rawSchoolId = new URL(request.url).searchParams.get("schoolId");
    const schoolFilter =
      sessionRole === "SYSTEM" && rawSchoolId && z.string().uuid().safeParse(rawSchoolId).success
        ? eq(classrooms.schoolId, rawSchoolId)
        : undefined;
    const classroomRows = await classroomsDb.select().from(classrooms)
      .where(schoolFilter)
      .orderBy(asc(classrooms.name));

    // One grouped query counts the students per classroom. users.role is authoritative.
    const counts = new Map<string, number>();
    if (classroomRows.length > 0) {
      const countRows = await tenantDb
        .unscoped("classroomStudents is REFERENTIAL; scoped via the classroom ids of this school")
        .select({
          classroomId: classroomStudents.classroomId,
          total: countDistinct(users.id),
        })
        .from(classroomStudents)
        .innerJoin(users, eq(users.id, classroomStudents.studentId))
        .where(and(
          inArray(classroomStudents.classroomId, classroomRows.map((c) => c.id)),
          roleSql("student"),
        ))
        .groupBy(classroomStudents.classroomId);
      for (const r of countRows) counts.set(r.classroomId, Number(r.total));
    }

    const classroomsData: ClassroomData[] = classroomRows.map((classroom) => ({
      id: classroom.id,
      name: classroom.name,
      grade: classroom.grade != null ? String(classroom.grade) : null,
      studentCount: counts.get(classroom.id) ?? 0,
    }));

    return NextResponse.json(classroomsData);
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}