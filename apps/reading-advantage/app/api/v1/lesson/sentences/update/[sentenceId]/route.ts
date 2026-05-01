import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
import { logRequest } from "@/server/middleware";
import { protect } from "@/server/controllers/auth-controller";
import { updateLessonSentence, deleteLessonSentence } from "@/server/controllers/lesson-controller";

interface RequestContext {
  params: Promise<{
    sentenceId: string;
  }>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

router.use(logRequest);
router.use(protect);
router.put(updateLessonSentence) as any;
router.delete(deleteLessonSentence) as any;

export async function PUT(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

export async function DELETE(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
