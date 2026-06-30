"use server";

import { currentUser } from "@/lib/session";
import { createEmptyCard, Card, Rating } from "ts-fsrs";
import {
  db,
  eq,
  and,
  desc,
  asc,
  sql,
  count,
  gte,
  sum,
} from "@reading-advantage/db";
import {
  flashcardDecks,
  flashcardCards,
  cardReviews,
  userActivity,
  xpLogs,
  articles,
  articleActivityLogs,
  sentencsAndWordsForFlashcards,
  flashcardProgress,
} from "@reading-advantage/db";
import { ActivityType, FlashcardType } from "@/types/enum";
import { fsrsService } from "@/lib/fsrs-service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getAudioUrl } from "@/lib/storage-config";

function tokenizeSentence(input: string) {
  // Split by spaces and filter out empty strings, while preserving punctuation
  const tokens = input
    .split(/(\s+)/)
    .filter((token) => token.trim().length > 0)
    .map((token) => token.trim());

  return tokens;
}

function getPartOfSpeech(
  inputWord: string,
  position: number,
  totalWords: number,
): string {
  const cleanWord = inputWord.toLowerCase().replace(/[^\w]/g, "");

  // Common articles
  if (["a", "an", "the"].includes(cleanWord)) return "article";

  // Common prepositions
  if (
    [
      "in",
      "on",
      "at",
      "by",
      "for",
      "with",
      "to",
      "from",
      "of",
      "about",
      "under",
      "over",
    ].includes(cleanWord)
  )
    return "preposition";

  // Common conjunctions
  if (["and", "but", "or", "so", "yet", "for", "nor"].includes(cleanWord))
    return "conjunction";

  // Common pronouns
  if (
    [
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "me",
      "him",
      "her",
      "us",
      "them",
    ].includes(cleanWord)
  )
    return "pronoun";

  // Common verbs (simplified detection)
  if (
    [
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "can",
      "could",
      "should",
      "may",
      "might",
    ].includes(cleanWord)
  )
    return "verb";

  // If it ends with common verb suffixes
  if (
    cleanWord.endsWith("ed") ||
    cleanWord.endsWith("ing") ||
    cleanWord.endsWith("s")
  )
    return "verb";

  // If it ends with common adjective suffixes
  if (cleanWord.endsWith("ly")) return "adverb";
  if (
    cleanWord.endsWith("ful") ||
    cleanWord.endsWith("less") ||
    cleanWord.endsWith("ive") ||
    cleanWord.endsWith("able")
  )
    return "adjective";

  // Position-based heuristics
  if (position === 0) return "noun"; // First word often a noun or pronoun
  if (position === totalWords - 1 && inputWord.includes(".")) return "noun"; // Last word often a noun

  return "noun"; // Default to noun
}

interface WordList {
  vocabulary: string;
  cardDefinition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  cardStartTime: number;
  cardEndTime: number;
  cardAudioUrl: string;
}

