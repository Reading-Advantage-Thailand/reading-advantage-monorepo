import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { assertCan, type Tenant, type UserContext } from "@reading-advantage/auth";
import {
  flashcardCards,
  flashcardDecks,
  flashcardProgress,
  sentencsAndWordsForFlashcards,
} from "@reading-advantage/db/schema";
import {
  MAX_LISTENING_SESSION_ITEMS,
  preparedReadToSelectAudioVocabularyResponseSchema,
  type PracticeInput,
  type PreparedReadToSelectAudioVocabularyResponse,
} from "@reading-advantage/game-contracts";
import { z } from "zod";

import type { TenantDB } from "../db-contract.js";
import { selectTranslation, wordRecordSchema } from "./learning-content.js";
import {
  buildPracticeInput,
  gamePracticeInputRequestSchema,
  practiceLevelOf,
  sameText,
  type GamePracticeInputRequest,
  type SavedSentenceRow,
  type SavedWordRow,
} from "./practice-input.js";

/** Cards read per deck: room to skip cards whose article has no word or sentence entry. */
const CARD_LIMIT = 50;

/** Length of the last word's clip: the reader plays the last word for ten seconds or to the file end. */
const LAST_WORD_SECONDS = 10;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

const articleWordSchema = z.object({
  vocabulary: z.string(),
  definition: z.unknown(),
  timeSeconds: z.number().finite().nonnegative().optional(),
}).passthrough();

const articleSentenceSchema = z.object({
  sentence: z.string(),
  translation: z.unknown(),
}).passthrough();

/** The word audio of one saved word: a segment of its article's word audio file. */
export interface PrimaryWordAudio {
  /** The bucket key of the article's word audio (`audios/words/<articleId>.mp3`). */
  readonly key: string;
  readonly startSeconds: number;
  readonly endSeconds: number;
}

/** One saved Primary word: the card id, the article's word record, and its audio segment. */
export interface PrimarySavedWord extends SavedWordRow {
  readonly audio?: PrimaryWordAudio;
}

type Card = { id: string; front: string; sourceId: string | null };

/** The rows of a JSON array that match the schema; other rows are skipped. */
function rowsOf<T>(schema: z.ZodType<T>, value: unknown): T[] {
  return Array.isArray(value) ? value.flatMap((row) => {
    const parsed = schema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  }) : [];
}

/** The student's cards of one deck type, most urgent first: no review yet or the earliest next review. */
function cardsOf(rawDb: ReturnType<TenantDB["unscoped"]>, userId: string, type: "VOCABULARY" | "SENTENCE"): Promise<Card[]> {
  return rawDb
    .select({ id: flashcardCards.id, front: flashcardCards.front, sourceId: flashcardCards.sourceId })
    .from(flashcardCards)
    .innerJoin(flashcardDecks, eq(flashcardCards.deckId, flashcardDecks.id))
    .leftJoin(flashcardProgress, and(eq(flashcardProgress.cardId, flashcardCards.id), eq(flashcardProgress.userId, userId)))
    .where(and(eq(flashcardDecks.userId, userId), eq(flashcardDecks.type, type)))
    .orderBy(asc(sql`coalesce(${flashcardProgress.nextReviewAt}, ${flashcardCards.createdAt})`), desc(flashcardCards.createdAt))
    .limit(CARD_LIMIT);
}

/**
 * Reads the saved words and sentences of a Primary student from the flashcard store the reader
 * writes (`flashcard_decks`, `flashcard_cards`), with each card's translation and word audio time
 * from its article's `sentencs_and_words_for_flashcard` row. A card whose article has no matching
 * entry is skipped.
 * @param rawDb The unscoped database; every query filters by the student's id.
 * @param userId The signed-in student.
 * @returns The saved words and sentences, most urgent first.
 */
