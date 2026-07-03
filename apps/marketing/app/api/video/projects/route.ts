/**
 * `/api/video/projects` — list persisted video projects for a campaign
 * (GET) and persist a new project with its script JSONB (POST).
 *
 * **Auth policy:** authentication required. Unauthenticated callers receive
 * 401 before any DB read or write.
 *
 * **Tenant/owner policy:** marketing tables are global-internal and are
 * not scoped by `schoolId`. Auth + role floor is the access boundary.
 *
 * @see apps/marketing/app/lib/auth.ts
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { videoProjects } from "@reading-advantage/db/schema";
import { scriptSchema } from "@/lib/script-schema";
import { requireMarketingSession } from "@/lib/auth";

/**
 * GET /api/video/projects?campaignId=... — list projects for a campaign.
 *
 * Guard contract: 401 without a valid session, before any DB read.
 */
export async function GET(request: Request) {
  const guard = await requireMarketingSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaignId");

    if (!campaignId) {
      return NextResponse.json(
        { message: "campaignId query parameter is required" },
        { status: 400 },
      );
    }

    const projects = await db
      .select()
      .from(videoProjects)
      .where(eq(videoProjects.campaignId, campaignId));

    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to list video projects",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/video/projects — persist a new project with its Zod-validated
 * script.
 *
 * Guard contract: 401 without a valid session, before any DB write.
 * Validation contract: 400 before insert when the script shape is invalid.
 */
export async function POST(request: Request) {
  const guard = await requireMarketingSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { campaignId?: unknown }).campaignId !== "string" ||
    typeof (body as { topic?: unknown }).topic !== "string"
  ) {
    return NextResponse.json(
      { message: "Invalid project payload" },
      { status: 400 },
    );
  }

  const payload = body as {
    campaignId: string;
    topic: string;
    script: unknown;
  };

  const validation = scriptSchema.safeParse(payload.script);
  if (!validation.success) {
    return NextResponse.json(
      {
        message: "Invalid script shape",
        error: validation.error.message,
      },
      { status: 400 },
    );
  }

  try {
    const [project] = await db
      .insert(videoProjects)
      .values({
        campaignId: payload.campaignId,
        topic: payload.topic,
        script: validation.data,
      })
      .returning();

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to save video project",
      },
      { status: 500 },
    );
  }
}