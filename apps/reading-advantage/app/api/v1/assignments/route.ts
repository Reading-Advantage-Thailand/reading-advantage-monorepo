import { protect, restrictTo } from "@/server/controllers/auth-controller";
import { Role } from "@prisma/client";
import {
  getAssignments,
  postAssignment,
  updateAssignment,
  deleteAssignment,
} from "@/server/controllers/assignment-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";

interface RequestContext {
  params: Promise<Record<string, never>>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

router.use(logRequest);
// restrict to STAFF/ADMIN/TEACHER equivalent to assignments management
router.use(restrictTo(Role.TEACHER, Role.ADMIN, Role.SYSTEM) as any);
//GET /api/v1/assignments?classroomId=abc123&articleId=xyz456
router.get(getAssignments) as any;
// POST /api/v1/assignments {request body with classroomId, articleId, title, description, dueDate, selectedStudents, userId}
router.post(postAssignment) as any;
router.put(updateAssignment) as any;
router.delete(deleteAssignment) as any;

export async function GET(request: NextRequest) {
  const ctx: RequestContext = { params: Promise.resolve({}) };
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

export async function POST(request: NextRequest) {
  const ctx: RequestContext = { params: Promise.resolve({}) };
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

export async function PUT(request: NextRequest) {
  const ctx: RequestContext = { params: Promise.resolve({}) };
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

export async function DELETE(request: NextRequest) {
  const ctx: RequestContext = { params: Promise.resolve({}) };
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
