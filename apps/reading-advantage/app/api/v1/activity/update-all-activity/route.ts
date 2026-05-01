import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
import { updateAllUserActivity } from "@/server/controllers/activity-controller";
import { restrictAccessKey } from "@/server/controllers/auth-controller";

export interface RequestContext {
  params: Promise<Record<string, never>>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

router.use(logRequest);
router.use(restrictAccessKey);

//api/activity
router.post(updateAllUserActivity) as any;

export async function POST(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  // Handle the case where result is not a NextResponse
  // You might want to return a default NextResponse or throw an error
  throw new Error("Expected a NextResponse from router.run");
}
