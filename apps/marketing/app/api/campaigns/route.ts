/**
 * `/api/campaigns` — list campaigns (GET) and create a campaign (POST).
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
 * is global-internal: any authenticated staff user may read and create
 * campaigns; the data is not scoped by schoolId.
 *
 * @see apps/marketing/app/lib/auth.ts
 * @see apps/marketing/app/lib/campaign-schema.ts
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns } from "@reading-advantage/db/schema";
import { desc } from "drizzle-orm";
import { requireMarketingPermission } from "@/lib/auth";
import { createCampaignSchema } from "@/lib/campaign-schema";

/**
 * GET /api/campaigns — list campaigns ordered by `createdAt` desc.
 *
 * Guard contract: 401 without a valid session, before any DB read.
 */
export async function GET(request: Request) {
  const guard = await requireMarketingPermission(request, "campaign:list");
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const allCampaigns = await db
      .select()
      .from(campaigns)
      .orderBy(desc(campaigns.createdAt));
    return NextResponse.json(allCampaigns);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load campaigns" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/campaigns — create a campaign.
 *
 * Guard contract: 401 without a valid session, before any DB write.
 * Validation contract: 400 with a structured Zod error before insert
 * (type/app/name must be present and the type/app must be valid enum
 * values from `packages/db/src/schema/marketing.ts`).
 */
export async function POST(request: Request) {
  const guard = await requireMarketingPermission(request, "campaign:create");
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

  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid campaign payload",
        error: parsed.error.message,
      },
      { status: 400 },
    );
  }

  try {
    const [campaign] = await db
      .insert(campaigns)
      .values({
        type: parsed.data.type as "video" | "infocard",
        app: parsed.data.app as
          | "reading-advantage"
          | "primary-advantage"
          | "storytime"
          | "math-advantage"
          | "science-advantage"
          | "stem-advantage"
          | "zhongwen-advantage"
          | "tutor-advantage",
        name: parsed.data.name,
      })
      .returning();
    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create campaign" },
      { status: 500 },
    );
  }
}