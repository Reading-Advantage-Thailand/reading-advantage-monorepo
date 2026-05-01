/**
 * Class Overview API
 * GET /api/v1/teacher/class/[classroomId]/overview
 * 
 * Returns comprehensive KPIs and summary metrics for a specific class
 */

import { NextRequest, NextResponse } from "next/server";
import { createEdgeRouter } from "next-connect";
import { logRequest } from "@/server/middleware";
import { protect } from "@/server/controllers/auth-controller";
import { getClassOverview } from "@/server/controllers/class-dashboard-controller";

interface RequestContext {
  params: Promise<{
    classroomId: string;
  }>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

// Middleware
router.use(logRequest);
router.use(protect);

// GET /api/v1/teacher/class/[classroomId]/overview
router.get(getClassOverview) as any;

export async function GET(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

