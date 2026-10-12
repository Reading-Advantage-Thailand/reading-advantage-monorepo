import { and, asc, count, eq, gte, ilike, inArray, like, lte, or, type SQL } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { chapters, longAnswerQuestions, multipleChoiceQuestions, sentencsAndWordsForFlashcards, shortAnswerQuestions, stories, userActivity } from "@reading-advantage/db/schema";
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
  getChapterForStudentInputSchema,
  getChapterForStudentOutputSchema,
  type GetChapterForStudentInput,
  type GetChapterForStudentOutput,
  STORY_ACTIVITY_TYPES,
  STORY_MCQ_PER_QUIZ,
  getChapterQuestionsInputSchema,
  getChapterQuestionsOutputSchema,
  getChapterWrittenQuestionInputSchema,
  getChapterWrittenQuestionOutputSchema,
  type GetChapterQuestionsInput,
  type GetChapterQuestionsOutput,
  type GetChapterWrittenQuestionInput,
  type GetChapterWrittenQuestionOutput,
} from "./contracts.js";
import { ChapterNotFoundError, StoryError, StoryNotFoundError } from "./errors.js";

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

/**
 * Loads one chapter for the chapter page: the chapter text with its sentence timings and
 * translations, the audio key, the picture key, the word list (the chapter row of
 * `sentencs_and_words_for_flashcard`), and the previous and next chapter numbers. A student sees
 * a chapter only when its story is published and in the level window (`user.level` +/- 1);
 * staff see every published story.
 *
 * @param db - Database client
 * @param user - Authenticated user context (its level sets the student window)
 * @param tenant - Tenant (school) scope
 * @param input - The `storyId` (a UUID) and the `chapterNumber` (from 1)
 * @returns The story, the chapter, the word list, and the neighbour chapter numbers
 * @throws StoryNotFoundError when no published story in the window has this id
 * @throws ChapterNotFoundError when the story has no chapter with this number
 * @throws When the input is invalid or the user lacks `story:read`
 */
export async function getChapterForStudent({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: GetChapterForStudentInput;
}): Promise<GetChapterForStudentOutput> {
  assertCan(user, "story:read", tenant);
  const { storyId, chapterNumber } = getChapterForStudentInputSchema.parse(input);

  const rules: SQL[] = [eq(stories.id, storyId), eq(stories.isPublic, true)];
  if (!STAFF_ROLES.has(user.role)) {
    rules.push(gte(stories.raLevel, Math.max(user.level - 1, 1)), lte(stories.raLevel, user.level + 1));
  }

  const rawDb = db.unscoped("stories and chapters are a global content catalog with no schoolId");
  const [story] = await rawDb
    .select({ id: stories.id, title: stories.title })
    .from(stories)
    .where(and(...rules))
    .limit(1);
  if (!story) throw new StoryNotFoundError(storyId);

  const [chapter] = await rawDb
    .select({
      id: chapters.id,
      chapterNumber: chapters.chapterNumber,
      title: chapters.title,
      passage: chapters.passage,
      sentences: chapters.sentences,
      translatedPassage: chapters.translatedPassage,
      audioUrl: chapters.audioUrl,
      image: chapters.image,
    })
    .from(chapters)
    .where(and(eq(chapters.storyId, storyId), eq(chapters.chapterNumber, chapterNumber)))
    .limit(1);
  if (!chapter) throw new ChapterNotFoundError(storyId, chapterNumber);

  const [numbers, [wordRow]] = await Promise.all([
    rawDb
      .select({ chapterNumber: chapters.chapterNumber })
      .from(chapters)
      .where(eq(chapters.storyId, storyId))
      .orderBy(asc(chapters.chapterNumber)),
    rawDb
      .select({ words: sentencsAndWordsForFlashcards.words, wordsUrl: sentencsAndWordsForFlashcards.wordsUrl })
      .from(sentencsAndWordsForFlashcards)
      .where(eq(sentencsAndWordsForFlashcards.chapterId, chapter.id))
      .limit(1),
  ]);
  const before = numbers.map((n) => n.chapterNumber).filter((n) => n < chapterNumber);
  const after = numbers.map((n) => n.chapterNumber).filter((n) => n > chapterNumber);

  const { audioUrl, image, ...rest } = chapter;
  return getChapterForStudentOutputSchema.parse({
    story,
    chapter: { ...rest, passage: rest.passage ?? "", audioKey: audioUrl?.trim() || null, imageKey: image?.trim() || chapter.id },
    words: { words: Array.isArray(wordRow?.words) ? wordRow.words : [], wordsUrl: wordRow?.wordsUrl ?? "" },
    previousChapterNumber: before.length ? Math.max(...before) : null,
    nextChapterNumber: after.length ? Math.min(...after) : null,
  });
}

