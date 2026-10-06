import { NextResponse } from "next/server";
import { voiceEntitlement } from "@/server/controllers/voiceController";
import { voiceActor, voiceErrorResponse } from "@/lib/voice-route";

/**
 * GET /api/voice/entitlement: the student's Reedy minutes this month and why a session cannot
 * start (FR-1 to FR-6, FR-9).
 * @returns The entitlement, 401 without a user.
 */
export async function GET() {
  const actor = await voiceActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await voiceEntitlement(actor.user, actor.authStrength), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return voiceErrorResponse(error, "GET /api/voice/entitlement");
  }
}
