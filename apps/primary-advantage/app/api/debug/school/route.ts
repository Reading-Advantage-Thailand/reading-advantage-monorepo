import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Debug endpoint to check school data
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        School: {
          include: {
            licenses: true, // Direct relation
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Also check all licenses in the system
    const allLicenses = await prisma.license.findMany({
      select: {
        id: true,
        name: true,
        key: true,
        status: true,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        schoolId: user.schoolId,
      },
      school: user.School
        ? {
            id: user.School.id,
            name: user.School.name,
            licenses: user.School.licenses,
          }
        : null,
      allLicenses,
      debug: {
        hasSchool: !!user.School,
        hasLicenses: !!user.School?.licenses,
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 },
    );
  }
}
