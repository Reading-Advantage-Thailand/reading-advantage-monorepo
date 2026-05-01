import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { getArticleActivity } from "@/server/models/lessonModel";

/**
 * GET /api/lessons/[articleId]/activity
 * Get article activity status for sentence activities
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

    const activity = await getArticleActivity(articleId, user.id);

    return NextResponse.json(
      {
        activity,
        success: true,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("API Error - GET /api/lessons/[articleId]/activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch article activity" },
      { status: 500 },
    );
  }
}

