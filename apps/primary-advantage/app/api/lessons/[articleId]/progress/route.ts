import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { getStandaloneLessonProgress } from "@/server/models/lessonModel";

/**
 * GET /api/lessons/[articleId]/progress
 * Get current progress for a standalone lesson
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await params;

    const userLessonProgress = await getStandaloneLessonProgress(
      user.id,
      articleId,
    );

    return NextResponse.json(
      {
        userLessonProgress,
        success: true,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("API Error - GET /api/lessons/[articleId]/progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson progress" },
      { status: 500 },
    );
  }
}
