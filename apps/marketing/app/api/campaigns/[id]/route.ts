import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns } from "@reading-advantage/db/schema";
import { eq } from "drizzle-orm";
import {
  type CampaignStatus,
  isValidCampaignStatusTransition,
} from "@/lib/campaign-status";

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
    const nextStatus = body.status as CampaignStatus;

    const [existing] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, params.id));

    if (!existing) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 }
      );
    }

    if (!isValidCampaignStatusTransition(existing.status, nextStatus)) {
      return NextResponse.json(
        {
          message: `Invalid status transition: cannot transition from ${existing.status} to ${nextStatus}`,
        },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(campaigns)
      .set({
        status: nextStatus,
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
