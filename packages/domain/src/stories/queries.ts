import { and, asc, count, eq, gte, ilike, inArray, like, lte, or, type SQL } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { chapters, stories, userActivity } from "@reading-advantage/db/schema";
import {
  STORIES_PAGE_SIZE,
  listPrimaryStoriesInputSchema,
  listPrimaryStoriesOutputSchema,
  type ListPrimaryStoriesInput,
  type ListPrimaryStoriesOutput,
  getStoryForStudentInputSchema,
  getStoryForStudentOutputSchema,
  storyCharacterSchema,
  type GetStoryForStudentInput,
  type GetStoryForStudentOutput,
} from "./contracts.js";
import { StoryNotFoundError } from "./errors.js";

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

/**
 * Loads one published story for the story page: the story, its chapters in order, the chapters
 * that the user finished (`STORIES_*` activity rows with the chapter id as target), and the
 * characters of the story bible. A student sees only the level window (`user.level` +/- 1);
 * staff see every published story.
 *
 * @param db - Database client
 * @param user - Authenticated user context (its level sets the student window)
 * @param tenant - Tenant (school) scope
 * @param input - The `storyId` (a UUID)
 * @returns The story, the chapters, the finished chapter ids, and the characters
 * @throws StoryNotFoundError when no published story in the window has this id
 * @throws When the input is invalid or the user lacks `story:read`
 */
export async function getStoryForStudent({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: GetStoryForStudentInput;
}): Promise<GetStoryForStudentOutput> {
  assertCan(user, "story:read", tenant);
  const { storyId } = getStoryForStudentInputSchema.parse(input);

  const rules: SQL[] = [eq(stories.id, storyId), eq(stories.isPublic, true)];
  if (!STAFF_ROLES.has(user.role)) {
    rules.push(gte(stories.raLevel, Math.max(user.level - 1, 1)), lte(stories.raLevel, user.level + 1));
  }

  const rawDb = db.unscoped("stories and chapters are a global content catalog with no schoolId");
  const [story] = await rawDb
    .select({
      id: stories.id,
      title: stories.title,
      summary: stories.summary,
      translatedSummary: stories.translatedSummary,
      genre: stories.genre,
      raLevel: stories.raLevel,
      cefrLevel: stories.cefrLevel,
      image: stories.image,
      storyBible: stories.storyBible,
    })
    .from(stories)
    .where(and(...rules))
    .limit(1);
  if (!story) throw new StoryNotFoundError(storyId);

  const chapterRows = await rawDb
    .select({
      id: chapters.id,
      chapterNumber: chapters.chapterNumber,
      title: chapters.title,
      summary: chapters.summary,
      translatedSummary: chapters.translatedSummary,
    })
    .from(chapters)
    .where(eq(chapters.storyId, storyId))
    .orderBy(asc(chapters.chapterNumber));

  const done = chapterRows.length
    ? await rawDb
        .select({ targetId: userActivity.targetId })
        .from(userActivity)
        .where(
          and(
            eq(userActivity.userId, user.id),
            like(userActivity.activityType, "STORIES_%"),
            inArray(userActivity.targetId, chapterRows.map((c) => c.id)),
          ),
        )
    : [];

  const { image, storyBible, ...card } = story;
  const characters = (Array.isArray(storyBible) ? storyBible : []).flatMap((c) => {
    const parsed = storyCharacterSchema.safeParse(c);
    return parsed.success ? [parsed.data] : [];
  });

  return getStoryForStudentOutputSchema.parse({
    story: { ...card, imageKey: image?.trim() || card.id },
    chapters: chapterRows,
    finishedChapterIds: [...new Set(done.map((d) => d.targetId).filter((t): t is string => Boolean(t)))],
    characters,
  });
}
