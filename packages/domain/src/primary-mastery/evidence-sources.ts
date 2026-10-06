/**
 * The source adapters (track primary_mastery_evidence_20261006, FR-5 and FR-6): one source row
 * becomes one event, with the owner's school so the job can refuse a row of another tenant
 * before any write. The sources are REFERENTIAL or FLAT tables read by row id; the school comes
 * from `users.schoolId` (question steps, flashcard reviews) or the row (game completions).
 */
import type { DB } from "@reading-advantage/db";
import { cardReviews, flashcardCards, flashcardDecks, gameCompletions, multipleChoiceQuestions, shortAnswerQuestions, userActivity, users } from "@reading-advantage/db/schema";
import { storyGameEvidenceSchema } from "@reading-advantage/game-contracts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTenantDB } from "../db-contract.js";
import { questionStepDetailsSchema, type PrimaryEvidenceEvent, type PrimaryEvidenceJobPayload, type QuestionAnswer } from "./evidence-contracts.js";
import type { EvidenceMode } from "./evidence-policy.js";

/** A loaded event with the school that owns its row. */
export interface LoadedEvidenceEvent {
  schoolId: string;
  event: PrimaryEvidenceEvent;
  /** Legacy quiz answers whose question text matched no question row of the article. */
  legacyUnmatched?: number;
}

/**
 * A quiz row saved before T2 has no lesson mode; it is recorded at the teacher-led (lower)
 * confidence as the conservative value, and its first-try flag is assumed (the MCQ screen
 * allows one click per question). Agreed with the monorepo session on 2026-10-06.
 */
export const LEGACY_QUIZ_MODE: EvidenceMode = "teacher_led";

/** The reviewer scores a short answer out of this many points (`SAQFeedback.score`). */
export const LEGACY_SAQ_MAX_SCORE = 5;

/** The activity types of a quiz row; other `user_activity` rows (flashcards, reading) carry no question evidence. */
const QUIZ_ACTIVITY_TYPES = { MC_QUESTION: "mcq", SA_QUESTION: "saq", LA_QUESTION: "laq" } as const;

const legacyMcqDetailsSchema = z.object({ responses: z.array(z.object({ question: z.string(), answer: z.string().nullable().optional(), isCorrect: z.string().nullable().optional() }).passthrough()).default([]) }).passthrough();
const legacySaqDetailsSchema = z.object({ question: z.string().min(1), score: z.number().min(0).optional() }).passthrough();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (value: unknown): string | null => (typeof value === "string" && UUID.test(value) ? value : null);
const iso = (value: unknown): string => (value instanceof Date ? value : new Date(String(value))).toISOString();
const normalizeText = (text: string): string => text.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Rebuilds the per-question answers of a quiz row saved before T2 by matching its question
 * texts against the article's question rows (the tags backfill's text rule). Unmatched text
 * is counted, never guessed.
 * @param params The unscoped database, the article, the activity type, and the legacy details.
 * @returns The matched answers and the unmatched count; empty for an LAQ or an unknown shape.
 */
export async function legacyQuizAnswers(params: { db: DB; articleId: string; activityType: string; details: unknown }): Promise<{ questions: QuestionAnswer[]; unmatched: number }> {
  const type = QUIZ_ACTIVITY_TYPES[params.activityType as keyof typeof QUIZ_ACTIVITY_TYPES];
  if (type === "mcq") {
    const parsed = legacyMcqDetailsSchema.safeParse(params.details);
    if (!parsed.success || !parsed.data.responses.length) return { questions: [], unmatched: 0 };
    const rows = await params.db.select({ id: multipleChoiceQuestions.id, question: multipleChoiceQuestions.question }).from(multipleChoiceQuestions).where(eq(multipleChoiceQuestions.articleId, params.articleId));
    const byText = new Map(rows.map((row) => [normalizeText(row.question ?? ""), row.id]));
    const questions: QuestionAnswer[] = [];
    let unmatched = 0;
    for (const response of parsed.data.responses) {
      const questionId = byText.get(normalizeText(response.question));
      if (!questionId) {
        unmatched += 1;
        continue;
      }
      questions.push({ questionId, questionType: "mcq", correct: response.answer != null && response.answer === response.isCorrect, firstTry: true });
    }
    return { questions, unmatched };
  }
  if (type === "saq") {
    const parsed = legacySaqDetailsSchema.safeParse(params.details);
    if (!parsed.success) return { questions: [], unmatched: 0 };
    const rows = await params.db.select({ id: shortAnswerQuestions.id, question: shortAnswerQuestions.question }).from(shortAnswerQuestions).where(eq(shortAnswerQuestions.articleId, params.articleId));
    const match = rows.find((row) => normalizeText(row.question ?? "") === normalizeText(parsed.data.question));
    if (!match) return { questions: [], unmatched: 1 };
    const scoreRatio = parsed.data.score === undefined ? undefined : Math.max(0, Math.min(1, parsed.data.score / LEGACY_SAQ_MAX_SCORE));
    return { questions: [{ questionId: match.id, questionType: "saq", scoreRatio }], unmatched: 0 };
  }
  return { questions: [], unmatched: 0 };
}

