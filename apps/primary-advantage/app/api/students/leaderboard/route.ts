import { currentUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { getSchoolLeaderboardController } from "@/server/controllers/schoolController";
import { db, eq } from '@reading-advantage/db';
import { users } from '@reading-advantage/db';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's school ID
    const [userData] = await db.select({ schoolId: users.schoolId })
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
