/**
 * `/api/video/save-topics` persists approved topic research using an
 * app-scoped normalized uniqueness key.
 *
 * Authentication and named Marketing permission checks run before the
 * transaction. One conflict-safe batch insert prevents concurrent requests
 * from creating normalized duplicates.
 */
import { db } from "@/lib/db";
import { pastTopics } from "@reading-advantage/db/schema";
import { deduplicateTopics, normalizeTopic } from "@/lib/topic-dedup";
import { requireMarketingPermission } from "@/lib/auth";
import { saveTopicsSchema } from "@/lib/topic-schema";
import type { MarketingApp } from "@/lib/apps";
import { noStoreJson, withNoStore } from "@/lib/response";

/**
 * Persists approved topics in one conflict-safe transaction.
 * @param request The authenticated request carrying app and topic values.
 * @returns A JSON response with the number of newly inserted normalized topics.
 */
export async function POST(request: Request) {
  const guard = await requireMarketingPermission(request, "video:topics:save");
  if (!guard.ok) {
    return withNoStore(guard.response);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = saveTopicsSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson(
      {
        message: "Invalid topics payload",
        error: parsed.error.message,
      },
      { status: 400 },
    );
  }

  try {
    const { app, topics } = parsed.data;
    const appEnum = app as MarketingApp;

    const values = deduplicateTopics(topics, []).map((topic) => ({
      app: appEnum,
      topic,
      normalizedKey: normalizeTopic(topic),
      createdBy: guard.session.user.id,
    }));

    const inserted = await db.transaction(async (transaction) => {
      return transaction
        .insert(pastTopics)
        .values(values)
        .onConflictDoNothing({
          target: [pastTopics.app, pastTopics.normalizedKey],
        })
        .returning({ normalizedKey: pastTopics.normalizedKey });
    });

    return noStoreJson({
      success: true,
      insertedCount: inserted.length,
    });
  } catch {
    return noStoreJson(
      { message: "Failed to save topics" },
      { status: 500 },
    );
  }
}
