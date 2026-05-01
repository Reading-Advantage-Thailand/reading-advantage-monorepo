import { NextRequest, NextResponse } from "next/server";
import { createEdgeRouter } from "next-connect";
import { logRequest } from "@/server/middleware";
import { protect } from "@/server/controllers/auth-controller";
import { updateGoalProgress } from "@/server/controllers/goals-controller";

interface RequestContext {
  params: Promise<{
    id: string;
  }>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

// Middleware
router.use(logRequest);
router.use(protect);

// POST /api/v1/goals/:id/progress
router.post(updateGoalProgress) as any;

export async function POST(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
