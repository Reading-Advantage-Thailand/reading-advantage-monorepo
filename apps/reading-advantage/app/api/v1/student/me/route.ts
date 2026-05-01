import { NextRequest, NextResponse } from "next/server";
import { createEdgeRouter } from "next-connect";
import { logRequest } from "@/server/middleware";
import { protect, ExtendedNextRequest } from "@/server/controllers/auth-controller";
import { getStudentDashboard } from "@/server/controllers/student-dashboard-controller";

interface RequestContext {
  params: Promise<Record<string, never>>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

// Middleware
router.use(logRequest);
router.use(protect);

// GET /api/v1/student/me
router.get(getStudentDashboard) as any;

export async function GET(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

