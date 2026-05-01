import { protect } from "@/server/controllers/auth-controller";
import {
  getAssignmentNotifications,
  sendAssignmentNotifications,
  updateNotificationStatus,
  getNotificationHistory,
} from "@/server/controllers/assignment-notification-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";

interface RequestContext {
  params: Promise<Record<string, never>>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

router.use(logRequest);
router.use(protect);

// GET /api/v1/assignment-notifications?studentId=abc123 (for students to get their notifications)
// GET /api/v1/assignment-notifications?teacherId=abc123&history=true (for teachers to get notification history)
router.get(getAssignmentNotifications) as any;

// POST /api/v1/assignment-notifications (send notifications to students)
// Body: { assignmentIds: string[], studentIds: string[], teacherId: string }
router.post(sendAssignmentNotifications) as any;

// PATCH /api/v1/assignment-notifications (mark notification as noticed)
// Body: { notificationId: string, isNoticed: boolean }
router.patch(updateNotificationStatus) as any;

export async function GET(request: NextRequest) {
  const ctx: RequestContext = {
    params: Promise.resolve({})
  };
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

export async function POST(request: NextRequest) {
  const ctx: RequestContext = {
    params: Promise.resolve({})
  };
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

export async function PATCH(request: NextRequest) {
  const ctx: RequestContext = { params: Promise.resolve({}) };
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
