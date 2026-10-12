"use server";

import { z } from "zod";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import {
  getChapterWrittenQuestion,
  gradeChapterMcq as gradeMcq,
  retakeChapterMcq as buildMcqRetake,
  resolveChapterWritten as resolveWritten,
  storyLaMinChars,
} from "@reading-advantage/domain/stories";
import { currentUser } from "@/lib/session";
import { guardStudentAction } from "@/lib/student-view";
import { awardQuestionXp } from "@/server/xp/award-question-xp";
import { saveChapterToFlashcard } from "./flashcard";
import { getLaqFeedback, getSaqFeedback } from "@/server/utils/assistant";
import { ActivityType } from "@/types/enum";

const chapterIdSchema = z.string().uuid();
const mcAnswersSchema = z
  .array(z.object({ questionId: z.string().uuid(), answer: z.string().max(1000) }))
  .min(1)
  .max(5);
const writtenKindSchema = z.enum(["sa", "la"]);
const writtenAnswerSchema = z.string().trim().min(1).max(2000);
const feedbackScoreSchema = z.number().finite();

/** The activity type of a chapter written submit. */
function writtenActivityType(kind: "sa" | "la"): ActivityType {
  return kind === "sa" ? ActivityType.STORIES_SA_QUESTION : ActivityType.STORIES_LA_QUESTION;
}

/**
 * Grades one chapter MCQ submit on the server and saves it: the first submit of the chapter
 * pays 2 XP for each correct answer (spec D4); a resubmit after a retake shows the new score
 * through the same row and pays no second XP. Staff in preview save nothing. No evidence job.
 * @param chapterId The chapter id.
 * @param answers The answer text for each question shown.
 * @returns The score, the total, the XP paid now, and the per-question results; or an error.
 */
export async function submitChapterMcq(chapterId: string, answers: { questionId: string; answer: string }[]) {
  const user = await currentUser();
  if (!user) return { error: "unauthorized" };

  const preview = guardStudentAction(user, "submit_chapter_mcq");
  if (preview) return preview;

  const parsed = z.object({ chapterId: chapterIdSchema, answers: mcAnswersSchema }).safeParse({ chapterId, answers });
  if (!parsed.success) return { error: "invalid" };

  let grade;
  try {
    const tenant = { schoolId: user.schoolId };
    grade = await gradeMcq({ db: createTenantDB(db, tenant), user, tenant, input: parsed.data });
  } catch {
    return { error: "grade_failed" };
  }

  const details = {
    score: grade.score,
    responses: grade.results.map((r) => ({ questionId: r.questionId, answer: r.answer, correct: r.correct })),
  };
  const saved = await db.transaction((tx) =>
    awardQuestionXp(tx, {
      userId: user.id as string,
      schoolId: user.schoolId ?? null,
      activityType: ActivityType.STORIES_MC_QUESTION,
      targetId: chapterId,
      details,
      xpEarned: grade.xpEarned,
      refreshDetails: details,
    }),
  );
  if (!saved) return { error: "submit_failed" };

  if (saved.status === "saved") await saveChapterToFlashcard(chapterId);

  return { success: true, score: grade.score, total: grade.total, xpEarned: saved.status === "saved" ? grade.xpEarned : 0, results: grade.results };
}

/**
 * Starts one chapter MCQ retake: 5 fresh random questions without answers. A chapter pays the
 * MC XP once (spec D4): after the first submit `xpAvailable` is false. This writes nothing.
 * @param chapterId The chapter id.
 * @returns The fresh quiz and whether the chapter still pays MC XP; or an error.
 */
export async function retakeChapterMcq(chapterId: string) {
  const user = await currentUser();
  if (!user) return { error: "unauthorized" };

  const preview = guardStudentAction(user, "retake_chapter_mcq");
  if (preview) return preview;

  if (!chapterIdSchema.safeParse(chapterId).success) return { error: "invalid" };

  try {
    const tenant = { schoolId: user.schoolId };
    const retake = await buildMcqRetake({ db: createTenantDB(db, tenant), user, tenant, input: { chapterId } });
    return { success: true, mcq: retake.mcq, xpAvailable: retake.xpAvailable };
  } catch {
    return { error: "retake_failed" };
  }
}

/**
 * Asks the AI for SAQ or LAQ feedback on a chapter answer, without saving. An LAQ answer
 * shorter than `level x 30` characters is refused before the AI call.
 * @param chapterId The chapter id.
 * @param kind `sa` or `la`.
 * @param questionId The written question id.
 * @param answer The student answer.
 * @param preferredLanguage The feedback language.
 * @returns The feedback text and the AI score; or an error (`too_short` names `minChars`).
 */
