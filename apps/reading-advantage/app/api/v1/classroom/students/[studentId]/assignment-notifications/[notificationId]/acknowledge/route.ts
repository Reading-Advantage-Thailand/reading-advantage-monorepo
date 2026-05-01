import { NextRequest, NextResponse } from "next/server";
import { protect, ExtendedNextRequest } from "@/server/controllers/auth-controller";
import { acknowledgeNotification } from "@/server/controllers/student-notification-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";

interface RequestContext {
  params: Promise<{
    studentId: string;
    notificationId: string;
  }>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

router.use(logRequest);
router.use(protect);

// PATCH /api/v1/classroom/students/[studentId]/assignment-notifications/[notificationId]/acknowledge
router.patch(async (req: ExtendedNextRequest, ctx: RequestContext) => {
  return acknowledgeNotification(req, ctx) as any;
});

export async function PATCH(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