interface SentenceEntry {
  cardSentence: string;
  cardTranslation: {
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  timeSeconds?: number;
  cardAudioUrl: string;
  cardStartTime: number;
  cardEndTime: number;
}

/**
 * Save a new flashcard deck (or reuse the existing deck) and bulk-insert
 * flashcard rows for the provided words or sentences.
 *
 * Shared-schema contract:
 *   The shared `flashcardCards` table only exposes id/deckId/front/back/
 *   sourceId/order/createdAt. This function writes ONLY those columns and
 *   does not rely on any shared-partial column. Auxiliary content
 *   (audio timing, translations, definitions) is recovered at read time
 *   from `sentencs_and_words_for_flashcard` joined on `articles`.
 */
export async function saveFlashcard(
  sourceArticleId: string,
  words?: WordList[],
  sentences?: SentenceEntry[],
) {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        status: 401,
        message: "Unauthorized",
      };
    }

    // Validate input
    if (!words?.length && !sentences?.length) {
      return {
        status: 400,
        message: "No words or sentences provided",
      };
    }

    const deckKind = words?.length ? "VOCABULARY" : "SENTENCE";
    const items = words?.length ? words : sentences || [];

    // Stitch Prisma's `include: { cards: true }` shape manually: fetch deck
    // first, then fetch its cards as a separate query.
    const [existingDeck] = await db.select().from(flashcardDecks)
      .where(
        and(
          eq(flashcardDecks.userId, user.id as string),
          eq(flashcardDecks.type, deckKind as string),
        ),
      )
      .limit(1);

    let deck: typeof existingDeck & { id: string };
    if (!existingDeck) {
      const [createdDeck] = await db.insert(flashcardDecks).values({
        userId: user.id as string,
        name: `${deckKind === "VOCABULARY" ? "Vocabulary" : "Sentence"} Deck`,
        kind: deckKind as string,
      }).returning();
      deck = createdDeck;
    } else {
      deck = existingDeck;
    }

    // Fetch existing cards to dedupe (replaces Prisma `include.cards` filter).
    const existingCards = await db.select().from(flashcardCards)
      .where(eq(flashcardCards.deckId, deck.id));

    // Check for existing cards to avoid duplicates based on articleId and
    // word/sentence text.
    const filteredCards = existingCards.filter(
      (card) => card.sourceId === sourceArticleId,
    );

    const existingWords = filteredCards.map((card) =>
      deckKind === "VOCABULARY" ? card.front : card.back,
    );

    const newItems =
      deckKind === "VOCABULARY"
        ? items.filter((item) => {
            const wordItem = item as WordList;
            return !existingWords.includes(wordItem.vocabulary);
          })
        : items.filter((item) => {
            const sentenceItem = item as SentenceEntry;
            return !existingWords.includes(sentenceItem.cardSentence);
          });

    if (newItems.length === 0) {
      return {
        status: 400,
        message: "All selected items are already saved as flashcards",
      };
    }

    // Build schema-valid rows only. Auxiliary content is reconstructed at
    // read time from the article snapshot table.
    const cardRows = newItems.map((item) => {
      if (deckKind === "VOCABULARY") {
        const wordItem = item as WordList;
        return {
          deckId: deck.id,
          sourceId: sourceArticleId,
          front: wordItem.vocabulary,
          back: wordItem.vocabulary,
        };
      } else {
        const sentenceItem = item as SentenceEntry;
        return {
          deckId: deck.id,
          sourceId: sourceArticleId,
          front: sentenceItem.cardSentence,
          back: sentenceItem.cardSentence,
        };
      }
    });

    // `createMany` equivalent: parallel `insert(...).values(...)` calls.
    await Promise.all(
      cardRows.map((data) => db.insert(flashcardCards).values(data)),
    );

    return {
      status: 200,
      message: `Successfully saved ${newItems.length} ${deckKind.toLowerCase()} flashcard${newItems.length > 1 ? "s" : ""}`,
      data: {
        deckId: deck.id,
        cardsCreated: newItems.length,
        totalCards: existingCards.length + newItems.length,
      },
    };
  } catch (error) {
    console.error("Error saving flashcards:", error);
    return {
      status: 500,
      message: "Failed to save flashcards. Please try again.",
    };
  }
}

export async function getUserFlashcardDecks(userId?: string) {
  try {
    const user = userId ? { id: userId } : await currentUser();

    if (!user) {
      return {
        status: 401,
        message: "Unauthorized",
        data: [],
      };
    }

    // Stitch Prisma's `include: { cards: { where }, _count }` shape manually.
    const deckRows = await db.select().from(flashcardDecks)
      .where(eq(flashcardDecks.userId, user.id as string))
      .orderBy(desc(flashcardDecks.updatedAt));

    const decks = await Promise.all(
      deckRows.map(async (deck) => {
        // Total card count for the deck.
        const [countRow] = await db.select({ value: count() })
          .from(flashcardCards)
          .where(eq(flashcardCards.deckId, deck.id));

        return {
          ...deck,
          _count: { cards: Number(countRow?.value ?? 0) },
        };
      }),
    );

    return {
      status: 200,
      data: decks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        kind: deck.type,
        totalCards: deck._count.cards,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
      })),
    };
  } catch (error) {
    console.error("Error fetching flashcard decks:", error);
    return {
      status: 500,
      message: "Failed to fetch flashcard decks",
      data: [],
    };
  }
}

