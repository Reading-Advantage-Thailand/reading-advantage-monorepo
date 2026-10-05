import { NextRequest, NextResponse } from "next/server";
import { assignQuest } from "@/server/controllers/questController";
import { avatarActor, avatarErrorResponse, NO_STORE, unauthorized } from "@/lib/avatar-route";

/**
 * POST /api/v1/quest: assigns a quest template to a class with `{ templateId, classId, battleAt, startsAt? }` (FR-2).
 * @param request The request with the JSON body.
 * @returns The quest; 401, 400, 403, 404, 409, or 422 with the reason.
 */
export async function POST(request: NextRequest) {
  const user = await avatarActor();
  if (!user) return unauthorized();
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(await assignQuest(user, body as never), { status: 201, ...NO_STORE });
  } catch (error) {
    return avatarErrorResponse(error, "POST /api/v1/quest");
  }
}
