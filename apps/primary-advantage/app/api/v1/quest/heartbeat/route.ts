import { NextRequest, NextResponse } from "next/server";
import { postQuestHeartbeat } from "@/server/controllers/questController";
import { avatarActor, avatarErrorResponse, NO_STORE, unauthorized } from "@/lib/avatar-route";

/**
 * POST /api/v1/quest/heartbeat: stores the phone's latest numbers (FR-8).
 * @param request The request with the heartbeat JSON body.
 * @returns 204; 401, 400, 403, 404, or 409 with the reason.
 */
export async function POST(request: NextRequest) {
  const user = await avatarActor();
  if (!user) return unauthorized();
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await postQuestHeartbeat(user, body as never);
    return new NextResponse(null, { status: 204, ...NO_STORE });
  } catch (error) {
    return avatarErrorResponse(error, "POST /api/v1/quest/heartbeat");
  }
}