/**
 * Loads the rules that keep a student inside the level window (`user.level` +/- 1).
 * Staff see every published story.
 *
 * @param user - Authenticated user context (its level sets the student window)
 * @returns The extra story conditions for the window
 */
function storyWindowRules(user: UserContext): SQL[] {
  if (STAFF_ROLES.has(user.role)) return [];
  return [gte(stories.raLevel, Math.max(user.level - 1, 1)), lte(stories.raLevel, user.level + 1)];
}

/**
 * Checks that a chapter is visible: its story is published and, for a student, in the level
 * window. Chapter question rows keep a NULL `article_id` (spec D6); they are read by `chapter_id`.
 *
 * @param db - Database client
 * @param user - Authenticated user context (its level sets the student window)
 * @param chapterId - The chapter id (a UUID)
 * @returns The chapter id when visible
 * @throws ChapterNotFoundError when no visible chapter has this id
 */
export async function requireVisibleChapter(db: TenantDB, user: UserContext, chapterId: string): Promise<string> {
  const rawDb = db.unscoped("stories and chapters are a global content catalog with no schoolId");
  const [row] = await rawDb
    .select({ id: chapters.id })
    .from(chapters)
    .innerJoin(stories, eq(chapters.storyId, stories.id))
    .where(and(eq(chapters.id, chapterId), eq(stories.isPublic, true), ...storyWindowRules(user)))
    .limit(1);
  if (!row) throw new ChapterNotFoundError(chapterId);
  return row.id;
}

/**
 * Picks up to 5 random MCQ without answers, in quiz order.
 *
 * @param bank - The chapter MCQ bank (each with id, question, and options)
 * @returns The quiz questions with no answer, index, or evidence text
 */
