import { z } from "zod";

/** Strict schema for one canonical learning-content item. */
export const vocabularyItemSchema = z
  .object({
    term: z.string(),
    translation: z.string(),
  })
  .strict();

/** Strict cartridge-facing vocabulary-array schema. */
export const vocabularyInputSchema = z.array(vocabularyItemSchema);

/** Strict cartridge-facing sentence-array schema. */
export const sentenceInputSchema = z.array(vocabularyItemSchema);

/** Strict schema for the established five-field cartridge result. */
export const gameResultsSchema = z
  .object({
    accuracy: z.number().min(0).max(1),
    xp: z.number().int().min(0),
    score: z.number().int().min(0),
    correctAnswers: z.number().int().min(0),
    totalAttempts: z.number().int().min(0),
  })
  .strict();

const legacyVocabularyItemSchema = z
  .object({
    id: z.string().optional(),
    term: z.string(),
    translation: z.string(),
  })
  .strict();

const legacyVocabularyInputSchema = z.array(legacyVocabularyItemSchema);

/** A canonical vocabulary item accepted by every APK cartridge. */
export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;

/** The established vocabulary array calling convention. */
export type VocabularyInput = z.infer<typeof vocabularyInputSchema>;

/** The sentence-mode array calling convention, semantically distinct from vocabulary. */
export type SentenceInput = z.infer<typeof sentenceInputSchema>;

/** The established result emitted by an APK cartridge. */
export type GameResults = z.infer<typeof gameResultsSchema>;

/**
 * Converts the legacy optional-id host shape into the strict vocabulary ABI.
 * @param input Untrusted host content using the legacy optional-id shape.
 * @returns A new canonical vocabulary array containing only term and translation.
 * @throws When the input is not a valid legacy vocabulary array.
 */
export function normalizeVocabularyInput(input: unknown): VocabularyInput {
  const parsed = legacyVocabularyInputSchema.parse(input);
  return vocabularyInputSchema.parse(
    parsed.map(({ term, translation }) => ({ term, translation })),
  );
}

/**
 * Converts the legacy optional-id host shape into the strict sentence ABI.
 * @param input Untrusted host content using the legacy optional-id shape.
 * @returns A new canonical sentence array containing only term and translation.
 * @throws When the input is not a valid legacy sentence array.
 */
export function normalizeSentenceInput(input: unknown): SentenceInput {
  return sentenceInputSchema.parse(normalizeVocabularyInput(input));
}
