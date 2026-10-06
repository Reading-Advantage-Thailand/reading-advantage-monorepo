/**
 * The source event contracts of the evidence pipeline (track primary_mastery_evidence_20261006,
 * FR-2 and FR-5): what a question step, a flashcard review, and a game run hand to
 * `recordPrimaryEvidence`, the result it returns, and the durable job that carries a source
 * row id to the worker.
 */
import { z } from "zod";
import { evidenceModeSchema, evidenceSkipReasonSchema } from "./evidence-policy.js";

const uuid = z.string().uuid();
const id = z.string().min(1);

/** One answered question of a quiz, as the question step records it. */
export const questionAnswerSchema = z
  .object({
    questionId: uuid,
    questionType: z.enum(["mcq", "saq", "laq"]),
    /** MCQ: right on the first try. SAQ: the rubric score ratio decides. */
    correct: z.boolean().optional(),
    /** MCQ: the first click was the final answer. */
    firstTry: z.boolean().optional(),
    /** SAQ: the rubric score 0 to 1. */
    scoreRatio: z.number().min(0).max(1).optional(),
    blank: z.boolean().optional(),
    answerMs: z.number().int().nonnegative().optional(),
  })
  .strict();
export type QuestionAnswer = z.infer<typeof questionAnswerSchema>;

/**
 * The additive keys the question action writes into `user_activity.details` (FR-5a). The
 * legacy keys (question, yourAnswer, score, responses, feedback) stay beside them.
 */
export const questionStepDetailsSchema = z
  .object({
    mode: evidenceModeSchema,
    questions: z.array(questionAnswerSchema).max(200),
    hintUsed: z.boolean().optional(),
    audioPlayed: z.boolean().optional(),
  })
  .passthrough();
export type QuestionStepDetails = z.infer<typeof questionStepDetailsSchema>;