const UNSCOPED_REASON = "evidence source rows are read by id before the tenant is known; userActivity, cardReviews, flashcardCards, and flashcardDecks have no schoolId and are scoped through users.schoolId; the loaded schoolId is checked against the job tenant before any write";

/**
 * Loads one source row and turns it into an event.
 * @param params The database and the job payload (source table and row id).
 * @returns The event with its school, or `null` when the row is gone, has no school, or carries no evidence.
 */
export async function loadPrimaryEvidenceEvent(params: { db: DB; payload: PrimaryEvidenceJobPayload }): Promise<LoadedEvidenceEvent | null> {
  const db = createTenantDB(params.db, { schoolId: null }).unscoped(UNSCOPED_REASON);
  const { rowId } = params.payload;
  if (params.payload.sourceTable === "user_activity") {
    const [row] = await db
      .select({ id: userActivity.id, userId: userActivity.userId, schoolId: users.schoolId, activityType: userActivity.activityType, targetId: userActivity.targetId, createdAt: userActivity.createdAt, details: userActivity.details })
      .from(userActivity)
      .innerJoin(users, eq(users.id, userActivity.userId))
      .where(eq(userActivity.id, rowId))
      .limit(1);
    const articleId = asUuid(row?.targetId);
    if (!row?.schoolId || !articleId || !(row.activityType in QUIZ_ACTIVITY_TYPES)) return null;
    const details = questionStepDetailsSchema.safeParse(row.details);
    const legacy = details.success ? null : await legacyQuizAnswers({ db, articleId, activityType: row.activityType, details: row.details });
    const step = details.success ? details.data : { mode: LEGACY_QUIZ_MODE, questions: legacy?.questions ?? [] };
    return {
      schoolId: row.schoolId,
      event: { kind: "question-step", sourceTable: "user_activity", rowId: row.id, userId: row.userId, articleId, mode: step.mode, questions: step.questions, hintUsed: step.hintUsed, audioPlayed: step.audioPlayed, occurredAt: iso(row.createdAt) },
      ...(legacy?.unmatched ? { legacyUnmatched: legacy.unmatched } : {}),
    };
  }
  if (params.payload.sourceTable === "card_reviews") {
    const [row] = await db
      .select({ id: cardReviews.id, rating: cardReviews.rating, timeSpent: cardReviews.timeSpent, reviewedAt: cardReviews.reviewedAt, front: flashcardCards.front, sourceId: flashcardCards.sourceId, userId: flashcardDecks.userId, schoolId: users.schoolId })
      .from(cardReviews)
      .innerJoin(flashcardCards, eq(flashcardCards.id, cardReviews.cardId))
      .innerJoin(flashcardDecks, eq(flashcardDecks.id, flashcardCards.deckId))
      .innerJoin(users, eq(users.id, flashcardDecks.userId))
      .where(eq(cardReviews.id, rowId))
      .limit(1);
    if (!row?.schoolId) return null;
    return {
      schoolId: row.schoolId,
      event: { kind: "flashcard-review", sourceTable: "card_reviews", rowId: row.id, userId: row.userId, articleId: asUuid(row.sourceId), word: row.front, rating: Number(row.rating), timeSpentMs: row.timeSpent == null ? undefined : Number(row.timeSpent), occurredAt: iso(row.reviewedAt) },
    };
  }
  const [row] = await db
    .select({ id: gameCompletions.id, schoolId: gameCompletions.schoolId, userId: gameCompletions.userId, gameType: gameCompletions.gameType, createdAt: gameCompletions.createdAt, metadata: gameCompletions.metadata })
    .from(gameCompletions)
    .where(eq(gameCompletions.id, rowId))
    .limit(1);
  if (!row?.schoolId) return null;
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const evidence = storyGameEvidenceSchema.safeParse(metadata.learningEvidence);
  if (!evidence.success) return null;
  return {
    schoolId: row.schoolId,
    event: {
      kind: "game-run",
      sourceTable: "game_completions",
      rowId: row.id,
      userId: row.userId,
      gameId: evidence.data.gameId,
      articleId: asUuid(metadata.articleId),
      surface: evidence.data.gameId === "expedition" ? "expedition" : "game",
      items: evidence.data.items.map((item) => ({ itemId: item.itemId, kind: item.itemKind, label: item.label, attempts: item.attempts, correctFirstTry: item.correctFirstTry, solved: item.solved })),
      occurredAt: iso(row.createdAt),
    },
  };
}
