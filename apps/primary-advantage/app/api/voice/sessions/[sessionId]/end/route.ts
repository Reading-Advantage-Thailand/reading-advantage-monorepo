import { NextRequest, NextResponse } from "next/server";
import { endVoice } from "@/server/controllers/voiceController";
import { voiceActor, voiceErrorResponse } from "@/lib/voice-route";

/**
 * POST /api/voice/sessions/[sessionId]/end: ends the session with `{ reason }` and returns the
 * summary (FR-12). A page close may send this with `keepalive`.
 * @param request The request with the optional JSON body.
 * @param context The route params with the session id.
 * @returns The finished session; 401, 403, or 404.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const actor = await voiceActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sessionId } = await params;
  try {
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    return NextResponse.json(await endVoice(actor.user, sessionId, body.reason), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return voiceErrorResponse(error, "POST /api/voice/sessions/[sessionId]/end");
  }
}