export async function getDashboardData(deckKind?: "VOCABULARY" | "SENTENCE") {
  try {
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: "Unauthorized",
        decks: [],
        stats: null,
      };
    }

    // Build where clause with optional type filter
    const whereConditions = [eq(flashcardDecks.userId, user.id as string)];
    if (deckKind) {
      whereConditions.push(eq(flashcardDecks.type, deckKind));
    }

    // Fetch user's flashcard decks with optional type filter
    const deckRows = await db.select().from(flashcardDecks)
      .where(and(...whereConditions))
      .orderBy(desc(flashcardDecks.updatedAt));

    const decks = await Promise.all(
      deckRows.map(async (deck) => {
        const [countRow] = await db.select({ value: count() })
          .from(flashcardCards)
          .where(eq(flashcardCards.deckId, deck.id));

        return {
          ...deck,
          _count: { cards: Number(countRow?.value ?? 0) },
        };
      }),
    );

    // Calculate user statistics (filter by type if specified)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activityTypeFilter = deckKind
      ? [
          deckKind === "VOCABULARY"
            ? ActivityType.VOCABULARY_FLASHCARDS
            : ActivityType.SENTENCE_FLASHCARDS,
        ]
      : [ActivityType.VOCABULARY_FLASHCARDS, ActivityType.SENTENCE_FLASHCARDS];

    const [todayActivityRow, totalXPRow] = await Promise.all([
      db.select({ value: count() })
        .from(userActivity)
        .where(
          and(
            eq(userActivity.userId, user.id as string),
            gte(userActivity.createdAt, today),
            sql`${userActivity.activityType} = ANY(${activityTypeFilter})`,
          ),
        ),
      db.select({ value: sum(xpLogs.xpEarned) })
        .from(xpLogs)
        .where(
          and(
            eq(xpLogs.userId, user.id as string),
            sql`${xpLogs.activityType} = ANY(${activityTypeFilter})`,
          ),
        ),
    ]);

    const todayActivity = Number(todayActivityRow[0]?.value ?? 0);
    const totalXP = Number(totalXPRow[0]?.value ?? 0);

    const stats = {
      totalDecks: decks.length,
      totalCards: decks.reduce(
        (sum, deck) => sum + deck._count.cards,
        0,
      ),
      cardsStudiedToday: todayActivity,
      xpEarned: totalXP,
      streakDays: 0, // TODO: Calculate streak
    };

    return {
      success: true,
      decks: decks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        kind: deck.type,
        totalCards: deck._count.cards,
        createdAt: deck.createdAt.toISOString(),
        updatedAt: deck.updatedAt.toISOString(),
      })),
      stats,
      deckKind,
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      success: false,
      error: "Failed to fetch dashboard data",
      decks: [],
      stats: null,
    };
  }
}

export async function getDeckCards(deckId: string) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Fetch deck (verify ownership in the where clause).
    const [deck] = await db.select().from(flashcardDecks)
      .where(
        and(
          eq(flashcardDecks.id, deckId),
          eq(flashcardDecks.userId, user.id as string),
        ),
      )
      .limit(1);

    if (!deck) {
      throw new Error("Deck not found");
    }

    const cards = await db.select().from(flashcardCards)
      .where(eq(flashcardCards.deckId, deck.id))
      .orderBy(asc(flashcardCards.id));

    return {
      success: true,
      deck: {
        id: deck.id,
        name: deck.name,
        kind: deck.type,
        description: deck.description,
      },
      cards,
    };
  } catch (error) {
    console.error("Error fetching deck cards:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      deck: null,
      cards: [],
    };
  }
}

export async function getAllSentenceCards() {
  try {
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: "Unauthorized",
        cards: [],
      };
    }

    const [deck] = await db.select().from(flashcardDecks)
      .where(
        and(
          eq(flashcardDecks.userId, user.id as string),
          eq(flashcardDecks.type, FlashcardType.SENTENCE),
        ),
      )
      .limit(1);

    if (!deck) {
      return {
        success: true,
        cards: [],
      };
    }

    const cards = await db.select().from(flashcardCards)
      .where(eq(flashcardCards.deckId, deck.id));

    return {
      success: true,
      cards,
    };
  } catch (error) {
    console.error("Error in getAllSentenceCards:", error);
    return {
      success: false,
      error: "Failed to fetch sentence cards",
      cards: [],
    };
  }
}

