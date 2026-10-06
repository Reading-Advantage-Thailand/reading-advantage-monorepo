/**
 * The evidence policy of the Primary graph (track primary_mastery_evidence_20261006, FR-1):
 * the matrix of program section 4.2 as data, and the pure rating function. Decision 2 of
 * the program: these confidence values are the starting values; shadow-mode data tunes them.
 */
import { z } from "zod";

/** The version of this policy, stored with every evidence row the policy produced. */
export const EVIDENCE_POLICY_VERSION = "primary-evidence.v1";

/** The surfaces that can emit evidence. */
export const evidenceSurfaceSchema = z.enum(["mcq", "saq", "laq", "flashcard", "game", "expedition", "cloze", "matching", "order-words", "order-sentences"]);
export type EvidenceSurface = z.infer<typeof evidenceSurfaceSchema>;

/** The lesson mode of the step that produced the evidence. */
export const evidenceModeSchema = z.enum(["teacher_led", "independent"]);
export type EvidenceMode = z.infer<typeof evidenceModeSchema>;

/** The SRS rating an item earns. */
export const evidenceRatingSchema = z.enum(["Again", "Hard", "Good"]);
export type EvidenceRating = z.infer<typeof evidenceRatingSchema>;

/** One row of the matrix. */
export const evidencePolicyRowSchema = z
  .object({
    surface: evidenceSurfaceSchema,
    /** Where the objective comes from: the question's tags, the word's node, or the lesson's supporting objectives. */
    objectiveSource: z.enum(["question", "word", "supporting", "none"]),
    /** The confidence in independent mode; `null` when the surface records nothing. */
    confidence: z.number().min(0).max(1).nullable(),
    /** The confidence in teacher-led mode when it differs. */
    teacherLedConfidence: z.number().min(0).max(1).nullable().optional(),
    /** Whether the evidence may complete mastery on its own. */
    countsTowardMastered: z.boolean(),
  })
  .strict();
export type EvidencePolicyRow = z.infer<typeof evidencePolicyRowSchema>;

/** The whole policy. */
export const evidencePolicySchema = z.object({ version: z.string().min(1), rows: z.array(evidencePolicyRowSchema).min(1) }).strict();

/** Program section 4.2, one row per surface. */
export const EVIDENCE_POLICY = evidencePolicySchema.parse({
  version: EVIDENCE_POLICY_VERSION,
  rows: [
    { surface: "mcq", objectiveSource: "question", confidence: 0.8, teacherLedConfidence: 0.5, countsTowardMastered: true },
    { surface: "saq", objectiveSource: "question", confidence: 0.7, countsTowardMastered: true },
    { surface: "laq", objectiveSource: "none", confidence: null, countsTowardMastered: false },
    { surface: "flashcard", objectiveSource: "word", confidence: 0.7, countsTowardMastered: true },
    { surface: "game", objectiveSource: "word", confidence: 0.4, countsTowardMastered: false },
    { surface: "expedition", objectiveSource: "word", confidence: 0.4, countsTowardMastered: false },
    { surface: "cloze", objectiveSource: "supporting", confidence: 0.3, countsTowardMastered: false },
    { surface: "matching", objectiveSource: "supporting", confidence: 0.3, countsTowardMastered: false },
    { surface: "order-words", objectiveSource: "supporting", confidence: 0.3, countsTowardMastered: false },
    { surface: "order-sentences", objectiveSource: "supporting", confidence: 0.3, countsTowardMastered: false },
  ],
});

/** A hint, a reveal, or an open translation panel lowers the confidence one step. */
const STEP_DOWN: Record<string, number> = { "0.8": 0.5, "0.7": 0.5, "0.5": 0.3, "0.4": 0.3, "0.3": 0.3 };

/** An answer in under this time is low information. */
export const MIN_ANSWER_MS = 2000;

/** What the surface observed for one item. */
export const evidenceOutcomeSchema = z
  .object({
    /** MCQ: the answer was right on the first try. */
    correct: z.boolean().optional(),
    /** Game and expedition: solved on the first try, solved after a retry, or never. */
    correctFirstTry: z.boolean().optional(),
    solved: z.boolean().optional(),
    /** SAQ: the rubric score ratio 0 to 1. */
    scoreRatio: z.number().min(0).max(1).optional(),
    /** Flashcard: the student's own rating 1 Again, 2 Hard, 3 Good, 4 Easy. */
    rating: z.number().int().min(1).max(4).optional(),
    /** Cloze, matching, and ordering: the correct ratio 0 to 1. */
    correctRatio: z.number().min(0).max(1).optional(),
    /** The answer was empty. */
    blank: z.boolean().optional(),
    /** Time from the first interaction to the answer. */
    answerMs: z.number().int().nonnegative().optional(),
  })
  .strict();
