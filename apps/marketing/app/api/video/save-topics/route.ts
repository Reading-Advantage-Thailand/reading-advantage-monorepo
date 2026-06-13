import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pastTopics } from "@reading-advantage/db/schema";

export async function POST(request: Request) {
  try {
    const { app, topics } = await request.json();

    for (const topic of topics) {
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
