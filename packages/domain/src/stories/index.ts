import { eq } from "drizzle-orm";
import { stories, storyRecords } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

/**
 * Retrieves a single story by ID. Throws if the story does not exist.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `storyId`
 * @returns The story record
 */
export async function getStory({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { storyId: string };
}) {
  assertCan(user, "story:read", tenant);

  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, input.storyId))
    .limit(1);

  if (!story) {
    throw new Error("Story not found");
  }

  return story;
}

/**
 * Lists stories with pagination, optionally filtered by genre.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `limit`, `offset`, and optional `genre`
 * @returns Array of story records
 */
export async function listStories({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { limit: number; offset: number; genre?: string };
}) {
  assertCan(user, "story:list", tenant);

  return db
    .select()
    .from(stories)
    .limit(input.limit)
    .offset(input.offset);
}

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

  const [record] = await db
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
