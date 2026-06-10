import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { storyRecords } from "@reading-advantage/db/schema";

/**
 * Records a story read event for the current user. Sets status to "READ" by default.
 * Used to track reading progress and completion.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `storyId`; optional `status`, `title`, and `level`
 * @returns The newly created story record
 */
export async function recordStoryRead({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { storyId: string; status?: string; title?: string; level?: number };
}) {
  assertCan(user, "progress:record", tenant);

  const rawDb = db.unscoped("storyRecords has no schoolId column");

  const [record] = await rawDb
    .insert(storyRecords)
    .values({
      userId: user.id,
      storyId: input.storyId,
      status: input.status ?? "READ",
      title: input.title,
      level: input.level,
    })
    .returning();

  return record;
}
