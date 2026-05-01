import { currentUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { getSchoolLeaderboardController } from "@/server/controllers/schoolController";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's school ID
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { schoolId: true },
    });

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