/** A question step: one `user_activity` row of an MCQ, SAQ, or LAQ quiz. */
export const questionAnswerEventSchema = z
  .object({
    kind: z.literal("question-step"),
    sourceTable: z.literal("user_activity"),
    rowId: uuid,
    userId: id,
    articleId: uuid,
    mode: evidenceModeSchema,
    questions: z.array(questionAnswerSchema).max(200),
    hintUsed: z.boolean().optional(),
    audioPlayed: z.boolean().optional(),
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type QuestionAnswerEvent = z.infer<typeof questionAnswerEventSchema>;

/** A flashcard review: one `card_reviews` row with its card. */
export const flashcardReviewEventSchema = z
  .object({
    kind: z.literal("flashcard-review"),
    sourceTable: z.literal("card_reviews"),
    rowId: uuid,
    userId: id,
    /** The card's source article; `null` when the card came from a lesson or has no source. */
    articleId: uuid.nullable(),
    /** The card front: the word as the glossary shows it. */
    word: z.string().min(1),
    /** 1 Again, 2 Hard, 3 Good, 4 Easy. */
    rating: z.number().int().min(1).max(4),
    timeSpentMs: z.number().int().nonnegative().optional(),
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type FlashcardReviewEvent = z.infer<typeof flashcardReviewEventSchema>;

/** One story item a game asked about, from `storyGameEvidence`. */
export const gameItemSchema = z
  .object({
    itemId: id,
    kind: z.enum(["word", "sentence", "fill", "question"]),
    /** The term, the fill answer, or the question text. */
    label: z.string().min(1),
    attempts: z.number().int().min(1),
    correctFirstTry: z.boolean(),
    solved: z.boolean(),
  })
  .strict();
export type GameItem = z.infer<typeof gameItemSchema>;

/** A game run: one `game_completions` row with its story evidence. */
export const gameCompletionEventSchema = z
  .object({
    kind: z.literal("game-run"),
    sourceTable: z.literal("game_completions"),
    rowId: uuid,
    userId: id,
    gameId: id,
    /** The expedition posts the article it tells; a practice game without a story has none. */
    articleId: uuid.nullable(),
    /** `expedition` for the story expedition, `game` for a practice game. */
    surface: z.enum(["game", "expedition"]),
    items: z.array(gameItemSchema).max(200),
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type GameCompletionEvent = z.infer<typeof gameCompletionEventSchema>;

/** Any source event. */
export const primaryEvidenceEventSchema = z.discriminatedUnion("kind", [questionAnswerEventSchema, flashcardReviewEventSchema, gameCompletionEventSchema]);
export type PrimaryEvidenceEvent = z.infer<typeof primaryEvidenceEventSchema>;

/** One committed objective of one item. */
export const committedEvidenceSchema = z
  .object({
    itemId: id,
    objectiveId: id,
    variantKey: id,
    rating: z.enum(["Again", "Hard", "Good"]),
    confidence: z.number().min(0).max(1),
    status: z.enum(["applied", "replayed"]),
    commitId: id,
  })
  .strict();
export type CommittedEvidence = z.infer<typeof committedEvidenceSchema>;

/** One item, or one objective of an item, that recorded nothing. */
export const skippedEvidenceSchema = z
  .object({
    itemId: id,
    objectiveId: id.optional(),
    reason: z.enum([...evidenceSkipReasonSchema.options, "no-tag", "unknown-item", "no-article"]),
  })
  .strict();
export type SkippedEvidence = z.infer<typeof skippedEvidenceSchema>;

/** What `recordPrimaryEvidence` returns. */
export const recordPrimaryEvidenceResultSchema = z
  .object({
    event: z.object({ kind: z.string(), sourceTable: z.string(), rowId: z.string() }).strict(),
    committed: z.array(committedEvidenceSchema),
    skipped: z.array(skippedEvidenceSchema),
  })
  .strict();
export type RecordPrimaryEvidenceResult = z.infer<typeof recordPrimaryEvidenceResultSchema>;

/** The durable job that carries one source row to the worker (FR-5). */
export const PRIMARY_EVIDENCE_JOB_NAME = "primary.mastery.evidence";
/** The queue the Primary worker polls. */
export const PRIMARY_EVIDENCE_QUEUE_NAME = "primary-mastery";
/** One game run holds at most this many items; a larger run is rejected, never split. */
export const MAX_EVIDENCE_ITEMS = 200;

/** The job payload: which row to read. */
export const primaryEvidenceJobPayloadSchema = z
  .object({
    sourceTable: z.enum(["user_activity", "card_reviews", "game_completions"]),
    rowId: uuid,
  })
  .strict();
export type PrimaryEvidenceJobPayload = z.infer<typeof primaryEvidenceJobPayloadSchema>;

/** The job result: the counts the worker settles with. */
export const primaryEvidenceJobResultSchema = z
  .object({ committed: z.number().int().nonnegative(), skipped: z.number().int().nonnegative(), status: z.enum(["recorded", "row-missing"]) })
  .strict();
export type PrimaryEvidenceJobResult = z.infer<typeof primaryEvidenceJobResultSchema>;

/**
 * The idempotency key of one job: one row, one job.
 * @param payload The source row.
 * @returns A stable key.
 */
export function primaryEvidenceJobKey(payload: PrimaryEvidenceJobPayload): string {
  return `${PRIMARY_EVIDENCE_JOB_NAME}:${payload.sourceTable}:${payload.rowId}`;
}

/**
 * The idempotency key of one objective of one item (FR-3).
 * @param event The source event.
 * @param itemId The question id, the word, or the story item id.
 * @param objectiveId The graph node.
 * @returns A stable key.
 */
export function evidenceIdempotencyKey(event: Pick<PrimaryEvidenceEvent, "sourceTable" | "rowId">, itemId: string, objectiveId: string): string {
  return `${event.sourceTable}:${event.rowId}:${itemId}:${objectiveId}`;
}
