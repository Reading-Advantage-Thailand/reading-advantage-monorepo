import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { videoProjects } from "@reading-advantage/db/schema";
import { scriptSchema } from "@/lib/script-schema";

export async function GET(request: Request) {
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      campaignId: string;
      topic: string;
      script: unknown;
    };

    const validation = scriptSchema.safeParse(body.script);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid script shape",
          error: validation.error.message,
        },
        { status: 400 },
      );
    }

    const [project] = await db
      .insert(videoProjects)
      .values({
        campaignId: body.campaignId,
        topic: body.topic,
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
