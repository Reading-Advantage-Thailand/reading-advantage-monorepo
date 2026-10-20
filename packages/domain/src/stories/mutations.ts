import { and, asc, eq } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { longAnswerQuestions, multipleChoiceQuestions, shortAnswerQuestions, storyRecords, userActivity } from "@reading-advantage/db/schema";
import {
  STORY_ACTIVITY_TYPES,
  STORY_LA_MAX_XP,
  STORY_MCQ_PER_QUIZ,
  STORY_SA_MAX_XP,
  STORY_XP_PER_CORRECT_MC,
  gradeChapterMcqInputSchema,
  gradeChapterMcqOutputSchema,
  retakeChapterMcqInputSchema,
  retakeChapterMcqOutputSchema,
  resolveChapterWrittenInputSchema,
  resolveChapterWrittenOutputSchema,
  storyLaMinChars,
  type GradeChapterMcqInput,
  type GradeChapterMcqOutput,
  type RetakeChapterMcqInput,
  type RetakeChapterMcqOutput,
  type ResolveChapterWrittenInput,
  type ResolveChapterWrittenOutput,
} from "./contracts.js";
import { StoryError } from "./errors.js";
import { pickChapterMcq, requireVisibleChapter } from "./queries.js";

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

/**
 * Grades one chapter MCQ submit on the server: 2 XP for each correct answer of the 5 shown.
 * The answers never leave the client rule: the bank stays server-side and only the grade,
 * the award, and the per-question results (with the correct text and the evidence) return.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - The `chapterId` and the answer text for each question shown
 * @returns The score, the total, the XP award, and the per-question results
 * @throws ChapterNotFoundError when the chapter is not visible
 * @throws StoryError when an answer names an unknown or repeated question, or has the wrong count
 * @throws When the input is invalid or the user is not a student
 */
export async function gradeChapterMcq({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: GradeChapterMcqInput;
}): Promise<GradeChapterMcqOutput> {
  assertCan(user, "progress:record", tenant);
  const { chapterId, answers } = gradeChapterMcqInputSchema.parse(input);
  await requireVisibleChapter(db, user, chapterId);

  const rawDb = db.unscoped("stories and chapters are a global content catalog with no schoolId");
  const bank = await rawDb
    .select({
      id: multipleChoiceQuestions.id,
      question: multipleChoiceQuestions.question,
      options: multipleChoiceQuestions.options,
      correctAnswer: multipleChoiceQuestions.correctAnswer,
      textualEvidence: multipleChoiceQuestions.textualEvidence,
    })
    .from(multipleChoiceQuestions)
    .where(eq(multipleChoiceQuestions.chapterId, chapterId))
    .orderBy(asc(multipleChoiceQuestions.order));

  const expected = Math.min(STORY_MCQ_PER_QUIZ, bank.length);
  if (answers.length !== expected) {
    throw new StoryError(`Chapter quiz needs ${expected} answers, got ${answers.length}`);
  }
  const byId = new Map(bank.map((q) => [q.id, q]));
  const seen = new Set<string>();
  const results = answers.map(({ questionId, answer }) => {
    const row = byId.get(questionId);
    if (!row || seen.has(questionId)) throw new StoryError(`Unknown chapter question: ${questionId}`);
    seen.add(questionId);
    const options = Array.isArray(row.options) ? row.options.filter((o): o is string => typeof o === "string") : [];
    const correctAnswer = options[row.correctAnswer] ?? "";
    return {
      questionId,
      question: row.question,
      answer,
      correct: answer === correctAnswer,
      correctAnswer,
      textualEvidence: row.textualEvidence,
    };
  });
  const score = results.filter((r) => r.correct).length;

  return gradeChapterMcqOutputSchema.parse({
    score,
    total: answers.length,
    xpEarned: score * STORY_XP_PER_CORRECT_MC,
    results,
  });
}

/**
 * Starts one chapter MCQ retake: 5 fresh random questions without answers. A chapter pays the
 * MC XP once (spec D4): after the first submit `xpAvailable` is false, so a retake gives a new
 * score but no second XP. The caller pays XP only when the activity row is new.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - The `chapterId` (a UUID)
 * @returns Fresh quiz questions and whether the chapter still pays MC XP
 * @throws ChapterNotFoundError when the chapter is not visible
 * @throws When the input is invalid or the user is not a student
 */
