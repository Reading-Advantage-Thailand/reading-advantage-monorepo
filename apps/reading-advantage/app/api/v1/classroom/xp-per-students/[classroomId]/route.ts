import { logRequest } from "@/server/middleware";
import { protect } from "@/server/controllers/auth-controller";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
import { getClassXpPerStudents } from "@/server/controllers/classroom-controller";

export interface RequestContext {
  params: Promise<{
    classroomId: string;
  }>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

// Middleware
router.use(logRequest);
router.use(protect);

// API: GET /api/v1/classroom/xp-per-student/classrom_id
router.get(getClassXpPerStudents) as any;

// Export API Route for Next.js
export async function GET(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
