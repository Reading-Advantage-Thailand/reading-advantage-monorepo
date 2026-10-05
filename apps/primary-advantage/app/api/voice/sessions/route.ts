import { NextRequest, NextResponse } from "next/server";
import { startVoice, studentVoiceSessions } from "@/server/controllers/voiceController";
import { voiceActor, voiceErrorResponse } from "@/lib/voice-route";

/**
 * GET /api/voice/sessions: the student's finished sessions, newest first.
 * @returns The records, 401 without a user.
 */
export async function GET() {
  const actor = await voiceActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ sessions: await studentVoiceSessions(actor.user) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return voiceErrorResponse(error, "GET /api/voice/sessions");
  }
}

/**
 * POST /api/voice/sessions: starts a session with `{ articleId, sdp }` (FR-2, FR-3).
 * @param request The request with the JSON body.
 * @returns The answer and the reservation; 401, 403, 409, or 503 with the reason.
 */
export async function POST(request: NextRequest) {
  const actor = await voiceActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json().catch(() => ({}))) as { articleId?: string | null; sdp?: string };
    const result = await startVoice(actor.user, actor.authStrength, { articleId: body.articleId ?? null, sdp: String(body.sdp ?? "") });
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return voiceErrorResponse(error, "POST /api/voice/sessions");
  }
}
