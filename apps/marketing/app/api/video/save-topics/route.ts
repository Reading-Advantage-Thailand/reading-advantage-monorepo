/**
 * `/api/video/save-topics` — persist approved topic research to the
 * `past_topics` table.
 *
 * **Auth policy:** authentication required. Unauthenticated callers receive
 * 401 before any DB read or insert. Authenticated callers proceed.
 *
 * **Tenant/owner policy:** marketing tables are global-internal and are
 * not scoped by `schoolId`. Auth + role floor is the access boundary.
 *
 * @see apps/marketing/app/lib/auth.ts
 * @see apps/marketing/app/lib/topic-schema.ts
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pastTopics } from "@reading-advantage/db/schema";
import { eq } from "drizzle-orm";
import { deduplicateTopics } from "@/lib/topic-dedup";
import { requireMarketingPermission } from "@/lib/auth";
import { saveTopicsSchema } from "@/lib/topic-schema";

/**
 * POST /api/video/save-topics — dedup-merge the supplied topics against
 * existing rows for the same app and insert the unique ones.
 *
 * Guard contract: 401 without a valid session, before any DB read or
 * write. Validation contract: 400 with a structured Zod error before any
 * persistence.
 */
export async function POST(request: Request) {
  const guard = await requireMarketingPermission(request, "video:topics:save");
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

  const parsed = saveTopicsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid topics payload",
        error: parsed.error.message,
      },
      { status: 400 },
    );
  }

  try {
    const { app, topics } = parsed.data;

    // The Zod schema narrows `app` to one of the marketing app enum
    // literals, but Drizzle's typed `eq()` overload still requires an
    // explicit cast because the inferred TS type of the schema field is
    // `z.enum([...])` (a string-literal union). Cast for the Drizzle query
    // — the runtime value is already validated.
    const appEnum = app as
      | "reading-advantage"
      | "primary-advantage"
      | "storytime"
      | "math-advantage"
      | "science-advantage"
      | "stem-advantage"
      | "zhongwen-advantage"
      | "tutor-advantage";

    const existingRows = await db
      .select()
      .from(pastTopics)
      .where(eq(pastTopics.app, appEnum));
    const existingTopics = existingRows.map((row) => row.topic);

    const uniqueTopics = deduplicateTopics(topics, existingTopics);

    for (const topic of uniqueTopics) {
      await db.insert(pastTopics).values({
        app: appEnum,
        topic,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to save topics" },
      { status: 500 },
    );
  }
}