import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

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

    // Get full user data from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        SchoolAdmins: {
          include: {
            school: true,
          },
        },
      },
    });

    return NextResponse.json({
      authenticated: true,
      sessionUser: user,
      dbUser: dbUser
        ? {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            roles: dbUser.roles.map((r) => r.role.name),
            schoolAdmins: dbUser.SchoolAdmins.map((sa) => ({
              schoolId: sa.schoolId,
              schoolName: sa.school.name,
            })),
            schoolId: dbUser.schoolId,
          }
        : null,
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
