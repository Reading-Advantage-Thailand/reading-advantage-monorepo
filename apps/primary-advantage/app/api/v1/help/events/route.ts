import { NextResponse, type NextRequest } from "next/server";
import { consumeRateLimit, createInMemoryRateLimitStore } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { recordHelpEvent } from "@reading-advantage/domain/primary-help";
import { HELP_VIDEOS } from "@/lib/help/videos";
import { logger } from "@/lib/observability/logger";
import { getCurrentSession } from "@/lib/session";

const VIDEO_IDS = new Set(HELP_VIDEOS.filter((video) => video.enabled).map((video) => video.id));
/** At most 30 events a minute for one user on one instance: a loop cannot fill the table. */
const LIMIT = { windowMs: 60_000, maxAttempts: 30 };
const limits = createInMemoryRateLimitStore();

/**
 * Tells whether the request comes from a page of this app. Browsers send `Sec-Fetch-Site`; an
 * older browser is checked by the Origin host against the forwarded host (Cloud Run puts the public
 * host there, so `request.nextUrl` is not used).
 * @param request The request.
 * @returns True for a same-origin request.
 */
function sameOrigin(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return Boolean(origin && host && new URL(origin).host === host);
  } catch {
    return false;
  }
}

/**
 * Records one help panel event (track primary_in_app_help_20261023, FR-11). The panel sends it
 * and does not wait for the answer.
 * @param request A same-origin JSON body: an `open` or a `play` of a registry video.
 * @returns 204 when done; 403 for another origin or role; 401 when signed out; 400 for a bad body;
 * 429 after 30 events in a minute.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "ORIGIN_FORBIDDEN" }, { status: 403 });
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!(await consumeRateLimit(limits, `help-event:${session.user.id}`, LIMIT)).allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
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
