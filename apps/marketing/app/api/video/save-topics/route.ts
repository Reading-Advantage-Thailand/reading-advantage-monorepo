import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pastTopics } from "@reading-advantage/db/schema";
import { eq } from "drizzle-orm";
import { deduplicateTopics } from "@/lib/topic-dedup";

export async function POST(request: Request) {
  try {
    const { app, topics } = await request.json();

    const existingRows = await db
      .select()
      .from(pastTopics)
      .where(eq(pastTopics.app, app));
    const existingTopics = existingRows.map((row) => row.topic);

    const uniqueTopics = deduplicateTopics(topics, existingTopics);

    for (const topic of uniqueTopics) {
      await db.insert(pastTopics).values({
        app,
        topic,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to save topics" },
      { status: 500 }
    );
  }
}
