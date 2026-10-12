import { handleUpdateUserActivity } from "@/server/controllers/userController";
import { getQuestionsByArticleId } from "@/server/models/articleModel";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActivityType } from "@/types/enum";
import { currentUser } from "@/lib/session";
import { guardStudentRoute } from "@/lib/student-view";
import { logger } from "@/lib/observability/logger";

const questionTypeSchema = z.nativeEnum(ActivityType);

/** The body that the question cards send: the activity type and its progress data. */
const updateActivityBodySchema = z.object({
  activityType: questionTypeSchema,
  data: z.object({
    responses: z.array(z.string().max(5000)).max(50).optional(),
    progress: z.array(z.number()).max(50).optional(),
    timer: z.number().min(0),
  }),
});

/**
 * Reads the questions of an article and the saved result of the signed-in user.
 * @param req The request with the `articleId` and `questionType` query parameters.
 * @returns The questions as JSON; 401 without a session, 400 for a bad query.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const articleId = searchParams.get("articleId");
    const questionType = questionTypeSchema.safeParse(searchParams.get("questionType"));

    if (!articleId || !questionType.success) {
      return new Response("Missing parameters", { status: 400 });
    }

    const questions = await getQuestionsByArticleId(articleId, questionType.data);

    return new Response(JSON.stringify(questions), { status: 200 });
  } catch (error) {
    logger.error("article_questions_get_failed", { error });
    return new Response("Error", { status: 500 });
  }
}

/**
 * Records the question activity of the signed-in student.
 * @param req The request with the activity body.
 * @param context The route context with the article id.
 * @returns The result as JSON; 401 without a session, 400 for a bad body.
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
    const preview = guardStudentRoute(user, "article_questions_activity");
    if (preview) return preview;

    const { articleId } = await params;
    const parsed = updateActivityBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 });
    }

    const result = await handleUpdateUserActivity(parsed.data, articleId);

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    logger.error("article_questions_post_failed", { error });
    return NextResponse.json("Error", { status: 500 });
  }
}
