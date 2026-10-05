import { NextRequest, NextResponse } from "next/server";
import { db } from "@reading-advantage/db";
import { recordLessonProgress } from "@reading-advantage/domain/primary-books";
import { currentUser } from "@/lib/session";
import {
  getArticleForLesson,
  updateStandaloneLessonProgress,
} from "@/server/models/lessonModel";

/**
 * GET /api/lessons/[articleId]
 * Get article data for standalone lesson
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

    const article = await getArticleForLesson(articleId);

    return NextResponse.json(
      {
        article,
        success: true,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("API Error - GET /api/lessons/[articleId]:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson data" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/lessons/[articleId]
 * Update progress for standalone lesson
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await params;
    const body = await req.json();
    const { progress, timeSpent } = body;

    // Validate input
    if (
      typeof progress !== "number" ||
      typeof timeSpent !== "number" ||
      progress < 0 ||
      progress > 100
    ) {
      return NextResponse.json(
        { error: "Invalid progress or timeSpent data" },
        { status: 400 },
      );
    }

    await updateStandaloneLessonProgress(
      user.id,
      articleId,
      progress,
      timeSpent,
    );

    // Class book progress (FR-5): the step the student moved to, from the 14-step percent.
    // A failure here must not block the lesson.
    const reachedStep = Math.min(14, Math.max(1, Math.round((progress * 14) / 100)));
    await recordLessonProgress({ db, user, input: { articleId, reachedStep, seconds: Math.round(timeSpent) } }).catch((error: unknown) =>
      console.error("API Error - class book progress for POST /api/lessons/[articleId]:", error),
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("API Error - POST /api/lessons/[articleId]:", error);
    return NextResponse.json(
      { error: "Failed to update lesson progress" },
      { status: 500 },
    );
  }
}

