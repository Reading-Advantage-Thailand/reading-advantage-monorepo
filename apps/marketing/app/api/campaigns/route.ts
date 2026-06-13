import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns } from "@reading-advantage/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allCampaigns = await db
      .select()
      .from(campaigns)
      .orderBy(desc(campaigns.createdAt));
    return NextResponse.json(allCampaigns);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const [campaign] = await db
      .insert(campaigns)
      .values({
        type: body.type,
        app: body.app,
        name: body.name,
      })
      .returning();
    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
