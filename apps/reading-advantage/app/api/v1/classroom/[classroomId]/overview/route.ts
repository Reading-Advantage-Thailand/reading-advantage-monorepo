import { NextRequest, NextResponse } from "next/server";
import { createEdgeRouter } from "next-connect";
import { logRequest } from "@/server/middleware";
import { protect, ExtendedNextRequest } from "@/server/controllers/auth-controller";
import { getClassroomOverview } from "@/server/controllers/classroom-controller";

interface RequestContext {
  params: Promise<{
    classroomId: string;
  }>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

// Middleware
router.use(logRequest);
router.use(protect);

// GET /api/v1/classroom/[classroomId]/overview
router.get(async (req: ExtendedNextRequest, ctx: RequestContext) => {
  const { classroomId } = await ctx.params;
  return getClassroomOverview(req, classroomId) as any;
});

export async function GET(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

