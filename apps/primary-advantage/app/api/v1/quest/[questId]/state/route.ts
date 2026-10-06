import { NextRequest, NextResponse } from "next/server";
import { questDashboard } from "@/server/controllers/questController";
import { avatarActor, avatarErrorResponse, NO_STORE, unauthorized } from "@/lib/avatar-route";

/**
 * GET /api/v1/quest/:questId/state: the projector dashboard state (FR-10), polled by the teacher screen.
 * @param _request The request.
 * @param context The route params with the quest id.
 * @returns The state; 401, 403, or 404 with the reason.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ questId: string }> }) {
  const user = await avatarActor();
  if (!user) return unauthorized();
  try {
    const { questId } = await context.params;
    return NextResponse.json(await questDashboard(user, questId), NO_STORE);
  } catch (error) {
    return avatarErrorResponse(error, "GET /api/v1/quest/:questId/state");
  }
}
