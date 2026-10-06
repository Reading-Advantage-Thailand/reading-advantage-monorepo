import { NextRequest, NextResponse } from "next/server";
import { cancelQuest } from "@/server/controllers/questController";
import { avatarActor, avatarErrorResponse, NO_STORE, unauthorized } from "@/lib/avatar-route";

/**
 * DELETE /api/v1/quest/:questId: cancels an open quest before the battle (FR-2).
 * @param _request The request.
 * @param context The route params with the quest id.
 * @returns 204; 401, 403, 404, or 409 with the reason.
 */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ questId: string }> }) {
  const user = await avatarActor();
  if (!user) return unauthorized();
  try {
    const { questId } = await context.params;
    await cancelQuest(user, questId);
    return new NextResponse(null, { status: 204, ...NO_STORE });
  } catch (error) {
    return avatarErrorResponse(error, "DELETE /api/v1/quest/:questId");
  }
}
