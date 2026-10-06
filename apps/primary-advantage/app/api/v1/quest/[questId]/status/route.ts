import { NextRequest, NextResponse } from "next/server";
import { moveQuest } from "@/server/controllers/questController";
import { avatarActor, avatarErrorResponse, NO_STORE, unauthorized } from "@/lib/avatar-route";

/**
 * POST /api/v1/quest/:questId/status: moves the battle on with `{ status }` (FR-7).
 * @param request The request with the JSON body.
 * @param context The route params with the quest id.
 * @returns The quest; 401, 400, 403, 404, or 409 with the reason.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ questId: string }> }) {
  const user = await avatarActor();
  if (!user) return unauthorized();
  try {
    const { questId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(await moveQuest(user, questId, body as never), NO_STORE);
  } catch (error) {
    return avatarErrorResponse(error, "POST /api/v1/quest/:questId/status");
  }
}
