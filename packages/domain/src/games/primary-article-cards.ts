import { and, eq, inArray } from "drizzle-orm";
import { AuthError, type Tenant, type UserContext } from "@reading-advantage/auth";
import {
  articleActivityLogs,
  flashcardCards,
  flashcardDecks,
  sentencsAndWordsForFlashcards,
} from "@reading-advantage/db/schema";
import { z } from "zod";

import type { TenantDB } from "../db-contract.js";

const UNSCOPED_REASON =
  "flashcard decks, cards, article activity logs, and article word rows are REFERENTIAL; every query filters by the authenticated user_id";

/** Fewest and most words that the legacy rule saves after the three quizzes. */
const MIN_WORDS = 3;
const MAX_WORDS = 5;

/** The article of a save request. */
export const saveArticleCardsInputSchema = z.object({ articleId: z.string().uuid() });

/** What a save created. `alreadySaved` is true when the student had the cards or the log mark before. */
export const saveArticleCardsOutputSchema = z.object({
  wordsCreated: z.number().int().nonnegative(),
  sentencesCreated: z.number().int().nonnegative(),
  alreadySaved: z.boolean(),
});

/** The article of a state request. */
export const articleCardStateInputSchema = saveArticleCardsInputSchema;

/** The "saved" state of an article for the signed-in student. */
export const articleCardStateOutputSchema = z.object({ saved: z.boolean() });

/** Parsed save request. */
export type SaveArticleCardsInput = z.infer<typeof saveArticleCardsInputSchema>;
/** Result of a save. */
export type SaveArticleCardsOutput = z.infer<typeof saveArticleCardsOutputSchema>;
/** Result of a state read. */
export type ArticleCardState = z.infer<typeof articleCardStateOutputSchema>;

/** The text values of a snapshot JSON array (`vocabulary` for words, `sentence` for sentences). */
function textsOf(value: unknown, key: "vocabulary" | "sentence"): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const text = row && typeof row === "object" ? (row as Record<string, unknown>)[key] : undefined;
    return typeof text === "string" && text.trim() !== "" ? [text] : [];
  });
}

/** Fisher-Yates shuffle that takes its random numbers from `random`. */
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * Saves cards of an article to the student's decks by the legacy rule. The save runs when the
 * student finished the multiple-choice, short-answer, and long-answer questions of the article.
 * It saves 3 to 5 random words that the vocabulary deck does not hold (case-insensitive, any article),
 * and all sentences, each kind only when the deck has no card of this article yet.
 * Then it marks the article log as saved. All writes run in one transaction.
 * @param args The authenticated TenantDB, user, and tenant; the article; an optional random function (fixed in tests).
 * @returns How many cards the call created, and whether the article was saved before.
 * @throws {AuthError} When the user is not a STUDENT (the staff view saves nothing).
 */
