import { translateArticleSummary } from "@/server/controllers/article-controller";
import { NextRequest, NextResponse } from "next/server";

interface RequestContext {
  params: Promise<{
    article_id: string;
  }>;
}

export async function POST(
  request: NextRequest,
  context: RequestContext
) {
  return await translateArticleSummary(request, context);
}
