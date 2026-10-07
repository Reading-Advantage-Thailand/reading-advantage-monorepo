import { and, asc, desc, eq } from "drizzle-orm";
import { assertCan, type Tenant, type UserContext } from "@reading-advantage/auth";
import {
  userSentenceRecords,
  userWordRecords,
} from "@reading-advantage/db/schema";
import {
  cefrLevelSchema,
  practiceInputSchema,
  type CefrLevel,
  type PracticeInput,
  type PracticeSentence,
  type PracticeWord,
} from "@reading-advantage/game-contracts";
import { z } from "zod";

import type { TenantDB } from "../db-contract.js";
import {
  gameLearningContentLocaleSchema,
  selectTranslation,
  wordRecordSchema,
} from "./learning-content.js";

/** Most saved words a practice game receives: the largest word round of any game. */
export const PRACTICE_WORD_LIMIT = 10;

/** Most saved sentences a practice game receives: the largest sentence round of any game. */
export const PRACTICE_SENTENCE_LIMIT = 8;

/** Rows read per table: room to skip malformed rows and repeated terms. */
const ROW_LIMIT = 50;

/** The id of the practice input built from saved flashcards. */
export const SAVED_PRACTICE_INPUT_ID = "saved";

/** Validated request of the practice input query: the translation locale. */
export const gamePracticeInputRequestSchema = z
  .object({ locale: gameLearningContentLocaleSchema.default("th") })
  .strict();

/** Request accepted by the practice input query. */
export type GamePracticeInputRequest = z.input<typeof gamePracticeInputRequestSchema>;

/**
 * Maps a stored student level ("A1-", "A1", "A2+", "B2") to the nearest game level. The games
 * label their evidence with it; it does not select items.
 * @param raw The stored `cefrLevel` of the student.
 * @returns A level of `cefrLevelSchema`; "A1" when the value is unknown.
 */
export function practiceLevelOf(raw: string | undefined): CefrLevel {
  const label = (raw ?? "").trim().replace(/^cefr\s+/iu, "");
  for (const candidate of [label, label.replace(/-$/u, ""), label.replace(/[+-]$/u, "")]) {
    const parsed = cefrLevelSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
  }
  return /^(B2|C1|C2)/u.test(label) ? "B1" : "A1";
}

/** True when two texts are the same apart from case and spaces. */
export const sameText = (a: string, b: string): boolean =>
  a.trim().replace(/\s+/gu, " ").toLowerCase() === b.trim().replace(/\s+/gu, " ").toLowerCase();

/**
 * Splits a saved sentence into the word list the games use.
 * @param raw The stored sentence text.
 * @returns The normalized text and its words, or undefined when it has fewer than two words.
 */
function sentenceWordsOf(raw: unknown): { text: string; words: string[] } | undefined {
  if (typeof raw !== "string") return undefined;
  const words = raw.trim().split(/\s+/u).filter((word) => word.length > 0);
  return words.length >= 2 ? { text: words.join(" "), words } : undefined;
}

/** One saved word as the practice builder reads it: the record id and the stored word record. */
export interface SavedWordRow {
  readonly id: string;
  readonly word: unknown;
}

/** One saved sentence as the practice builder reads it. */
export interface SavedSentenceRow {
  readonly id: string;
  readonly sentence: unknown;
  readonly translation: unknown;
}

/**
 * Builds a practice input from saved rows in their review order. A repeated term or sentence
 * keeps only its first row; a word whose translation repeats the term (an English fallback, which
 * would show the answer) is left out.
 * @param wordRows Saved words, most urgent first.
 * @param sentenceRows Saved sentences, most urgent first.
 * @param locale The translation locale.
 * @param level The game level of the student.
 * @returns A validated practice input with the row ids as item ids.
 */
export function buildPracticeInput(
  wordRows: readonly SavedWordRow[],
  sentenceRows: readonly SavedSentenceRow[],
  locale: z.infer<typeof gameLearningContentLocaleSchema>,
  level: CefrLevel,
): PracticeInput {
  const seenTerms = new Set<string>();
  const vocabulary: PracticeWord[] = [];
  for (const row of wordRows) {
    if (vocabulary.length >= PRACTICE_WORD_LIMIT) break;
    const record = wordRecordSchema.safeParse(row.word);
    if (!record.success) continue;
    const term = record.data.vocabulary.trim();
    const selected = selectTranslation(record.data.definition, locale);
    if (!selected || sameText(selected.translation, term) || seenTerms.has(term.toLowerCase())) continue;
    seenTerms.add(term.toLowerCase());
    vocabulary.push({ id: row.id, term, translation: selected.translation });
  }

  const seenSentences = new Set<string>();
  const sentences: PracticeSentence[] = [];
  for (const row of sentenceRows) {
    if (sentences.length >= PRACTICE_SENTENCE_LIMIT) break;
    const split = sentenceWordsOf(row.sentence);
    if (!split || seenSentences.has(split.text.toLowerCase())) continue;
    seenSentences.add(split.text.toLowerCase());
    const selected = selectTranslation(row.translation, locale);
    const translation = selected && !sameText(selected.translation, split.text) ? selected.translation : undefined;
    sentences.push({
      id: row.id,
      text: split.text,
      words: split.words,
      ...(translation ? { translation } : {}),
    });
  }

  return practiceInputSchema.parse({ schemaVersion: 1, id: SAVED_PRACTICE_INPUT_ID, level, vocabulary, sentences });
}

/**
 * Builds the practice input of the signed-in student from the saved flashcards. The items come
 * in FSRS order: the card nearest to being forgotten (`due` ascending) first, then the newest.
 * A repeated term or sentence keeps only its first card. The games read this state; they do not
 * update it.
 * @param args Authenticated tenant context and the translation locale.
 * @returns A validated practice input with record ids as item ids.
 * @throws When authorization or input validation fails.
 */
export async function listGamePracticeInput({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: GamePracticeInputRequest;
}): Promise<PracticeInput> {
  assertCan(user, "games:read:own", tenant);
  const { locale } = gamePracticeInputRequestSchema.parse(input);
  const rawDb = db.unscoped(
    "userWordRecords and userSentenceRecords are REFERENTIAL; content is scoped by the authenticated userId",
  );

  const wordRows = await rawDb
    .select({ id: userWordRecords.id, word: userWordRecords.word })
    .from(userWordRecords)
    .where(and(eq(userWordRecords.userId, user.id), eq(userWordRecords.saveToFlashcard, true)))
    .orderBy(asc(userWordRecords.due), desc(userWordRecords.createdAt))
    .limit(ROW_LIMIT);
  const sentenceRows = await rawDb
    .select({
      id: userSentenceRecords.id,
      sentence: userSentenceRecords.sentence,
      translation: userSentenceRecords.translation,
    })
    .from(userSentenceRecords)
    .where(and(eq(userSentenceRecords.userId, user.id), eq(userSentenceRecords.saveToFlashcard, true)))
    .orderBy(asc(userSentenceRecords.due), desc(userSentenceRecords.createdAt))
    .limit(ROW_LIMIT);

  return buildPracticeInput(wordRows, sentenceRows, locale, practiceLevelOf(user.cefrLevel));
}
