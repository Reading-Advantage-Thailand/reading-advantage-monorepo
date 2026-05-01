import { deleteArticle } from "@/server/controllers/article-controller";
import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";

// Next.js expects this to match the folder name [articleId]
interface NextJsContext {
  params: Promise<{
    articleId: string;
  }>;
}

// The controller expects article_id (snake_case)
interface ControllerContext {
  params: Promise<{
    article_id: string;
  }>;
}

const router = createEdgeRouter<NextRequest, ControllerContext>();

router.use(logRequest);
router.use(protect);
router.delete(deleteArticle) as any;

// Adapter function to transform articleId to article_id
async function adaptContext(ctx: NextJsContext): Promise<ControllerContext> {
  const params = await ctx.params;
  return {
    params: Promise.resolve({ article_id: params.articleId }),
  };
}

export async function GET(request: NextRequest, ctx: NextJsContext) {
  const adaptedCtx = await adaptContext(ctx);
  const result = await router.run(request, adaptedCtx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

export async function POST(request: NextRequest, ctx: NextJsContext) {
  const adaptedCtx = await adaptContext(ctx);
  const result = await router.run(request, adaptedCtx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

export async function DELETE(request: NextRequest, ctx: NextJsContext) {
  const adaptedCtx = await adaptContext(ctx);
  const result = await router.run(request, adaptedCtx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