export async function deleteFlashcardCard(cardId: string) {
  try {
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (!cardId) {
      return {
        success: false,
        error: "Card ID is required",
      };
    }

    // Verify the card belongs to the user before deleting.
    // Replaces Prisma's nested `deck: { userId }` filter with a join.
    const [card] = await db.select({ id: flashcardCards.id })
      .from(flashcardCards)
      .innerJoin(flashcardDecks, eq(flashcardDecks.id, flashcardCards.deckId))
      .where(
        and(
          eq(flashcardCards.id, cardId),
          eq(flashcardDecks.userId, user.id as string),
        ),
      )
      .limit(1);

    if (!card) {
      return {
        success: false,
        error: "Card not found or unauthorized",
      };
    }

    await db.delete(flashcardCards)
      .where(eq(flashcardCards.id, cardId));

    revalidatePath("/student/sentences");

    return {
      success: true,
      message: "Card deleted successfully",
    };
  } catch (error) {
    console.error("Error in deleteFlashcardCard:", error);
    return {
      success: false,
      error: "Failed to delete card",
    };
  }
}

/**
 * Process a flashcard review event.
 *
 * FSRS scheduler state is persisted in `flashcard_progress` (which owns
 * lastReviewedAt/nextReviewAt/correctCount/incorrectCount) so the shared
 * `flashcardCards` row remains schema-valid. The `card_reviews` table
 * continues to record the rating + time-spent history for analytics.
 */
