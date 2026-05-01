import { NextRequest, NextResponse } from "next/server";
import {
  updateSchoolRankingController,
  getSchoolLeaderboardController,
} from "@/server/controllers/schoolController";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

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

    // Get schoolId from query params or user's school
    const { searchParams } = new URL(request.url);
    let schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      // If no schoolId provided, use user's school
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
