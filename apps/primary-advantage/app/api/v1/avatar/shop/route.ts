import { NextResponse } from "next/server";
import { avatarShop } from "@/server/controllers/avatarController";
import { avatarActor, avatarErrorResponse, NO_STORE, unauthorized } from "@/lib/avatar-route";

/**
 * GET /api/v1/avatar/shop: the shop list of the signed-in student in popularity order (FR-5).
 * @returns The items, 401 without a user.
 */
export async function GET() {
  const user = await avatarActor();
  if (!user) return unauthorized();
  try {
    return NextResponse.json({ items: await avatarShop(user) }, NO_STORE);
  } catch (error) {
    return avatarErrorResponse(error, "GET /api/v1/avatar/shop");
  }
}