export async function reviewCard(
  cardId: string,
  rating: Rating,
  timeSpent?: number,
) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Validate rating
    if (
      ![Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].includes(rating)
    ) {
      throw new Error("Invalid rating");
    }

    // Get the card with deck ownership check. Replaces Prisma's nested
    // `include: { deck: true }` filter via a join.
    const [cardRow] = await db.select({
      card: flashcardCards,
      deck: flashcardDecks,
    })
      .from(flashcardCards)
      .innerJoin(flashcardDecks, eq(flashcardDecks.id, flashcardCards.deckId))
      .where(
        and(
          eq(flashcardCards.id, cardId),
          eq(flashcardDecks.userId, user.id as string),
        ),
      )
      .limit(1);

    if (!cardRow) {
      throw new Error("Card not found");
    }

    const now = new Date();

    // Read or initialize the per-user FSRS progress row.
    const [progress] = await db.select().from(flashcardProgress)
      .where(
        and(
          eq(flashcardProgress.userId, user.id as string),
          eq(flashcardProgress.cardId, cardId),
        ),
      )
      .limit(1);

    // Compute the next FSRS state in-memory. We seed the scheduler with the
    // persisted progress values (or defaults) so the algorithm has the
    // history it needs without requiring a shared-partial column on
    // `flashcardCards`.
    const emptyCard: Card = createEmptyCard();
    const seedCard = {
      ...emptyCard,
      cardDue: progress?.nextReviewAt ?? emptyCard.due,
      cardLastReview: progress?.lastReviewedAt ?? emptyCard.last_review,
      cardReps: progress?.correctCount ?? 0,
      cardLapses: progress?.incorrectCount ?? 0,
    };
    const { updatedCard } = fsrsService.processReview(
      seedCard,
      rating,
      now,
    );

    const isCorrect = rating === Rating.Good || rating === Rating.Easy;
    const correctIncrement = isCorrect ? 1 : 0;
    const incorrectIncrement = isCorrect ? 0 : 1;

    // Persist progress + review log inside a single transaction.
    await db.transaction(async (tx) => {
      if (progress) {
        await tx.update(flashcardProgress)
          .set({
            lastReviewedAt: updatedCard.last_review,
            nextReviewAt: updatedCard.due,
            correctCount: (progress.correctCount ?? 0) + correctIncrement,
            incorrectCount: (progress.incorrectCount ?? 0) + incorrectIncrement,
            updatedAt: now,
          })
          .where(eq(flashcardProgress.id, progress.id));
      } else {
        await tx.insert(flashcardProgress).values({
          userId: user.id as string,
          cardId,
          lastReviewedAt: updatedCard.last_review,
          nextReviewAt: updatedCard.due,
          correctCount: correctIncrement,
          incorrectCount: incorrectIncrement,
        });
      }

      await tx.insert(cardReviews).values({
        cardId,
        rating,
        timeSpent: timeSpent || 30,
        reviewedAt: now,
      });
    });

    return {
      success: true,
      cardId,
      nextReviewAt: updatedCard.due,
      lastReviewedAt: updatedCard.last_review,
    };
  } catch (error) {
    console.error("Error processing card review:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function saveArticleToFlashcard(
  sourceArticleId: string,
  ArticleActivityLogId?: string,
) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Fetch article + sentences/words snapshot. Replaces Prisma's
    // `include: { sentencsAndWordsForFlashcard: true }` with a separate
    // query on `sentencs_and_words_for_flashcard`.
    const [article] = await db.select().from(articles)
      .where(eq(articles.id, sourceArticleId))
      .limit(1);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const sentRows = await db.select().from(sentencsAndWordsForFlashcards)
      .where(eq(sentencsAndWordsForFlashcards.articleId, sourceArticleId));

    const sentencsAndWords = sentRows;

    const wordlist: WordList[] = [];
    const sentencesList: SentenceEntry[] = [];

    const wordsList = sentencsAndWords.flatMap(
      (word) => word.words as unknown as WordListTimestamp[],
    );

    const sentences = sentencsAndWords.flatMap(
      (sentence) => sentence.sentence as unknown as SentenceEntry[],
    );

    wordsList.forEach((word, index) => {
      const wordStartTime = word?.timeSeconds as number;
      const wordEndTime =
        index === wordsList.length - 1
          ? (word?.timeSeconds as number) + 10
          : (wordsList[index + 1].timeSeconds as number);

      wordlist.push({
        vocabulary: word?.vocabulary,
        cardDefinition: word?.definition,
        cardStartTime: wordStartTime,
        cardEndTime: wordEndTime,
        cardAudioUrl: sentencsAndWords[0]?.wordsUrl as string,
      });
    });

    sentences.forEach((sentence, index) => {
      const sentenceStartTime = sentence?.timeSeconds as number;
      const sentenceEndTime =
        index === sentences.length - 1
          ? (sentence?.timeSeconds as number) + 10
          : (sentences[index + 1].timeSeconds as number);

      sentencesList.push({
        cardSentence: sentence?.cardSentence,
        cardTranslation: sentence?.cardTranslation,
        cardStartTime: sentenceStartTime,
        cardEndTime: sentenceEndTime,
        cardAudioUrl: sentencsAndWords[0]?.audioSentencesUrl as string,
      });
    });

    await Promise.all([
      saveFlashcard(sourceArticleId, wordlist),
      saveFlashcard(sourceArticleId, [], sentencesList),
    ]);

    if (ArticleActivityLogId) {
      await db.update(articleActivityLogs)
        .set({ isSentenceAndWordsSaved: true })
        .where(eq(articleActivityLogs.id, ArticleActivityLogId));
    }

    return {
      success: true,
      message: "Article saved to flashcard successfully",
    };
  } catch (error) {
    console.error("Error saving article to flashcard:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Helper: load the article snapshot used to derive audio timing and
 * translations for a flashcard. Card rows only carry front/back/sourceId;
 * everything else comes from the article's snapshot row.
 */
async function loadArticleSnapshot(sourceArticleId: string) {
  const [article] = await db.select({
    id: articles.id,
    title: articles.title,
    sentences: articles.sentences,
    audio_url: articles.audioUrl,
    translatedPassage: articles.translatedPassage,
    cefrLevel: articles.cefrLevel,
  })
    .from(articles)
    .where(eq(articles.id, sourceArticleId))
    .limit(1);

  if (!article) return null;

  const sentRows = await db.select().from(sentencsAndWordsForFlashcards)
    .where(eq(sentencsAndWordsForFlashcards.articleId, sourceArticleId));

  return { article, sentRows };
}

export async function getLessonFlashcards(
  sourceArticleId: string,
  deckKind: FlashcardType,
) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const [deck] = await db.select().from(flashcardDecks)
      .where(
        and(
          eq(flashcardDecks.userId, user.id as string),
          eq(flashcardDecks.type, deckKind as string),
        ),
      )
      .limit(1);

    if (!deck) {
      return {
        success: true,
        cards: [],
      };
    }

    // Cards in this deck whose sourceId (shared-partial articleId column)
    // matches the requested articleId.
    const flashcards = await db.select().from(flashcardCards)
      .where(eq(flashcardCards.deckId, deck.id));

    const filtered = flashcards.filter(
      (card) => card.sourceId === sourceArticleId,
    );

    return {
      success: true,
      cards: filtered,
    };
  } catch (error) {
    console.error("Error fetching vocabulary flashcards:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      cards: [],
    };
  }
}