export async function retakeChapterMcq({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: RetakeChapterMcqInput;
}): Promise<RetakeChapterMcqOutput> {
  assertCan(user, "progress:record", tenant);
  const { chapterId } = retakeChapterMcqInputSchema.parse(input);
  await requireVisibleChapter(db, user, chapterId);

  const rawDb = db.unscoped("stories and chapters are a global content catalog with no schoolId");
  const [bank, prior] = await Promise.all([
    rawDb
      .select({ id: multipleChoiceQuestions.id, question: multipleChoiceQuestions.question, options: multipleChoiceQuestions.options })
      .from(multipleChoiceQuestions)
      .where(eq(multipleChoiceQuestions.chapterId, chapterId))
      .orderBy(asc(multipleChoiceQuestions.order)),
    rawDb
      .select({ activityType: userActivity.activityType })
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, user.id),
          eq(userActivity.targetId, chapterId),
          eq(userActivity.activityType, STORY_ACTIVITY_TYPES.mc),
        ),
      )
      .limit(1),
  ]);

  return retakeChapterMcqOutputSchema.parse({ chapterId, mcq: pickChapterMcq(bank), xpAvailable: prior.length === 0 });
}

/**
 * Resolves one written submit (SAQ or LAQ) with the score of the AI: SA pays the score
 * (1 to 5), LA pays the rubric total (up to 25). One submit for each chapter and kind:
 * a second submit is refused. The caller writes the `STORIES_*` activity row and pays the XP.
 *
 * @param db - Database client
 * @param user - Authenticated user context (its level sets the LAQ length rule)
 * @param tenant - Tenant (school) scope
 * @param input - The `chapterId`, the kind, the `questionId`, the answer, and the AI score
 * @returns The question text, the sample answer, and the XP award
 * @throws ChapterNotFoundError when the chapter is not visible
 * @throws StoryError when the chapter already has this submit, the question is not in the
 * chapter, or the LAQ answer is shorter than level x 30 characters
 * @throws When the input is invalid or the user is not a student
 */
export async function resolveChapterWritten({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: ResolveChapterWrittenInput;
}): Promise<ResolveChapterWrittenOutput> {
  assertCan(user, "progress:record", tenant);
  const { chapterId, kind, questionId, answer, score } = resolveChapterWrittenInputSchema.parse(input);
  if (kind === "la") {
    const minChars = storyLaMinChars(user.level);
    if (answer.length < minChars) {
      throw new StoryError(`LA answer needs ${minChars} characters, got ${answer.length}`);
    }
  }
  await requireVisibleChapter(db, user, chapterId);

  const rawDb = db.unscoped("stories and chapters are a global content catalog with no schoolId");
  const activityType = kind === "sa" ? STORY_ACTIVITY_TYPES.sa : STORY_ACTIVITY_TYPES.la;
  const prior = await rawDb
    .select({ activityType: userActivity.activityType })
    .from(userActivity)
    .where(and(eq(userActivity.userId, user.id), eq(userActivity.targetId, chapterId), eq(userActivity.activityType, activityType)))
    .limit(1);
  if (prior.length) throw new StoryError(`Chapter ${kind.toUpperCase()} already submitted`);

  if (kind === "sa") {
    const [row] = await rawDb
      .select({ question: shortAnswerQuestions.question, sampleAnswer: shortAnswerQuestions.sampleAnswer })
      .from(shortAnswerQuestions)
      .where(and(eq(shortAnswerQuestions.id, questionId), eq(shortAnswerQuestions.chapterId, chapterId)))
      .limit(1);
    if (!row) throw new StoryError(`Chapter question not found: ${questionId}`);
    return resolveChapterWrittenOutputSchema.parse({
      question: row.question,
      suggestedAnswer: row.sampleAnswer,
      xpEarned: Math.max(0, Math.min(STORY_SA_MAX_XP, Math.round(score))),
    });
  }
  const [row] = await rawDb
    .select({ question: longAnswerQuestions.question })
    .from(longAnswerQuestions)
    .where(and(eq(longAnswerQuestions.id, questionId), eq(longAnswerQuestions.chapterId, chapterId)))
    .limit(1);
  if (!row) throw new StoryError(`Chapter question not found: ${questionId}`);
  return resolveChapterWrittenOutputSchema.parse({
    question: row.question,
    suggestedAnswer: null,
    xpEarned: Math.max(0, Math.min(STORY_LA_MAX_XP, Math.round(score))),
  });
}
