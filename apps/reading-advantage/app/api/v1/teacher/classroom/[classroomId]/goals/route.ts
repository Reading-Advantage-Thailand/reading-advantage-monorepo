import { NextRequest, NextResponse } from "next/server";
import { createEdgeRouter } from "next-connect";
import { logRequest } from "@/server/middleware";
import { protect } from "@/server/controllers/auth-controller";
import {
  getClassroomGoals,
  createClassroomGoal,
} from "@/server/controllers/classroom-goals-controller";

interface RequestContext {
  params: Promise<{
    classroomId: string;
  }>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

// Middleware
router.use(logRequest);
router.use(protect);

// GET /api/v1/teacher/classroom/[classroomId]/goals - Get classroom goals
router.get(getClassroomGoals) as any;

// POST /api/v1/teacher/classroom/[classroomId]/goals - Create classroom goal for student
router.post(createClassroomGoal) as any;

export async function GET(
  request: NextRequest,
  ctx: RequestContext
) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

export async function POST(
  request: NextRequest,
  ctx: RequestContext
) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
