import { and, asc, count, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { stories } from "@reading-advantage/db/schema";
import {
  STORIES_PAGE_SIZE,
  listPrimaryStoriesInputSchema,
  listPrimaryStoriesOutputSchema,
  type ListPrimaryStoriesInput,
  type ListPrimaryStoriesOutput,
} from "./contracts.js";

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

/** Roles that see every published story (no level window). */
const STAFF_ROLES = new Set(["TEACHER", "ADMIN", "SYSTEM"]);

/**
 * Lists the published stories for the Stories tab. A student sees the level window
 * (`user.level` +/- 1, at level 1 or higher); staff see every published story.
 * The genre input and the title or topic search narrow the list; each page holds 10 stories.
 *
 * @param db - Database client
 * @param user - Authenticated user context (its level sets the student window)
 * @param tenant - Tenant (school) scope
 * @param input - Optional `genre` and `search`, and `page` (from 1)
 * @returns The story cards of the page, the match count, the page numbers, and the genres in the window
 * @throws When the input is invalid or the user lacks `story:list`
 */
export async function listPrimaryStories({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: ListPrimaryStoriesInput;
}): Promise<ListPrimaryStoriesOutput> {
  assertCan(user, "story:list", tenant);
  const { genre, search, page } = listPrimaryStoriesInputSchema.parse(input);

  const windowRules: SQL[] = [eq(stories.isPublic, true)];
  if (!STAFF_ROLES.has(user.role)) {
    windowRules.push(gte(stories.raLevel, Math.max(user.level - 1, 1)), lte(stories.raLevel, user.level + 1));
  }

  const rules = [...windowRules];
  if (genre) rules.push(eq(stories.genre, genre));
  if (search) {
    const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    rules.push(or(ilike(stories.title, pattern), ilike(stories.subgenre, pattern))!);
  }

  const rawDb = db.unscoped("stories is a global content catalog with no schoolId");
  const [rows, [counted], genreRows] = await Promise.all([
    rawDb
      .select({
        id: stories.id,
        title: stories.title,
        genre: stories.genre,
        raLevel: stories.raLevel,
        cefrLevel: stories.cefrLevel,
        image: stories.image,
      })
      .from(stories)
      .where(and(...rules))
      .orderBy(asc(stories.raLevel), asc(stories.title))
      .limit(STORIES_PAGE_SIZE)
      .offset((page - 1) * STORIES_PAGE_SIZE),
    rawDb.select({ total: count() }).from(stories).where(and(...rules)),
    rawDb.select({ genre: stories.genre }).from(stories).where(and(...windowRules)).groupBy(stories.genre).orderBy(asc(stories.genre)),
  ]);

  return listPrimaryStoriesOutputSchema.parse({
    stories: rows.map(({ image, ...card }) => ({ ...card, imageKey: image?.trim() || card.id })),
    total: counted?.total ?? 0,
    page,
    pageSize: STORIES_PAGE_SIZE,
    genres: genreRows.map((g) => g.genre).filter((g): g is string => Boolean(g)),
  });
}
