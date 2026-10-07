import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { assertCan, type Tenant, type UserContext } from "@reading-advantage/auth";
import {
  articles,
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

/** Length of the last item's clip: the reader plays the last word or sentence for ten seconds or to the file end. */
const LAST_ITEM_SECONDS = 10;

/** The sentence translations of `articles.translated_passage`, one array per locale. */
const PASSAGE_LOCALES = ["th", "cn", "tw", "vi"] as const;

const UNSCOPED_REASON = "flashcard decks, cards, progress, and article word rows are REFERENTIAL; every query filters by the authenticated userId";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

const articleWordSchema = z.object({
  vocabulary: z.string(),
  definition: z.unknown(),
  timeSeconds: z.number().finite().nonnegative().optional(),
}).passthrough();

/** A sentence of the snapshot's short list (`sentencs_and_words_for_flashcard.sentence`). */
const listSentenceSchema = z.object({
  sentence: z.string(),
  translation: z.unknown(),
  timeSeconds: z.number().finite().nonnegative().optional(),
}).passthrough();

/** A sentence of the article text (`articles.sentences`): the reader saves these. */
const textSentenceSchema = z.object({
  sentence: z.string(),
  startTime: z.number().finite().nonnegative().optional(),
  endTime: z.number().finite().positive().optional(),
}).passthrough();

/** A segment of an audio file: the word audio, the sentence audio, or the article audio. */
export interface PrimaryWordAudio {
  /** The bucket key of the file (for example `audios/words/<articleId>.mp3`). */
  readonly key: string;
  readonly startSeconds: number;
  readonly endSeconds: number;
}

/** One saved Primary word: the card id, the article's word record, and its audio segment. */
export interface PrimarySavedWord extends SavedWordRow {
  readonly audio?: PrimaryWordAudio;
}

/** One saved card as the reader's flashcard activities show it, with its content from the article. */
export const primaryFlashcardViewSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  type: z.enum(["VOCABULARY", "SENTENCE"]),
  articleId: z.string().nullable(),
  word: z.string().optional(),
  /** Meanings by locale (`en`, `th`, `cn`, `tw`, `vi`); empty when the article has no entry. */
  definition: z.record(z.string()).optional(),
  sentence: z.string().optional(),
  /** Translations by locale (`th`, `cn`, `tw`, `vi`); empty when the article has none. */
  translation: z.record(z.string()).optional(),
  /** The bucket key of the audio file; the client resolves the URL. */
  audioUrl: z.string().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  createdAt: z.date(),
});

/** One saved card as the reader's flashcard activities show it. */
export type PrimaryFlashcardView = z.infer<typeof primaryFlashcardViewSchema>;

/** The deck of a deck view request: a deck of the signed-in student. */
export const primaryDeckCardsRequestSchema = z.object({ deckId: z.string().uuid() });

/** The cards a lesson shows: the student's cards of one type from one article. */
export const primaryArticleCardsRequestSchema = z.object({
  articleId: z.string().min(1),
  type: z.enum(["VOCABULARY", "SENTENCE"]),
});

type Card = { id: string; front: string; sourceId: string | null };
type RawDb = ReturnType<TenantDB["unscoped"]>;

/** The article content that gives a saved card its meaning, translation, and audio. */
interface ArticleContent {
  readonly words: z.infer<typeof articleWordSchema>[];
  readonly wordsUrl: string | null;
  readonly listSentences: z.infer<typeof listSentenceSchema>[];
  readonly audioSentencesUrl: string | null;
  readonly textSentences: z.infer<typeof textSentenceSchema>[];
  readonly translatedPassage: unknown;
  readonly audioUrl: string | null;
}

/** The rows of a JSON array that match the schema; other rows are skipped. */
function rowsOf<T>(schema: z.ZodType<T>, value: unknown): T[] {
  return Array.isArray(value) ? value.flatMap((row) => {
    const parsed = schema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  }) : [];
}

/** The non-empty text values of a locale map; other values are skipped. */
function textsOf(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== ""));
}

/** A segment when the file and both ends are known and the segment is not empty. */
function segmentOf(key: string | null | undefined, start: number | undefined, end: number | undefined): PrimaryWordAudio | undefined {
  return key && start !== undefined && end !== undefined && end > start ? { key, startSeconds: start, endSeconds: end } : undefined;
}

/** The end of an item in a timed list: the start of the next item, or ten seconds after its start. */
function endOf(start: number | undefined, next: number | undefined): number | undefined {
  return next ?? (start === undefined ? undefined : start + LAST_ITEM_SECONDS);
}