export async function saveArticleCardsAfterQuiz({
  db,
  user,
  input,
  random = Math.random,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: SaveArticleCardsInput;
  random?: () => number;
}): Promise<SaveArticleCardsOutput> {
  if (user.role !== "STUDENT") throw new AuthError("Only students save article cards", "FORBIDDEN");
  const { articleId } = saveArticleCardsInputSchema.parse(input);

  const result = await db.unscoped(UNSCOPED_REASON).transaction(async (tx) => {
    const [log] = await tx
      .select()
      .from(articleActivityLogs)
      .where(and(eq(articleActivityLogs.userId, user.id), eq(articleActivityLogs.articleId, articleId)))
      .limit(1);
    const quizzesDone = Boolean(
      log?.isMultipleChoiceQuestionCompleted && log.isShortAnswerQuestionCompleted && log.isLongAnswerQuestionCompleted,
    );
    if (!log || !quizzesDone) return { wordsCreated: 0, sentencesCreated: 0, alreadySaved: false };
    if (log.isSentenceAndWordsSaved) return { wordsCreated: 0, sentencesCreated: 0, alreadySaved: true };

    const [snapshot] = await tx
      .select()
      .from(sentencsAndWordsForFlashcards)
      .where(eq(sentencsAndWordsForFlashcards.articleId, articleId))
      .limit(1);
    const words = textsOf(snapshot?.words, "vocabulary");
    const sentences = textsOf(snapshot?.sentence, "sentence");

    const decks = await tx.select().from(flashcardDecks).where(eq(flashcardDecks.userId, user.id));
    const deckOf = async (type: "VOCABULARY" | "SENTENCE") => {
      const existing = decks.find((deck) => deck.type === type);
      if (existing) return existing.id;
      const [created] = await tx
        .insert(flashcardDecks)
        .values({ userId: user.id, name: `${type === "VOCABULARY" ? "Vocabulary" : "Sentence"} Deck`, type })
        .returning();
      if (!created) throw new Error("Failed to create deck");
      return created.id;
    };

    const deckIds = decks.map((deck) => deck.id);
    const cards = deckIds.length
      ? await tx
          .select({ deckId: flashcardCards.deckId, front: flashcardCards.front, sourceId: flashcardCards.sourceId })
          .from(flashcardCards)
          .where(inArray(flashcardCards.deckId, deckIds))
      : [];
    const typeOfDeck = new Map(decks.map((deck) => [deck.id, deck.type]));
    const ofType = (type: "VOCABULARY" | "SENTENCE") => cards.filter((card) => typeOfDeck.get(card.deckId) === type);
    const vocabCards = ofType("VOCABULARY");
    const sentenceCards = ofType("SENTENCE");

    const hasWordsOfArticle = vocabCards.some((card) => card.sourceId === articleId);
    const hasSentencesOfArticle = sentenceCards.some((card) => card.sourceId === articleId);

    let wordsToSave: string[] = [];
    if (!hasWordsOfArticle && words.length > 0) {
      const known = new Set(vocabCards.map((card) => card.front.trim().toLowerCase()));
      const candidates = [...new Map(words.map((word) => [word.trim().toLowerCase(), word])).values()].filter(
        (word) => !known.has(word.trim().toLowerCase()),
      );
      const count = MIN_WORDS + Math.floor(random() * (MAX_WORDS - MIN_WORDS + 1));
      wordsToSave = shuffled(candidates, random).slice(0, count);
    }
    const sentencesToSave = !hasSentencesOfArticle ? sentences : [];

    if (wordsToSave.length > 0) {
      const deckId = await deckOf("VOCABULARY");
      await tx.insert(flashcardCards).values(wordsToSave.map((word) => ({ deckId, sourceId: articleId, front: word, back: word })));
    }
    if (sentencesToSave.length > 0) {
      const deckId = await deckOf("SENTENCE");
      await tx
        .insert(flashcardCards)
        .values(sentencesToSave.map((sentence) => ({ deckId, sourceId: articleId, front: sentence, back: sentence })));
    }
    await tx
      .update(articleActivityLogs)
      .set({ isSentenceAndWordsSaved: true })
      .where(and(eq(articleActivityLogs.id, log.id), eq(articleActivityLogs.userId, user.id)));

    return {
      wordsCreated: wordsToSave.length,
      sentencesCreated: sentencesToSave.length,
      alreadySaved: wordsToSave.length === 0 && sentencesToSave.length === 0,
    };
  });
  return saveArticleCardsOutputSchema.parse(result);
}

/**
 * Tells whether the student has the cards of an article. The state is true when the student's
 * article log is marked saved, or a deck of the student holds a card of the article.
 * @param args The authenticated TenantDB and user, and the article.
 * @returns `{ saved }` for the student only; another user's log never counts.
 */
export async function getArticleCardState({
  db,
  user,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: SaveArticleCardsInput;
}): Promise<ArticleCardState> {
  const { articleId } = articleCardStateInputSchema.parse(input);
  const rawDb = db.unscoped(UNSCOPED_REASON);
  const [log] = await rawDb
    .select({ saved: articleActivityLogs.isSentenceAndWordsSaved })
    .from(articleActivityLogs)
    .where(and(eq(articleActivityLogs.userId, user.id), eq(articleActivityLogs.articleId, articleId)))
    .limit(1);
  if (log?.saved) return { saved: true };
  const [card] = await rawDb
    .select({ id: flashcardCards.id })
    .from(flashcardCards)
    .innerJoin(flashcardDecks, eq(flashcardCards.deckId, flashcardDecks.id))
    .where(and(eq(flashcardDecks.userId, user.id), eq(flashcardCards.sourceId, articleId)))
    .limit(1);
  return articleCardStateOutputSchema.parse({ saved: Boolean(card) });
}
