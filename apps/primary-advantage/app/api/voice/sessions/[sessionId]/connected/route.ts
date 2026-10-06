import { NextRequest, NextResponse } from "next/server";
import { voiceConnected } from "@/server/controllers/voiceController";
import { voiceActor, voiceErrorResponse } from "@/lib/voice-route";

/**
 * POST /api/voice/sessions/[sessionId]/connected: the browser connected, the clock starts (FR-3).
 * @param _request The request.
 * @param context The route params with the session id.
 * @returns When the session ends; 401, 403, or 404.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const actor = await voiceActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sessionId } = await params;
  try {
    return NextResponse.json(await voiceConnected(actor.user, sessionId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return voiceErrorResponse(error, "POST /api/voice/sessions/[sessionId]/connected");
  }
}
