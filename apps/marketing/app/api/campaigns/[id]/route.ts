import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns } from "@reading-advantage/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, params.id));

    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load campaign" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const [updated] = await db
      .update(campaigns)
      .set({
        status: body.status,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to update campaign" },
      { status: 500 }
    );
  }
}