export async function getLessonOrderingSentences(sourceArticleId: string) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [deck] = await db.select().from(flashcardDecks)
      .where(
        and(
          eq(flashcardDecks.userId, user.id as string),
          eq(flashcardDecks.type, FlashcardType.SENTENCE),
        ),
      )
      .limit(1);

    if (!deck) {
      return { sentenceGroups: [], totalGroups: 0 };
    }

    const cardRows = await db.select().from(flashcardCards)
      .where(eq(flashcardCards.deckId, deck.id));

    const flashcards = cardRows.filter(
      (card) => card.sourceId === sourceArticleId,
    );

    // Process each flashcard sentence individually
    const sentenceGroups = [];

    for (const flashcardCard of flashcards) {
      const snapshot = await loadArticleSnapshot(flashcardCard.sourceId as string);
      if (!snapshot) continue;
      const { article } = snapshot;

      if (!article || !article.sentences) continue;

      const articleSentences = article.sentences as unknown[];

      // If less than 5 sentences total, skip this article
      if (articleSentences.length < 5) continue;

      // Find the index of the flashcard sentence in the article.
      // The card stores the sentence text in `front` (and `back`) per the
      // shared-schema contract.
      const flashcardSentenceIndex = articleSentences.findIndex(
        (s) => s.sentence === flashcardCard.front,
      );

      if (flashcardSentenceIndex === -1) continue;

      // Generate random starting position around the flashcard sentence
      // Ensure we get 5 sentences and include the flashcard sentence
      const maxStartIndex = Math.min(
        flashcardSentenceIndex, // Can start at flashcard position (flashcard at end)
        articleSentences.length - 5, // Don't go beyond array bounds
      );

      const minStartIndex = Math.max(
        0, // Don't go below 0
        flashcardSentenceIndex - 4, // Can start 4 positions before flashcard (flashcard at end)
      );

      // Random start index within valid range
      const startIndex =
        Math.floor(Math.random() * (maxStartIndex - minStartIndex + 1)) +
        minStartIndex;

      const selectedSentences = articleSentences.slice(
        startIndex,
        startIndex + 5,
      );

      // Create the sentence group
      const sentences = selectedSentences.map((sentence, index) => {
        const globalIndex = startIndex + index;
        const isFromFlashcard = globalIndex === flashcardSentenceIndex;

        return {
          id: `${article.id}-${globalIndex}-${Date.now()}-${Math.random()}`, // Unique ID
          text: sentence.sentence,
          translationMap: {
            th: (article.translatedPassage as unknown as Record<string, string[]> | undefined)?.th?.[globalIndex],
            cn: (article.translatedPassage as unknown as Record<string, string[]> | undefined)?.cn?.[globalIndex],
            tw: (article.translatedPassage as unknown as Record<string, string[]> | undefined)?.tw?.[globalIndex],
            vi: (article.translatedPassage as unknown as Record<string, string[]> | undefined)?.vi?.[globalIndex],
          },
          audio_url: getAudioUrl(article.audioUrl || ""),
          start_time: sentence.startTime,
          end_time: sentence.endTime,
          isFromFlashcard,
        };
      });

      // Determine difficulty based on CEFR level
      const getDifficulty = (cefrLevel: string) => {
        if (["A1", "A2"].includes(cefrLevel)) return "easy";
        if (["B1", "B2"].includes(cefrLevel)) return "medium";
        return "hard";
      };

      sentenceGroups.push({
        id: `${article.id}-${flashcardSentenceIndex}-${Date.now()}-${Math.random()}`, // Unique ID per game
        source_article_id: article.id,
        articleTitle: article.title,
        flashcardSentence: flashcardCard.front,
        correctOrder: sentences.map((s) => s.text),
        sentences,
        difficulty_level: getDifficulty(article.cefrLevel as string),
        startIndex,
        flashcardIndex: flashcardSentenceIndex,
      });
    }

    // Shuffle the sentence groups
    const shuffledGroups = sentenceGroups.sort(() => Math.random() - 0.5);

    return {
      sentenceGroups: shuffledGroups,
      totalGroups: shuffledGroups.length,
    };
  } catch (error) {
    console.error("Error fetching sentences for ordering:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch sentences",
      sentenceGroups: [],
      totalGroups: 0,
    };
  }
}