async function savedItemsOf(rawDb: ReturnType<TenantDB["unscoped"]>, userId: string): Promise<{ words: PrimarySavedWord[]; sentences: SavedSentenceRow[] }> {
  const [wordCards, sentenceCards] = await Promise.all([cardsOf(rawDb, userId, "VOCABULARY"), cardsOf(rawDb, userId, "SENTENCE")]);
  const articleIds = [...new Set([...wordCards, ...sentenceCards].flatMap((card) => (card.sourceId && UUID.test(card.sourceId) ? [card.sourceId] : [])))];
  const snapshots = articleIds.length === 0 ? [] : await rawDb
    .select({
      articleId: sentencsAndWordsForFlashcards.articleId,
      sentence: sentencsAndWordsForFlashcards.sentence,
      words: sentencsAndWordsForFlashcards.words,
      wordsUrl: sentencsAndWordsForFlashcards.wordsUrl,
    })
    .from(sentencsAndWordsForFlashcards)
    .where(inArray(sentencsAndWordsForFlashcards.articleId, articleIds));
  const byArticle = new Map(snapshots.map((row) => [row.articleId, row]));

  const words = wordCards.flatMap((card): PrimarySavedWord[] => {
    const snapshot = card.sourceId ? byArticle.get(card.sourceId) : undefined;
    const entries = rowsOf(articleWordSchema, snapshot?.words);
    const index = entries.findIndex((entry) => sameText(entry.vocabulary, card.front));
    const entry = entries[index];
    if (!entry) return [];
    const start = entry.timeSeconds;
    const end = entries[index + 1]?.timeSeconds ?? (start === undefined ? undefined : start + LAST_WORD_SECONDS);
    const audio = snapshot?.wordsUrl && start !== undefined && end !== undefined && end > start
      ? { key: snapshot.wordsUrl, startSeconds: start, endSeconds: end }
      : undefined;
    return [{ id: card.id, word: { vocabulary: entry.vocabulary, definition: entry.definition }, ...(audio ? { audio } : {}) }];
  });

  const sentences = sentenceCards.map((card): SavedSentenceRow => {
    const snapshot = card.sourceId ? byArticle.get(card.sourceId) : undefined;
    const entry = rowsOf(articleSentenceSchema, snapshot?.sentence).find((row) => sameText(row.sentence, card.front));
    return { id: card.id, sentence: card.front, translation: entry?.translation ?? {} };
  });

  return { words, sentences };
}

/**
 * Builds the practice input of a signed-in Primary student from the words and sentences the
 * student saved while reading. Reading Advantage keeps `listGamePracticeInput`.
 * @param args Authenticated tenant context and the translation locale.
 * @returns A validated practice input with the card ids as item ids.
 * @throws When authorization or input validation fails.
 */
export async function listPrimaryPracticeInput({
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
  const rawDb = db.unscoped("flashcard decks, cards, progress, and article word rows are REFERENTIAL; every query filters by the authenticated userId");
  const { words, sentences } = await savedItemsOf(rawDb, user.id);
  return buildPracticeInput(words, sentences, locale, practiceLevelOf(user.cefrLevel));
}

/**
 * Builds the English answer audio content of a signed-in Primary student: the saved words that
 * have a Thai translation and a word audio segment, each with its clip from the article's word
 * audio file. No recording or manifest is needed.
 * @param args Authenticated tenant context, and the public URL of a bucket key.
 * @returns The prepared response, or undefined when no saved word has a Thai meaning and audio.
 * @throws When authorization fails.
 */
export async function listPrimaryAnswerAudioContent({
  db,
  user,
  tenant,
  audioUrlOf,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  audioUrlOf: (key: string) => string;
}): Promise<PreparedReadToSelectAudioVocabularyResponse | undefined> {
  assertCan(user, "games:read:own", tenant);
  const rawDb = db.unscoped("flashcard decks, cards, progress, and article word rows are REFERENTIAL; every query filters by the authenticated userId");
  const { words } = await savedItemsOf(rawDb, user.id);
  const seen = new Set<string>();
  const content: { term: string; translation: string }[] = [];
  const clips: { itemPosition: number; url: string; mediaType: "audio/mpeg"; sourceLocale: "en-US"; startSeconds: number; endSeconds: number }[] = [];
  for (const { word, audio } of words) {
    if (content.length >= MAX_LISTENING_SESSION_ITEMS) break;
    const record = wordRecordSchema.safeParse(word);
    if (!audio || !record.success) continue;
    const term = record.data.vocabulary.trim();
    const selected = selectTranslation(record.data.definition, "th");
    if (selected?.locale !== "th" || sameText(selected.translation, term) || seen.has(term.toLowerCase())) continue;
    seen.add(term.toLowerCase());
    clips.push({ itemPosition: content.length, url: audioUrlOf(audio.key), mediaType: "audio/mpeg", sourceLocale: "en-US", startSeconds: audio.startSeconds, endSeconds: audio.endSeconds });
    content.push({ term, translation: selected.translation });
  }
  if (content.length === 0) return undefined;
  return preparedReadToSelectAudioVocabularyResponseSchema.parse({
    mode: "vocabulary",
    source: "student-flashcards",
    requestedTargetLocale: "th",
    selectedTargetLocales: content.map(() => "th"),
    content,
    answerAudioSession: { modality: "read-to-select-audio", promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", scored: true },
    preparedAnswerAudio: { clips },
  });
}
