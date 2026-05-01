/**
 * Class Data Export API
 * GET /api/v1/teacher/class/[classroomId]/export
 * 
 * Exports class data in various formats (CSV, JSON)
 */

import { NextRequest, NextResponse } from "next/server";
import { createEdgeRouter } from "next-connect";
import { logRequest } from "@/server/middleware";
import { protect } from "@/server/controllers/auth-controller";
import { exportClassData } from "@/server/controllers/class-export-controller";

interface RequestContext {
  params: Promise<{
    classroomId: string;
  }>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

// Middleware
router.use(logRequest);
router.use(protect);

// GET /api/v1/teacher/class/[classroomId]/export
router.get(exportClassData) as any;

export async function GET(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
