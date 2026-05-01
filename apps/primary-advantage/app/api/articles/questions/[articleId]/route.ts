import { handleUpdateUserActivity } from "@/server/controllers/userController";
import { getQuestionsByArticleId } from "@/server/models/articleModel";
import { NextRequest, NextResponse } from "next/server";
import { ActivityType } from "@/types/enum";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const articleId = searchParams.get("articleId");
    const questionType = searchParams.get("questionType");

    if (!articleId || !questionType) {
      return new Response("Missing parameters", { status: 400 });
    }

    // Fetch questions based on articleId and questionType
    // This is a placeholder. Replace with actual fetching logic.
    const questions = await getQuestionsByArticleId(
      articleId,
      questionType as ActivityType,
    );

    return new Response(JSON.stringify(questions), { status: 200 });
  } catch (error) {
    return new Response("Error", { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> },
) {
  try {
    const { articleId } = await params;
    const body = await req.json();

    // Handle POST request logic here
    // This is a placeholder. Replace with actual logic.
    const result = await handleUpdateUserActivity(body, articleId);

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    return NextResponse.json("Error", { status: 500 });
  }
}
