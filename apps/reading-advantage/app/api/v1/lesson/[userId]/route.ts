import { logRequest } from "@/server/middleware";
import { protect } from "@/server/controllers/auth-controller";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
import { getLessonStatus,postLessonStatus,putLessonPhaseStatus } from "@/server/controllers/lesson-controller";

export interface RequestContext {
  params: Promise<{
    userId: string;
  }>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

// Middleware
router.use(logRequest);
router.use(protect);

// API: GET /api/v1/userId/lesson?articleId=...
router.get(getLessonStatus) as any;
router.post(postLessonStatus) as any;
router.put(putLessonPhaseStatus) as any;

// Export API Route for Next.js
export async function GET(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

export async function POST(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

export async function PUT(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}