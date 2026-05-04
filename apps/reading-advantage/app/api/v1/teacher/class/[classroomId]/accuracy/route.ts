import { createEdgeRouter } from "next-connect";
import { NextRequest } from "next/server";
import { logRequest } from "@/server/middleware";
import { protect, type ExtendedNextRequest } from "@/server/controllers/auth-controller";
import { getClassAccuracy } from "@/server/controllers/class-accuracy-controller";

interface RequestContext {
  params: Promise<{ classroomId: string }>;
}

interface RequestWithParams extends ExtendedNextRequest {
  params?: { classroomId: string };
}

const router = createEdgeRouter<RequestWithParams, RequestContext>();

router.use(logRequest);
router.use(protect);

router.get(getClassAccuracy);

export async function GET(req: NextRequest, ctx: RequestContext) {
  // Attach params to request for the controller to access
  const requestWithParams = req as RequestWithParams;
  requestWithParams.params = await ctx.params;
  return router.run(requestWithParams, ctx) as Promise<Response>;
}
