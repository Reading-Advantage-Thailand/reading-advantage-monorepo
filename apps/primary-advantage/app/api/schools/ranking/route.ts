import { NextRequest, NextResponse } from "next/server";
import {
  updateSchoolRankingController,
  getSchoolLeaderboardController,
} from "@/server/controllers/schoolController";
import { currentUser } from "@/lib/session";
import { eq } from 'drizzle-orm';
import { users } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';

export async function POST(request: NextRequest) {
  try {
    const accessKey = request.headers.get("x-access-key");
    if (accessKey !== process.env.ACCESS_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await updateSchoolRankingController();

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating school ranking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

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

    // Get schoolId from query params or user's school
    const { searchParams } = new URL(request.url);
    let schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      // If no schoolId provided, use user's school
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

      schoolId = userData.schoolId;
    }

    // Pass userId if it's a student requesting their own leaderboard
    const result = await getSchoolLeaderboardController(schoolId, user.id);

    return NextResponse.json(
      {
        success: result.success,
        data: result.data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching school ranking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
