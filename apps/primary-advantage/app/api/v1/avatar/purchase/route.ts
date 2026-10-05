import { NextRequest, NextResponse } from "next/server";
import { buyAvatarItem } from "@/server/controllers/avatarController";
import { avatarActor, avatarErrorResponse, NO_STORE, unauthorized } from "@/lib/avatar-route";

/**
 * POST /api/v1/avatar/purchase: buys a piece or a dye with `{ itemId, dye? }` (FR-3).
 * @param request The request with the JSON body.
 * @returns The owned item and the GP left; 401, 400, 403, 404, or 409 with the reason.
 */
export async function POST(request: NextRequest) {
  const user = await avatarActor();
  if (!user) return unauthorized();
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(await buyAvatarItem(user, body as never), { status: 201, ...NO_STORE });
  } catch (error) {
    return avatarErrorResponse(error, "POST /api/v1/avatar/purchase");
  }
}
