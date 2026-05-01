import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
import { getArticlesByTypeGenre } from "@/server/controllers/article-controller";
import { protect } from "@/server/controllers/auth-controller";

export interface RequestContext {
  params: Promise<Record<string, never>>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

// Middleware
router.use(logRequest);
router.use(protect);

// API: GET api/v1/system/dashboard/getArticleByTypeGenre
router.get(getArticlesByTypeGenre) as any;

export async function GET(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
