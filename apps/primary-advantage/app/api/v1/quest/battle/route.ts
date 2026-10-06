import { NextResponse } from "next/server";
import { battleState } from "@/server/controllers/questController";
import { avatarActor, avatarErrorResponse, NO_STORE, unauthorized } from "@/lib/avatar-route";

/**
 * GET /api/v1/quest/battle: the signed-in student's battle state (FR-9), polled by the phone.
 * @returns The state, or `{ state: null }` without a quest; 401 or 403 with the reason.
 */
export async function GET() {
  const user = await avatarActor();
  if (!user) return unauthorized();
  try {
    return NextResponse.json({ state: await battleState(user) }, NO_STORE);
  } catch (error) {
    return avatarErrorResponse(error, "GET /api/v1/quest/battle");
  }
}