export type EvidenceOutcome = z.infer<typeof evidenceOutcomeSchema>;

/** The context of the step. */
export const evidenceContextSchema = z
  .object({
    mode: evidenceModeSchema,
    /** A hint, a reveal, or an open translation panel before the answer. */
    hintUsed: z.boolean().optional(),
    /** The article audio played during the step. */
    audioPlayed: z.boolean().optional(),
    /** The skill of the objective: a listening objective needs audio. */
    objectiveSkill: z.enum(["Reading", "Listening", "Vocabulary"]).optional(),
  })
  .strict();
export type EvidenceContext = z.infer<typeof evidenceContextSchema>;

/** Why an item records nothing. */
export const evidenceSkipReasonSchema = z.enum(["no-evidence", "blank", "too-fast", "listening-without-audio"]);
export type EvidenceSkipReason = z.infer<typeof evidenceSkipReasonSchema>;

/** The rating of one item, or the reason it records nothing. */
export type EvidenceDecision =
  | { kind: "evidence"; rating: EvidenceRating; confidence: number; countsTowardMastered: boolean; hintUsed: boolean }
  | { kind: "skip"; reason: EvidenceSkipReason };

const ROWS = new Map(EVIDENCE_POLICY.rows.map((row) => [row.surface, row]));

/**
 * The policy row of a surface.
 * @param surface The surface.
 * @returns The row; every surface has one.
 */
export function evidencePolicyRow(surface: EvidenceSurface): EvidencePolicyRow {
  const row = ROWS.get(surface);
  if (!row) throw new Error(`No evidence policy row for surface "${surface}"`);
  return row;
}

function ratingOf(surface: EvidenceSurface, outcome: EvidenceOutcome): EvidenceRating {
  switch (surface) {
    case "mcq":
      return outcome.correct ? "Good" : "Again";
    case "saq": {
      const ratio = outcome.scoreRatio ?? 0;
      return ratio >= 1 ? "Good" : ratio >= 0.5 ? "Hard" : "Again";
    }
    case "flashcard":
      return (outcome.rating ?? 1) >= 3 ? "Good" : outcome.rating === 2 ? "Hard" : "Again";
    case "game":
    case "expedition":
      return outcome.correctFirstTry ? "Good" : outcome.solved ? "Hard" : "Again";
    default: {
      const ratio = outcome.correctRatio ?? 0;
      return ratio >= 1 ? "Good" : ratio >= 0.5 ? "Hard" : "Again";
    }
  }
}

/**
 * Rates one item by the matrix and the rules that hold on every surface.
 * @param surface The surface that produced the item.
 * @param outcome What the surface observed.
 * @param context The mode, hint, audio, and objective skill.
 * @returns The rating with its confidence, or a skip with its reason.
 */
export function rateEvidence(surface: EvidenceSurface, outcome: EvidenceOutcome, context: EvidenceContext): EvidenceDecision {
  const row = evidencePolicyRow(surface);
  if (row.confidence === null) return { kind: "skip", reason: "no-evidence" };
  if (outcome.blank) return { kind: "skip", reason: "blank" };
  if (outcome.answerMs !== undefined && outcome.answerMs < MIN_ANSWER_MS) return { kind: "skip", reason: "too-fast" };
  // Only a reported "no" skips: a legacy row, or a screen that does not track audio yet, leaves the key out, and the owner rule keeps that evidence.
  if (context.objectiveSkill === "Listening" && context.audioPlayed === false) return { kind: "skip", reason: "listening-without-audio" };
  const base = context.mode === "teacher_led" && row.teacherLedConfidence != null ? row.teacherLedConfidence : row.confidence;
  const confidence = context.hintUsed ? (STEP_DOWN[String(base)] ?? base) : base;
  return { kind: "evidence", rating: ratingOf(surface, outcome), confidence, countsTowardMastered: row.countsTowardMastered, hintUsed: Boolean(context.hintUsed) };
}
