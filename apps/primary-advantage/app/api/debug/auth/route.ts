import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { db, eq } from '@reading-advantage/db';
import { users, userRoles, roles, schoolAdmins, schools } from '@reading-advantage/db';

// GET /api/debug/auth - Debug authentication
export async function GET(request: NextRequest) {
  try {
    console.log("Debug Auth API: Starting request...");
    const user = await currentUser();

    console.log("Debug Auth API: Current user:", user);

    if (!user) {
      return NextResponse.json(
        {
          error: "No user session found",
          authenticated: false,
        },
        { status: 401 },
      );
    }

    // Get full user data from database (replaces Prisma `findUnique({ include: roles, SchoolAdmins })`).
    const [dbUser] = await db.select().from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({
        authenticated: true,
        sessionUser: user,
        dbUser: null,
      });
    }

    // Fetch user's roles via join.
    const userRoleRows = await db.select({
      roleName: roles.name,
    })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, user.id));

    // Fetch user's school admin records (with school join).
    const schoolAdminRows = await db.select({
      schoolId: schoolAdmins.schoolId,
      schoolName: schools.name,
    })
      .from(schoolAdmins)
      .innerJoin(schools, eq(schools.id, schoolAdmins.schoolId))
      .where(eq(schoolAdmins.userId, user.id));

    return NextResponse.json({
      authenticated: true,
      sessionUser: user,
      dbUser: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        roles: userRoleRows.map((r) => r.roleName),
        schoolAdmins: schoolAdminRows.map((sa) => ({
          schoolId: sa.schoolId,
          schoolName: sa.schoolName,
        })),
        schoolId: dbUser.schoolId,
      },
    });
  } catch (error) {
    console.error("Debug Auth API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}