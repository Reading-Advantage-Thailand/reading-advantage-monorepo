import { NextResponse, type NextRequest } from "next/server";
import { db } from "@reading-advantage/db";
import { recordHelpEvent } from "@reading-advantage/domain/primary-help";
import { HELP_VIDEOS } from "@/lib/help/videos";
import { logger } from "@/lib/observability/logger";
import { getCurrentSession } from "@/lib/session";

const VIDEO_IDS = new Set(HELP_VIDEOS.filter((video) => video.enabled).map((video) => video.id));

/**
 * Records one help panel event (track primary_in_app_help_20261023, FR-11). The panel sends it
 * and does not wait for the answer.
 * @param request A same-origin JSON body: an `open` or a `play` of a registry video.
 * @returns 204 when done; 403 for another origin or role; 401 when signed out; 400 for a bad body.
 */
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "ORIGIN_FORBIDDEN" }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { event?: unknown; videoId?: unknown } | null;
  if (body?.event === "play" && !VIDEO_IDS.has(String(body.videoId))) {
    return NextResponse.json({ error: "UNKNOWN_VIDEO" }, { status: 400 });
  }
  try {
    await recordHelpEvent({ db, user: session.user, input: body as never });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if ((error as { code?: string }).code === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if ((error as { name?: string }).name === "ZodError") return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });
    logger.error("help_event_failed", { error });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
