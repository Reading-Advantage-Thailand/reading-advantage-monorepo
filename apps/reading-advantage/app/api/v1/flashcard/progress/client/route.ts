import { updateFlashcardProgress } from "@/server/controllers/flashcard-controller";
import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";

export interface RequestContext {
  params: Promise<{
    id?: string;
    articleId?: string;
  }>;
}

// Custom handler for client-side progress updates
async function updateFlashcardProgressClient(req: any, ctx: RequestContext) {
  const body = await req.json();
  const { cardId, rating, type } = body;
  
  if (!req.session?.user?.id) {
    return NextResponse.json({
      message: "Unauthorized",
      status: 403,
    });
  }

  // Create a modified request context with the user ID
  const modifiedCtx = {
    params: Promise.resolve({ id: req.session.user.id })
  };
  
  // Create a modified request with the body data
  const modifiedReq = {
    ...req,
    json: async () => ({ cardId, rating, type }),
  };

  return updateFlashcardProgress(modifiedReq, modifiedCtx);
}

const router = createEdgeRouter<NextRequest, RequestContext>();

router.use(logRequest);
router.use(protect);
router.post(updateFlashcardProgressClient) as any;

export async function POST(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
