import { createEdgeRouter } from "next-connect";
import { NextRequest } from "next/server";
import { logRequest } from "@/server/middleware";
import { protect } from "@/server/controllers/auth-controller";
import { getClassAccuracy } from "@/server/controllers/class-accuracy-controller";

interface RequestContext {
  params: Promise<{ classroomId: string }>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

router.use(logRequest);
router.use(protect);

router.get(getClassAccuracy) as any;

export async function GET(req: NextRequest, ctx: RequestContext) {
  // Attach params to request for the controller to access
  (req as any).params = await ctx.params;
  return router.run(req, ctx) as Promise<Response>;
}
