import { NextResponse } from "next/server";
import { resetClassAvatar } from "@/server/controllers/avatarController";
import { avatarActor, avatarErrorResponse, NO_STORE, unauthorized } from "@/lib/avatar-route";

/**
 * POST /api/v1/classroom/:classroomId/avatars/:userId/reset: clears a student's avatar and worn
 * pieces for the teacher (FR-6); the inventory and the GP stay.
 * @param _request The request.
 * @param props.params The class id and the student id.
 * @returns `{ ok: true }`; 401, 403, or 404.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ classroomId: string; userId: string }> }) {
  const user = await avatarActor();
  if (!user) return unauthorized();
  try {
    const { classroomId, userId } = await params;
    await resetClassAvatar(user, classroomId, userId);
    return NextResponse.json({ ok: true }, NO_STORE);
  } catch (error) {
    return avatarErrorResponse(error, "POST /api/v1/classroom/:id/avatars/:userId/reset");
  }
}