export function pickChapterMcq(bank: { id: string; question: string; options: unknown }[]): { id: string; question: string; options: string[] }[] {
  return bank
    .map((q) => ({ q, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, STORY_MCQ_PER_QUIZ)
    .map(({ q }) => ({ id: q.id, question: q.question, options: Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === "string") : [] }));
}

/**
 * Loads one chapter quiz for the client: up to 5 random MCQ without answers, one SAQ, one LAQ,
 * and what the user finished (`STORIES_*` activity rows with the chapter id as target).
 *
 * @param db - Database client
 * @param user - Authenticated user context (its level sets the student window)
 * @param tenant - Tenant (school) scope
 * @param input - The `chapterId` (a UUID)
 * @returns The quiz questions, the finished kinds, and the last MCQ score
 * @throws ChapterNotFoundError when the chapter is not visible
 * @throws When the input is invalid or the user lacks `story:read`
 */
export async function getChapterQuestions({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: GetChapterQuestionsInput;
}): Promise<GetChapterQuestionsOutput> {
  assertCan(user, "story:read", tenant);
  const { chapterId } = getChapterQuestionsInputSchema.parse(input);
  await requireVisibleChapter(db, user, chapterId);

  const rawDb = db.unscoped("stories and chapters are a global content catalog with no schoolId");
  const [mcBank, [saq], [laq], activity] = await Promise.all([
    rawDb
      .select({ id: multipleChoiceQuestions.id, question: multipleChoiceQuestions.question, options: multipleChoiceQuestions.options })
      .from(multipleChoiceQuestions)
      .where(eq(multipleChoiceQuestions.chapterId, chapterId))
      .orderBy(asc(multipleChoiceQuestions.order)),
    rawDb
      .select({ id: shortAnswerQuestions.id, question: shortAnswerQuestions.question })
      .from(shortAnswerQuestions)
      .where(eq(shortAnswerQuestions.chapterId, chapterId))
      .orderBy(asc(shortAnswerQuestions.order))
      .limit(1),
    rawDb
      .select({ id: longAnswerQuestions.id, question: longAnswerQuestions.question })
      .from(longAnswerQuestions)
      .where(eq(longAnswerQuestions.chapterId, chapterId))
      .limit(1),
    rawDb
      .select({ activityType: userActivity.activityType, details: userActivity.details })
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, user.id),
          eq(userActivity.targetId, chapterId),
          inArray(userActivity.activityType, [STORY_ACTIVITY_TYPES.mc, STORY_ACTIVITY_TYPES.sa, STORY_ACTIVITY_TYPES.la]),
        ),
      ),
  ]);

  const byType = new Map(activity.map((a) => [a.activityType, a]));
  const mcRow = byType.get(STORY_ACTIVITY_TYPES.mc);
  const mcDetails = mcRow?.details as { score?: unknown } | null;
  const mcScore = typeof mcDetails?.score === "number" && Number.isInteger(mcDetails.score) ? mcDetails.score : null;

  return getChapterQuestionsOutputSchema.parse({
    chapterId,
    mcq: pickChapterMcq(mcBank),
    saq: saq ?? null,
    laq: laq ?? null,
    done: {
      mc: byType.has(STORY_ACTIVITY_TYPES.mc),
      sa: byType.has(STORY_ACTIVITY_TYPES.sa),
      la: byType.has(STORY_ACTIVITY_TYPES.la),
    },
    mcScore,
  });
}

/**
 * Loads one written question with its sample answer for the server feedback call
 * (`getSaqFeedback` and `getLaqFeedback` read the chapter passage for a chapter source).
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - The `chapterId`, the kind (`sa` or `la`), and the `questionId`
 * @returns The question text and the sample answer (null for LAQ)
 * @throws ChapterNotFoundError when the chapter is not visible
 * @throws StoryError when the question is not in the chapter
 * @throws When the input is invalid or the user is not a student
 */
export async function getChapterWrittenQuestion({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: GetChapterWrittenQuestionInput;
}): Promise<GetChapterWrittenQuestionOutput> {
  assertCan(user, "progress:record", tenant);
  const { chapterId, kind, questionId } = getChapterWrittenQuestionInputSchema.parse(input);
  await requireVisibleChapter(db, user, chapterId);

  const rawDb = db.unscoped("stories and chapters are a global content catalog with no schoolId");
  if (kind === "sa") {
    const [row] = await rawDb
      .select({ question: shortAnswerQuestions.question, sampleAnswer: shortAnswerQuestions.sampleAnswer })
      .from(shortAnswerQuestions)
      .where(and(eq(shortAnswerQuestions.id, questionId), eq(shortAnswerQuestions.chapterId, chapterId)))
      .limit(1);
    if (!row) throw new StoryError(`Chapter question not found: ${questionId}`);
    return getChapterWrittenQuestionOutputSchema.parse({ question: row.question, suggestedAnswer: row.sampleAnswer });
  }
  const [row] = await rawDb
    .select({ question: longAnswerQuestions.question })
    .from(longAnswerQuestions)
    .where(and(eq(longAnswerQuestions.id, questionId), eq(longAnswerQuestions.chapterId, chapterId)))
    .limit(1);
  if (!row) throw new StoryError(`Chapter question not found: ${questionId}`);
  return getChapterWrittenQuestionOutputSchema.parse({ question: row.question, suggestedAnswer: null });
}