export async function getChapterWrittenFeedback(
  chapterId: string,
  kind: "sa" | "la",
  questionId: string,
  answer: string,
  preferredLanguage: string,
) {
  const user = await currentUser();
  if (!user) return { error: "unauthorized" };

  const preview = guardStudentAction(user, "chapter_written_feedback");
  if (preview) return preview;

  const parsed = z
    .object({
      chapterId: chapterIdSchema,
      kind: writtenKindSchema,
      questionId: z.string().uuid(),
      answer: writtenAnswerSchema,
      preferredLanguage: z.string().min(1).max(16),
    })
    .safeParse({ chapterId, kind, questionId, answer, preferredLanguage });
  if (!parsed.success) return { error: "invalid" };

  if (parsed.data.kind === "la") {
    const minChars = storyLaMinChars(user.level);
    if (parsed.data.answer.length < minChars) return { error: "too_short", minChars };
  }

  try {
    const tenant = { schoolId: user.schoolId };
    const tenantDb = createTenantDB(db, tenant);
    const asked = await getChapterWrittenQuestion({
      db: tenantDb,
      user,
      tenant,
      input: { chapterId: parsed.data.chapterId, kind: parsed.data.kind, questionId: parsed.data.questionId },
    });
    const source = { chapterId: parsed.data.chapterId };
    const req = {
      question: asked.question,
      answer: parsed.data.answer,
      suggestedResponse: asked.suggestedAnswer ?? "",
      preferredLanguage: parsed.data.preferredLanguage,
    };
    if (parsed.data.kind === "sa") {
      const fb = await getSaqFeedback({ data: { ...source, ...req }, activityType: ActivityType.STORIES_SA_QUESTION });
      return { success: true, feedback: fb.feedback, score: fb.score };
    }
    const fb = (await getLaqFeedback({ data: { ...source, ...req } })) as {
      scores?: Record<string, number>;
      score?: Record<string, number>;
      overallImpression?: string;
    };
    const dims = fb.scores ?? fb.score ?? {};
    const score = Object.values(dims)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
      .reduce((sum, v) => sum + v, 0);
    return { success: true, feedback: fb.overallImpression ?? "", score };
  } catch {
    return { error: "feedback_failed" };
  }
}

/**
 * Submits one chapter written answer (SAQ or LAQ) with the AI score: SA pays the score
 * (1 to 5), LA pays the rubric total (up to 25). One submit for each chapter and kind;
 * a second submit is refused. Staff in preview save nothing. No evidence job.
 * @param chapterId The chapter id.
 * @param kind `sa` or `la`.
 * @param questionId The written question id.
 * @param answer The student answer.
 * @param score The AI score.
 * @returns The XP award; or an error (`already_submitted` on a second submit).
 */
export async function submitChapterWritten(
  chapterId: string,
  kind: "sa" | "la",
  questionId: string,
  answer: string,
  score: number,
) {
  const user = await currentUser();
  if (!user) return { error: "unauthorized" };

  const preview = guardStudentAction(user, "submit_chapter_written");
  if (preview) return preview;

  const parsed = z
    .object({
      chapterId: chapterIdSchema,
      kind: writtenKindSchema,
      questionId: z.string().uuid(),
      answer: writtenAnswerSchema,
      score: feedbackScoreSchema,
    })
    .safeParse({ chapterId, kind, questionId, answer, score });
  if (!parsed.success) return { error: "invalid" };

  let resolved;
  try {
    const tenant = { schoolId: user.schoolId };
    resolved = await resolveWritten({ db: createTenantDB(db, tenant), user, tenant, input: parsed.data });
  } catch (error) {
    if (error instanceof Error && /already submitted/i.test(error.message)) return { error: "already_submitted" };
    if (error instanceof Error && /characters/i.test(error.message)) return { error: "too_short" };
    return { error: "submit_failed" };
  }

  const details = { question: resolved.question, yourAnswer: parsed.data.answer, score: parsed.data.score };
  const saved = await db.transaction((tx) =>
    awardQuestionXp(tx, {
      userId: user.id as string,
      schoolId: user.schoolId ?? null,
      activityType: writtenActivityType(parsed.data.kind),
      targetId: parsed.data.chapterId,
      details,
      xpEarned: resolved.xpEarned,
    }),
  );
  if (!saved) return { error: "submit_failed" };

  if (saved.status === "saved") await saveChapterToFlashcard(parsed.data.chapterId);

  return { success: true, xpEarned: resolved.xpEarned, question: resolved.question };
}
