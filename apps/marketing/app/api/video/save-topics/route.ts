import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pastTopics } from "@reading-advantage/db/schema";
import { deduplicateTopics } from "@/lib/topic-dedup";

export async function POST(request: Request) {
  try {
    const { app, topics } = await request.json();

    const uniqueTopics = deduplicateTopics(topics, []);

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