export async function getLessonClozeTestSentences(
  sourceArticleId: string,
  difficultyLevel: "easy" | "medium" | "hard",
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [deck] = await db.select().from(flashcardDecks)
      .where(
        and(
          eq(flashcardDecks.userId, user.id as string),
          eq(flashcardDecks.type, FlashcardType.SENTENCE),
        ),
      )
      .limit(1);

    if (!deck) {
      return { clozeTests: [], totalTests: 0 };
    }

    const cardRows = await db.select().from(flashcardCards)
      .where(eq(flashcardCards.deckId, deck.id));

    const flashcards = cardRows.filter(
      (card) => card.sourceId === sourceArticleId,
    );

    // Process each flashcard sentence to create cloze tests
    const clozeTests = [];

    for (const flashcardCard of flashcards) {
      const snapshot = await loadArticleSnapshot(flashcardCard.sourceId as string);
      if (!snapshot) continue;
      const { article, sentRows } = snapshot;

      if (!article) continue;

      // Recover per-sentence audio timing + translation from the article
      // snapshot rather than from a shared-partial card column.
      const sentencsAndWords = sentRows;
      const snapshotSentence = sentencsAndWords[0];
      const audioUrl = getAudioUrl(snapshotSentence?.audioSentencesUrl ?? "");
      const startTime = 0;
      const endTime = 0;

      clozeTests.push({
        id: `${article.id}-${flashcardCard.id}-${Date.now()}-${Math.random()}`,
        source_article_id: article.id,
        articleTitle: article.title,
        flashcard_sentence: flashcardCard.front,
        // words: matchingSentence.words,
        blanks: [],
        translation_text: undefined,
        audio_url: audioUrl,
        start_time: startTime,
        end_time: endTime,
        difficulty_level: difficultyLevel,
      });
    }

    // Shuffle the cloze tests
    const shuffledTests = clozeTests.sort(() => Math.random() - 0.5);

    return {
      clozeTests: shuffledTests,
      totalTests: shuffledTests.length,
    };
  } catch (error) {
    console.error("Error fetching sentences for cloze test:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch sentences",
      clozeTests: [],
      totalTests: 0,
    };
  }
}