/** The student's cards of one deck type, most urgent first: no review yet or the earliest next review. */
function cardsOf(rawDb: RawDb, userId: string, type: "VOCABULARY" | "SENTENCE"): Promise<Card[]> {
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
 * Reads the article content of the cards: the `sentencs_and_words_for_flashcard` row (word list,
 * short sentence list, and their audio) and the `articles` row (sentence text, translations, audio).
 * @param rawDb The unscoped database.
 * @param cards The cards; only a uuid `sourceId` names an article.
 * @returns The content by article id.
 */
async function articleContentOf(rawDb: RawDb, cards: ReadonlyArray<Card>): Promise<Map<string, ArticleContent>> {
  const ids = [...new Set(cards.flatMap((card) => (card.sourceId && UUID.test(card.sourceId) ? [card.sourceId] : [])))];
  if (ids.length === 0) return new Map();
  const [snapshots, texts] = await Promise.all([
    rawDb
      .select({
        articleId: sentencsAndWordsForFlashcards.articleId,
        sentence: sentencsAndWordsForFlashcards.sentence,
        words: sentencsAndWordsForFlashcards.words,
        wordsUrl: sentencsAndWordsForFlashcards.wordsUrl,
        audioSentencesUrl: sentencsAndWordsForFlashcards.audioSentencesUrl,
      })
      .from(sentencsAndWordsForFlashcards)
      .where(inArray(sentencsAndWordsForFlashcards.articleId, ids)),
    rawDb
      .select({ id: articles.id, sentences: articles.sentences, translatedPassage: articles.translatedPassage, audioUrl: articles.audioUrl })
      .from(articles)
      .where(inArray(articles.id, ids)),
  ]);
  const snapshotOf = new Map(snapshots.map((row) => [row.articleId, row]));
  const textOf = new Map(texts.map((row) => [row.id, row]));
  return new Map(ids.map((id) => {
    const snapshot = snapshotOf.get(id);
    const text = textOf.get(id);
    return [id, {
      words: rowsOf(articleWordSchema, snapshot?.words),
      wordsUrl: snapshot?.wordsUrl ?? null,
      listSentences: rowsOf(listSentenceSchema, snapshot?.sentence),
      audioSentencesUrl: snapshot?.audioSentencesUrl ?? null,
      textSentences: rowsOf(textSentenceSchema, text?.sentences),
      translatedPassage: text?.translatedPassage,
      audioUrl: text?.audioUrl ?? null,
    }];
  }));
}

/** The article's word entry of a saved word, with its word audio segment; undefined when the word list has no entry. */
function wordOf(card: Card, content: ArticleContent | undefined): { word: string; definition: unknown; audio?: PrimaryWordAudio } | undefined {
  const entries = content?.words ?? [];
  const index = entries.findIndex((entry) => sameText(entry.vocabulary, card.front));
  const entry = entries[index];
  if (!entry) return undefined;
  const audio = segmentOf(content?.wordsUrl, entry.timeSeconds, endOf(entry.timeSeconds, entries[index + 1]?.timeSeconds));
  return { word: entry.vocabulary, definition: entry.definition, ...(audio ? { audio } : {}) };
}

/**
 * The translation and audio of a saved sentence. The reader saves a sentence of the article text,
 * so the translation is the same line of `translated_passage` and the audio is the article audio.
 * A sentence of the snapshot's short list uses that list. Otherwise the translation is empty.
 */
function sentenceOf(card: Card, content: ArticleContent | undefined): { translation: Record<string, string>; audio?: PrimaryWordAudio } {
  const text = content?.textSentences ?? [];
  const exact = text.findIndex((line) => line.sentence === card.front);
  const index = exact >= 0 ? exact : text.findIndex((line) => sameText(line.sentence, card.front));
  const line = text[index];
  if (content && line) {
    const passage = passageOf(content.translatedPassage);
    const translation = Object.fromEntries(PASSAGE_LOCALES.flatMap((locale) => {
      const value = passage[locale]?.[index];
      return typeof value === "string" && value.trim() ? [[locale, value]] : [];
    }));
    const audio = segmentOf(content.audioUrl, line.startTime, line.endTime);
    return { translation, ...(audio ? { audio } : {}) };
  }
  const list = content?.listSentences ?? [];
  const at = list.findIndex((entry) => sameText(entry.sentence, card.front));
  const entry = list[at];
  if (!entry) return { translation: {} };
  const audio = segmentOf(content?.audioSentencesUrl, entry.timeSeconds, endOf(entry.timeSeconds, list[at + 1]?.timeSeconds));
  return { translation: textsOf(entry.translation), ...(audio ? { audio } : {}) };
}

/** The locale arrays of `translated_passage` (one translation per sentence); other values are skipped. */
function passageOf(value: unknown): Record<string, unknown[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1])));
}

/** The audio fields of a card view. */
const audioFieldsOf = (audio: PrimaryWordAudio | undefined) =>
  (audio ? { audioUrl: audio.key, startTime: audio.startSeconds, endTime: audio.endSeconds } : {});

/** Builds the view of one saved card from its article content. */
function viewOf(card: Card & { deckId: string; createdAt: Date }, type: "VOCABULARY" | "SENTENCE", content: ArticleContent | undefined): PrimaryFlashcardView {
  const base = { id: card.id, deckId: card.deckId, type, articleId: card.sourceId, createdAt: card.createdAt };
  if (type === "VOCABULARY") {
    const word = wordOf(card, content);
    return primaryFlashcardViewSchema.parse({ ...base, word: card.front, definition: textsOf(word?.definition), ...audioFieldsOf(word?.audio) });
  }
  const sentence = sentenceOf(card, content);
  return primaryFlashcardViewSchema.parse({ ...base, sentence: card.front, translation: sentence.translation, ...audioFieldsOf(sentence.audio) });
}

