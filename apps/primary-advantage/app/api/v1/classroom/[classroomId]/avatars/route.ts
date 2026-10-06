import { NextResponse } from "next/server";
import { classAvatars } from "@/server/controllers/avatarController";
import { avatarActor, avatarErrorResponse, NO_STORE, unauthorized } from "@/lib/avatar-route";

/**
 * GET /api/v1/classroom/:classroomId/avatars: the avatars of the teacher's class (FR-6).
 * @param _request The request.
 * @param props.params The class id.
 * @returns The students with profile and loadout; 401 or 403.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const user = await avatarActor();
  if (!user) return unauthorized();
  try {
    const { classroomId } = await params;
    return NextResponse.json({ students: await classAvatars(user, classroomId) }, NO_STORE);
  } catch (error) {
    return avatarErrorResponse(error, "GET /api/v1/classroom/:id/avatars");
  }
}
