import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db, eq } from '@reading-advantage/db';
import { users, licenses, schools, schoolAdmins } from '@reading-advantage/db';

// Debug endpoint to check school data
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user (replaces Prisma `findUnique({ include: School, School.licenses })`).
    const [user] = await db.select().from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch user's school + licenses (manual stitch via FK).
    let schoolData: { id: string; name: string; licenses: any[] } | null = null;
    if (user.schoolId) {
      const [school] = await db.select().from(schools)
        .where(eq(schools.id, user.schoolId))
        .limit(1);
      if (school) {
        const schoolLicenseRows = await db.select({
          id: licenses.id,
          name: licenses.name,
          key: licenses.key,
          status: licenses.status,
        })
          .from(licenses)
          .where(eq(licenses.schoolId, school.id));
        schoolData = {
          id: school.id,
          name: school.name,
          licenses: schoolLicenseRows,
        };
      }
    }

    // Also check all licenses in the system (replaces Prisma `findMany({ select })`).
    const allLicenses = await db.select({
      id: licenses.id,
      name: licenses.name,
      key: licenses.key,
      status: licenses.status,
    }).from(licenses);

    return NextResponse.json({
      user: {
        id: user.id,
        schoolId: user.schoolId,
      },
      school: schoolData,
      allLicenses,
      debug: {
        hasSchool: !!schoolData,
        hasLicenses: !!schoolData?.licenses && schoolData.licenses.length > 0,
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