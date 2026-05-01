import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";

const router = createEdgeRouter<NextRequest, { params: Promise<Record<string, never>> }>();

router.use(logRequest);
router.use(protect);

// GET lowest rated articles
// GET /api/v1/system/lowest-rated-articles?limit=10
async function getLowestRatedArticles(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 10;

    const articles = await prisma.article.findMany({
      where: {
        rating: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        type: true,
        rating: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        rating: 'asc',
      },
      take: limit,
    });

    const formattedArticles = articles.map(article => ({
      id: article.id,
      title: article.title || 'Untitled',
      type: article.type || 'Unknown',
      rating: article.rating ? Number(article.rating.toFixed(1)) : 0,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: formattedArticles,
      count: formattedArticles.length,
    });
  } catch (error) {
    console.error("Error fetching lowest rated articles:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch lowest rated articles",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

router.get(getLowestRatedArticles) as any;

export async function GET(request: NextRequest, ctx: { params: Promise<Record<string, never>> }): Promise<NextResponse> {
    const result = await router.run(request, ctx);
    if (result instanceof NextResponse) {
        return result;
    }
    throw new Error("Expected a NextResponse from router.run");
}
