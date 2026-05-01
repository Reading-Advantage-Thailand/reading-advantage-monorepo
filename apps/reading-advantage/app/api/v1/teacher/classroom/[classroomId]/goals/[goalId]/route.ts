import { NextRequest, NextResponse } from "next/server";
import { createEdgeRouter } from "next-connect";
import { logRequest } from "@/server/middleware";
import { protect } from "@/server/controllers/auth-controller";
import {
  updateClassroomGoal,
  deleteClassroomGoal,
} from "@/server/controllers/classroom-goals-controller";

interface RequestContext {
  params: Promise<{
    classroomId: string;
    goalId: string;
  }>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

// Middleware
router.use(logRequest);
router.use(protect);

// PATCH /api/v1/teacher/classroom/[classroomId]/goals/[goalId] - Update goal
router.patch(updateClassroomGoal) as any;

// DELETE /api/v1/teacher/classroom/[classroomId]/goals/[goalId] - Delete goal
router.delete(deleteClassroomGoal) as any;

export async function PATCH(
  request: NextRequest,
  ctx: RequestContext
) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

export async function DELETE(
  request: NextRequest,
  ctx: RequestContext
) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
