import { z } from "zod";
import { fetchArticleById } from "@/server/controllers/articleController";
import { ArticleNotFoundError } from "@/server/models/articleModel";
import { logger } from "@/lib/observability/logger";
import { NextRequest, NextResponse } from "next/server";

const ArticleId = z.string().uuid();

/**
 * Returns one article by id. The id comes from the query (`articleId`) or from the path.
 * @param req The request.
 * @param ctx The route context with the path id.
 * @returns 200 with the article, 404 JSON for an unknown or malformed id, 500 JSON on an unexpected error.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ articleId: string }> }) {
  const { articleId: pathId } = await ctx.params;
  const params = new URLSearchParams(req.nextUrl.searchParams);
  const id = ArticleId.safeParse(params.get("articleId") ?? pathId);
  if (!id.success) return NextResponse.json({ error: "Article not found" }, { status: 404 });
  params.set("articleId", id.data);

  try {
    const articles = await fetchArticleById(params);
    return NextResponse.json({ articles }, { status: 200 });
  } catch (error) {
    if (error instanceof ArticleNotFoundError) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    logger.error("article_fetch_failed", { articleId: id.data, error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
