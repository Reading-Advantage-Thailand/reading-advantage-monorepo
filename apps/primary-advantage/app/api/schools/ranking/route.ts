import { NextRequest, NextResponse } from "next/server";
import {
  updateSchoolRankingController,
  getSchoolLeaderboardController,
} from "@/server/controllers/schoolController";
import { currentUser } from "@/lib/session";
import { timingSafeEqual } from "crypto";
import { logger } from "@/lib/observability/logger";
import { assertCan, AuthError } from '@reading-advantage/auth';

/**
 * Compares the access key header with `ACCESS_KEY` in constant time.
 * @param provided The value of the `x-access-key` header.
 * @returns True only when `ACCESS_KEY` is set and equal to the header.
 */
function hasValidAccessKey(provided: string | null): boolean {
  const expected = process.env.ACCESS_KEY;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  try {
    const accessKey = request.headers.get("x-access-key");
    if (!hasValidAccessKey(accessKey)) {
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
    logger.error("school_ranking_update_failed", { error });
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

    // Only SYSTEM may name a school; everyone else reads the leaderboard of the own school.
    const queryId = new URL(request.url).searchParams.get("schoolId");
    const schoolId = user.role === "SYSTEM" && queryId ? queryId : user.schoolId;

    if (!schoolId) {
      return NextResponse.json(
        { error: "User is not associated with any school" },
        { status: 404 },
      );
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
    logger.error("school_ranking_fetch_failed", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