export async function getLessonOrderingWords(sourceArticleId: string) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [deck] = await db.select().from(flashcardDecks)
      .where(
        and(
          eq(flashcardDecks.userId, user.id as string),
          eq(flashcardDecks.type, FlashcardType.SENTENCE),
        ),
      )
      .limit(1);

    if (!deck) {
      return { sentences: [], totalSentences: 0 };
    }

    const cardRows = await db.select().from(flashcardCards)
      .where(eq(flashcardCards.deckId, deck.id));

    const flashcards = cardRows.filter(
      (card) => card.sourceId === sourceArticleId,
    );

    // Process each flashcard sentence
    const sentences = [];

    for (const flashcardCard of flashcards) {
      const snapshot = await loadArticleSnapshot(flashcardCard.sourceId as string);
      if (!snapshot) continue;
      const { article, sentRows } = snapshot;
      if (!article) continue;

      const sentence = flashcardCard.front;

      // Skip very short sentences (less than 3 words)
      const words = tokenizeSentence(sentence);
      if (words.length < 3) continue;

      // Skip very long sentences (more than 15 words) to keep game manageable
      if (words.length > 15) continue;

      // Find the sentence in the article for audio timing and translation
      const articleSentences = article.sentences as unknown[];
      const sentenceIndex = articleSentences.findIndex(
        (s) => s.sentence === sentence,
      );
      const sentenceData = articleSentences[sentenceIndex];

      // Get sentence-level translations from the article's translated
      // passage; the shared-schema card has no language columns.
      const sentenceTranslations = {
        th: (article.translatedPassage as unknown as Record<string, string[]> | undefined)?.th?.[sentenceIndex],
        vi: (article.translatedPassage as unknown as Record<string, string[]> | undefined)?.vi?.[sentenceIndex],
        cn: (article.translatedPassage as unknown as Record<string, string[]> | undefined)?.cn?.[sentenceIndex],
        tw: (article.translatedPassage as unknown as Record<string, string[]> | undefined)?.tw?.[sentenceIndex],
      };

      // Recover per-sentence audio from the article snapshot (audio URL on
      // the first row is the audioSentencesUrl). This avoids needing a
      // shared-partial audio column on flashcardCards.
      const snapshotSentence = sentRows[0];
      const sentenceAudioUrl = getAudioUrl(
        snapshotSentence?.audioSentencesUrl ?? "",
      );

      // Create word objects
      const wordObjects = words.map((word, index) => {
        // Calculate approximate timing for each word if audio data exists
        let wordStart: number | undefined;
        let wordEnd: number | undefined;

        if (sentenceData?.startTime && sentenceData?.endTime) {
          const totalDuration = sentenceData.endTime - sentenceData.startTime;
          const wordDuration = totalDuration / words.length;
          wordStart = sentenceData.startTime + index * wordDuration;
          wordEnd = (wordStart as number) + wordDuration;
        }

        return {
          id: `${article.id}-${flashcardCard.id}-word-${index}-${Date.now()}`,
          text: word,
          translationMap: {
            // For individual words, we don't have word-level translations
            // Could be enhanced with a dictionary API later
          },
          audio_url: sentenceAudioUrl,
          start_time: sentenceData?.startTime,
          end_time: sentenceData?.endTime,
          partOfSpeech: getPartOfSpeech(word, index, words.length),
        };
      });

      // Determine difficulty based on sentence length and CEFR level
      const getDifficulty = (wordCount: number, cefrLevel: string) => {
        if (wordCount <= 5 && ["A1", "A2"].includes(cefrLevel)) return "easy";
        if (wordCount <= 8 && ["A1", "A2", "B1"].includes(cefrLevel))
          return "medium";
        return "hard";
      };

      // Get some context from surrounding sentences
      let context = "";
      if (sentenceIndex > 0) {
        const prevSentence = articleSentences[sentenceIndex - 1]?.sentence;
        if (prevSentence && prevSentence.length < 100) {
          // Keep context concise
          context = `Previous: "${prevSentence}"`;
        }
      }

      sentences.push({
        id: `${article.id}-${flashcardCard.id}-${Date.now()}-${Math.random()}`,
        source_article_id: article.id,
        articleTitle: article.title,
        flashcard_sentence: sentence,
        correctOrder: words, // The correct order of words
        words: wordObjects,
        difficulty_level: getDifficulty(words.length, article.cefrLevel as string),
        context: context,
        // Add sentence-level translations
        sentenceTranslations,
      });
    }

    // Shuffle the sentences
    const shuffledSentences = sentences.sort(() => Math.random() - 0.5);

    // Limit to reasonable number for game session
    const limitedSentences = shuffledSentences.slice(0, 20);

    return {
      sentences: limitedSentences,
      totalSentences: limitedSentences.length,
    };
  } catch (error) {
    console.error("Error fetching words for ordering:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch words",
      sentences: [],
      totalSentences: 0,
    };
  }
}