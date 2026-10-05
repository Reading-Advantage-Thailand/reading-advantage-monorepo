import { NextRequest, NextResponse } from "next/server";
import { wearAvatarItem } from "@/server/controllers/avatarController";
import { avatarActor, avatarErrorResponse, NO_STORE, unauthorized } from "@/lib/avatar-route";

/**
 * POST /api/v1/avatar/loadout: wears an owned piece with `{ slot, itemId, dye? }`, or clears the
 * slot with `itemId: null` (FR-2).
 * @param request The request with the JSON body.
 * @returns The loadout; 401, 400, 403, 404, or 409 with the reason.
 */
export async function POST(request: NextRequest) {
  const user = await avatarActor();
  if (!user) return unauthorized();
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json({ loadout: await wearAvatarItem(user, body as never) }, NO_STORE);
  } catch (error) {
    return avatarErrorResponse(error, "POST /api/v1/avatar/loadout");
  }
}
