import { eq } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { stories } from "@reading-advantage/db/schema";

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

  const rawDb = db.unscoped("stories is a global content catalog with no schoolId");

  const [story] = await rawDb
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

  return db.unscoped("stories is a global content catalog with no schoolId")
    .select()
    .from(stories)
    .limit(input.limit)
    .offset(input.offset);
}
