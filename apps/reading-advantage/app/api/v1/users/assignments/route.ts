import { protect } from "@/server/controllers/auth-controller";
import { getStudentAssignments } from "@/server/controllers/assignment-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";

interface RequestContext {
  params: Promise<Record<string, never>>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

router.use(logRequest);
router.use(protect);
//GET /api/v1/users/assignments?studentId=abc123(&status=0/1/2)
router.get(getStudentAssignments) as any;

export async function GET(request: NextRequest) {
  const ctx: RequestContext = { params: Promise.resolve({}) };
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