/**
 * Reads the saved words and sentences of a Primary student from the flashcard store the reader
 * writes (`flashcard_decks`, `flashcard_cards`), with each word's meaning and audio time from its
 * article's `sentencs_and_words_for_flashcard` row and each sentence's translation from its article.
 * A word whose article has no matching entry is skipped.
 * @param rawDb The unscoped database; every query filters by the student's id.
 * @param userId The signed-in student.
 * @returns The saved words and sentences, most urgent first.
 */
async function savedItemsOf(rawDb: RawDb, userId: string): Promise<{ words: PrimarySavedWord[]; sentences: SavedSentenceRow[] }> {
  const [wordCards, sentenceCards] = await Promise.all([cardsOf(rawDb, userId, "VOCABULARY"), cardsOf(rawDb, userId, "SENTENCE")]);
  const content = await articleContentOf(rawDb, [...wordCards, ...sentenceCards]);
  const contentOf = (card: Card) => (card.sourceId ? content.get(card.sourceId) : undefined);

  const words = wordCards.flatMap((card): PrimarySavedWord[] => {
    const word = wordOf(card, contentOf(card));
    if (!word) return [];
    return [{ id: card.id, word: { vocabulary: word.word, definition: word.definition }, ...(word.audio ? { audio: word.audio } : {}) }];
  });
  const sentences = sentenceCards.map((card): SavedSentenceRow => ({ id: card.id, sentence: card.front, translation: sentenceOf(card, contentOf(card)).translation }));
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
  const { words, sentences } = await savedItemsOf(db.unscoped(UNSCOPED_REASON), user.id);
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
  const { words } = await savedItemsOf(db.unscoped(UNSCOPED_REASON), user.id);
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

/**
 * Reads one deck of the signed-in student with every card's word or sentence, meaning or
 * translation, and audio segment from its article. The card rows keep only the text and the
 * article id, so the reader's flashcard activities read the rest here.
 * @param args Authenticated tenant context and the deck id.
 * @returns The deck and its cards in card id order, or null when the student has no such deck.
 * @throws When authorization or input validation fails.
 */
export async function listPrimaryDeckCards({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: z.input<typeof primaryDeckCardsRequestSchema>;
}): Promise<{ deck: { id: string; name: string; type: string; description: string | null }; cards: PrimaryFlashcardView[] } | null> {
  assertCan(user, "progress:read:own", tenant);
  const { deckId } = primaryDeckCardsRequestSchema.parse(input);
  const rawDb = db.unscoped(UNSCOPED_REASON);
  const [deck] = await rawDb
    .select({ id: flashcardDecks.id, name: flashcardDecks.name, type: flashcardDecks.type, description: flashcardDecks.description })
    .from(flashcardDecks)
    .where(and(eq(flashcardDecks.id, deckId), eq(flashcardDecks.userId, user.id)))
    .limit(1);
  if (!deck) return null;
  const cards = await rawDb
    .select({ id: flashcardCards.id, deckId: flashcardCards.deckId, front: flashcardCards.front, sourceId: flashcardCards.sourceId, createdAt: flashcardCards.createdAt })
    .from(flashcardCards)
    .where(eq(flashcardCards.deckId, deck.id))
    .orderBy(asc(flashcardCards.id));
  const content = await articleContentOf(rawDb, cards);
  const type = deck.type === "SENTENCE" ? "SENTENCE" : "VOCABULARY";
  return { deck, cards: cards.map((card) => viewOf(card, type, card.sourceId ? content.get(card.sourceId) : undefined)) };
}

/**
 * Reads the signed-in student's saved cards of one type from one article, with the same content
 * as `listPrimaryDeckCards`, for the lesson's flashcard activities.
 * @param args Authenticated tenant context, the article id, and the card type.
 * @returns The cards in card id order; empty when the student has no deck of the type.
 * @throws When authorization or input validation fails.
 */
export async function listPrimaryArticleCards({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: z.input<typeof primaryArticleCardsRequestSchema>;
}): Promise<PrimaryFlashcardView[]> {
  assertCan(user, "progress:read:own", tenant);
  const { articleId, type } = primaryArticleCardsRequestSchema.parse(input);
  const rawDb = db.unscoped(UNSCOPED_REASON);
  const cards = await rawDb
    .select({ id: flashcardCards.id, deckId: flashcardCards.deckId, front: flashcardCards.front, sourceId: flashcardCards.sourceId, createdAt: flashcardCards.createdAt })
    .from(flashcardCards)
    .innerJoin(flashcardDecks, eq(flashcardCards.deckId, flashcardDecks.id))
    .where(and(eq(flashcardDecks.userId, user.id), eq(flashcardDecks.type, type), eq(flashcardCards.sourceId, articleId)))
    .orderBy(asc(flashcardCards.id));
  const content = await articleContentOf(rawDb, cards);
  return cards.map((card) => viewOf(card, type, content.get(articleId)));
}
