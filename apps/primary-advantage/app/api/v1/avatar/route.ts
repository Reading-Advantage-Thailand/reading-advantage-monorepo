import { NextResponse } from "next/server";
import { avatarState } from "@/server/controllers/avatarController";
import { avatarActor, avatarErrorResponse, NO_STORE, unauthorized } from "@/lib/avatar-route";

/**
 * GET /api/v1/avatar: the signed-in student's avatar state (FR-5): profile, GP, level, inventory,
 * and loadout. The first visit with a saved profile grants the starter set.
 * @returns The state, 401 without a user.
 */
export async function GET() {
  const user = await avatarActor();
  if (!user) return unauthorized();
  try {
    return NextResponse.json(await avatarState(user), NO_STORE);
  } catch (error) {
    return avatarErrorResponse(error, "GET /api/v1/avatar");
  }
}
