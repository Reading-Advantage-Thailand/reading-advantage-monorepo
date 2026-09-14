import { currentUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { getSchoolLeaderboardController } from "@/server/controllers/schoolController";
import { eq } from 'drizzle-orm';
import { users } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization decision via the central policy. The leaderboard serves
    // any authenticated user; student:read:own is the matching low-privilege
    // permission.
    try {
      assertCan(user, "student:read:own", { schoolId: user.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw error;
    }

    // Get user's school ID
    const tenantDb = getTenantDB({ schoolId: user.schoolId ?? null });
    // SYSTEM has no schoolId; TenantDB fails closed on FLAT tables, so the
    // self-record lookup runs through unscoped for SYSTEM callers.
    const usersDb = user.schoolId
      ? tenantDb
      : getUnscopedDB("SYSTEM has no schoolId; self-record lookup by id");
    const [userData] = await usersDb.select({ schoolId: users.schoolId })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userData?.schoolId) {
      return NextResponse.json(
        { error: "User is not associated with any school" },
        { status: 404 },
      );
    }

    const result = await getSchoolLeaderboardController(
      userData.schoolId,
      user.id,
    );

    return NextResponse.json(
      {
        success: result.success,
        data: result.data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching student leaderboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
