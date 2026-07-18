/**
 * `/api/campaigns/[id]` — read a single campaign (GET) and update its
 * status (PATCH).
 *
 * **Auth policy:** authentication required. Unauthenticated callers receive
 * 401 before any DB read or write.
 *
 * **Tenant/owner policy — global-internal, not scoped by schoolId:**
 * marketing is an internal staff tool, accessed by authenticated staff.
 * The `campaigns` table is classified REFERENTIAL in
 * `packages/domain/src/tenant-registry.ts` and has no `schoolId` or
 * `ownerId` column today, so per-row scoping is not enforceable at the
 * data layer. Access is gated by authentication + role floor
 * (`[NEEDS-PO]` for the exact floor). Per-row scoping may be added in a
 * follow-up cycle if owner columns land on the schema. Today this route
 * is global-internal: any authenticated staff user may read and patch
 * campaigns; the data is not scoped by schoolId.
 *
 * @see apps/marketing/app/lib/auth.ts
 * @see apps/marketing/app/lib/campaign-schema.ts
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns } from "@reading-advantage/db/schema";
import { eq } from "drizzle-orm";
import {
  type CampaignStatus,
  isValidCampaignStatusTransition,
} from "@/lib/campaign-status";
import { requireMarketingPermission } from "@/lib/auth";
import { updateCampaignSchema } from "@/lib/campaign-schema";

/**
 * GET /api/campaigns/[id] — fetch a single campaign by id.
 *
 * Guard contract: 401 without a valid session, before any DB read.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireMarketingPermission(request, "campaign:read");
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, params.id));

    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load campaign" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/campaigns/[id] — update a campaign's status, enforcing the
 * status-transition state machine.
 *
 * Guard contract: 401 without a valid session, before any DB write.
 * Validation contract: 400 with a structured Zod error BEFORE the
 * status-transition machine runs (so invalid statuses are rejected even
 * if the campaign would otherwise accept the transition).
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireMarketingPermission(request, "campaign:update");
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

  const parsed = updateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid campaign update payload",
        error: parsed.error.message,
      },
      { status: 400 },
    );
  }

  try {
    const nextStatus = parsed.data.status as CampaignStatus;

    const [existing] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, params.id));

    if (!existing) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 },
      );
    }

    if (!isValidCampaignStatusTransition(existing.status, nextStatus)) {
      return NextResponse.json(
        {
          message: `Invalid status transition: cannot transition from ${existing.status} to ${nextStatus}`,
        },
        { status: 400 },
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
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to update campaign" },
      { status: 500 },
    );
  }
}