/**
 * The source adapters (track primary_mastery_evidence_20261006, FR-5 and FR-6): one source row
 * becomes one event, with the owner's school so the job can refuse a row of another tenant
 * before any write. The sources are REFERENTIAL or FLAT tables read by row id; the school comes
 * from `users.schoolId` (question steps, flashcard reviews) or the row (game completions).
 */
import type { DB } from "@reading-advantage/db";
import { cardReviews, flashcardCards, flashcardDecks, gameCompletions, userActivity, users } from "@reading-advantage/db/schema";
import { storyGameEvidenceSchema } from "@reading-advantage/game-contracts";
import { eq } from "drizzle-orm";
import { createTenantDB } from "../db-contract.js";
import { questionStepDetailsSchema, type PrimaryEvidenceEvent, type PrimaryEvidenceJobPayload } from "./evidence-contracts.js";

/** A loaded event with the school that owns its row. */
export interface LoadedEvidenceEvent {
  schoolId: string;
  event: PrimaryEvidenceEvent;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (value: unknown): string | null => (typeof value === "string" && UUID.test(value) ? value : null);
const iso = (value: unknown): string => (value instanceof Date ? value : new Date(String(value))).toISOString();

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
    if (!row?.schoolId || !articleId) return null;
    const details = questionStepDetailsSchema.safeParse(row.details);
    const step = details.success ? details.data : { mode: "independent" as const, questions: [] };
    return {
      schoolId: row.schoolId,
      event: { kind: "question-step", sourceTable: "user_activity", rowId: row.id, userId: row.userId, articleId, mode: step.mode, questions: step.questions, hintUsed: step.hintUsed, audioPlayed: step.audioPlayed, occurredAt: iso(row.createdAt) },
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
