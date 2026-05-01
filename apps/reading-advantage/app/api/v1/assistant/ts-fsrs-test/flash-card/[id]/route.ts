import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
import { postFlashCard } from "@/server/controllers/assistant-controller";

// Route only has [id] parameter, so we need a compatible context
interface LocalRequestContext {
  params: Promise<{
    id: string;
  }>;
}

const router = createEdgeRouter<NextRequest, any>();

router.use(logRequest);
router.use(protect);
router.post(async (req, ctx) => {
  // Adapt the context to include article_id (empty string as it's not in this route)
  const adaptedCtx = {
    params: ctx.params.then((p: any) => ({ ...p, article_id: '' }))
  };
  return postFlashCard(req, adaptedCtx as any);
}) as any;

export async function POST(request: NextRequest, ctx: LocalRequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  // Handle the case where result is not a NextResponse
  // You might want to return a default NextResponse or throw an error
  throw new Error("Expected a NextResponse from router.run");
}
