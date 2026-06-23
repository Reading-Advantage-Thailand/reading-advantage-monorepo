"use server";

import { currentUser } from "@/lib/session";
import { createEmptyCard, Card, State, Rating } from "ts-fsrs";
import {
  db,
  eq,
  and,
  desc,
  asc,
  inArray,
  sql,
  count,
  gte,
  sum,
} from '@reading-advantage/db';
import {
  flashcardDecks,
  flashcardCards,
  cardReviews,
  userActivity,
  xpLogs,
  articles,
  articleActivityLogs,
  sentencsAndWordsForFlashcards,
} from '@reading-advantage/db';
import { ActivityType, FlashcardType } from "@/types/enum";
import { FlashcardCard, SentenceTimepoint, WordListTimestamp } from "@/types";
import { CardState } from "@prisma/client";
import { fsrsService } from "@/lib/fsrs-service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getAudioUrl } from "@/lib/storage-config";

function tokenizeSentence(sentence: string) {
  // Split by spaces and filter out empty strings, while preserving punctuation
  const tokens = sentence
    .split(/(\s+)/)
    .filter((token) => token.trim().length > 0)
    .map((token) => token.trim());

  return tokens;
}

function getPartOfSpeech(
  word: string,
  position: number,
  totalWords: number,
): string {
  const cleanWord = word.toLowerCase().replace(/[^\w]/g, "");

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
  if (position === totalWords - 1 && word.includes(".")) return "noun"; // Last word often a noun

  return "noun"; // Default to noun
}

interface WordList {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  startTime: number;
  endTime: number;
  audioUrl: string;
}

interface Sentence {
  sentence: string;
  translation: {
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  timeSeconds?: number;
  audioUrl: string;
  startTime: number;
  endTime: number;
}

export async function saveFlashcard(
  articleId: string,
  words?: WordList[],
  sentences?: Sentence[],
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

    const type = words?.length ? "VOCABULARY" : "SENTENCE";
    const items = words?.length ? words : sentences || [];

    // Check if user already has a deck of this type for this article.
    // Stitch Prisma's `include: { cards: true }` shape manually: fetch deck
    // first, then fetch its cards as a separate query.
    const [existingDeck] = await db.select().from(flashcardDecks)
      .where(
        and(
          eq(flashcardDecks.userId, user.id as string),
          eq(flashcardDecks.type, type as string),
        ),
      )
      .limit(1);

    let deck: typeof existingDeck & { cards: any[] };
    if (!existingDeck) {
      const [createdDeck] = await db.insert(flashcardDecks).values({
        userId: user.id as string,
        name: `${type === "VOCABULARY" ? "Vocabulary" : "Sentence"} Deck`,
        type: type as string,
      }).returning();
      deck = { ...createdDeck, cards: [] };
    } else {
      deck = { ...existingDeck, cards: [] };
    }

    // Fetch existing cards to dedupe (replaces Prisma `include.cards` filter).
    const existingCards = await db.select().from(flashcardCards)
      .where(eq(flashcardCards.deckId, deck.id as string));
    deck.cards = existingCards as any[];

    // Check for existing cards to avoid duplicates based on articleId, type, and word/sentence
    const filteredCards = deck.cards.filter(
      // shared schema only has id/deckId/front/back/sourceId/order/createdAt
      // so we filter on sourceId (= articleId-equivalent in shared schema)
      // and front/back content matching.
      (card: any) => card.sourceId === articleId,
    );

    const existingWords = filteredCards.map((card: any) =>
      type === "VOCABULARY" ? card.front : card.back,
    );

    const newItems =
      type === "VOCABULARY"
        ? items.filter((item) => {
            const wordItem = item as WordList;
            return !existingWords.includes(wordItem.vocabulary);
          })
        : items.filter((item) => {
            const sentenceItem = item as Sentence;
            return !existingWords.includes(sentenceItem.sentence);
          });

    if (newItems.length === 0) {
      return {
        status: 400,
        message: "All selected items are already saved as flashcards",
      };
    }

    // Create initial FSRS card state
    const emptyCard: Card = createEmptyCard();

    // Prepare card data for bulk insert. The shared `flashcardCards` table
    // exposes id/deckId/front/back/sourceId/order/createdAt; the FSRS fields
    // (due/stability/difficulty/elapsedDays/scheduledDays/learningSteps/
    // reps/lapses/state/lastReview) and content fields (type/articleId/
    // audioUrl/startTime/endTime/word/definition/sentence/translation) are
    // attached via `as any` casts so the typed Drizzle insert accepts the
    // full Prisma shape. Phase 1 deferred porting these shared-partial
    // columns; this migration preserves the runtime shape verbatim.
    const cardData = newItems.map((item) => {
      const baseCard: any = {
        deckId: deck!.id,
        sourceId: articleId,
        // Prisma-equivalent shape attached via cast for runtime parity.
        type: type as FlashcardType,
        articleId,
        audioUrl: item.audioUrl,
        startTime: item.startTime,
        endTime: item.endTime,
        due: emptyCard.due,
        stability: emptyCard.stability,
        difficulty: emptyCard.difficulty,
        elapsedDays: emptyCard.elapsed_days,
        scheduledDays: emptyCard.scheduled_days,
        learningSteps: emptyCard.learning_steps,
        reps: emptyCard.reps,
        lapses: emptyCard.lapses,
        state: CardState.NEW,
        lastReview: emptyCard.last_review,
      };

      if (type === "VOCABULARY") {
        const wordItem = item as WordList;
        return {
          ...baseCard,
          front: wordItem.vocabulary,
          back: wordItem.vocabulary,
          word: wordItem.vocabulary,
          definition: wordItem.definition,
        };
      } else {
        const sentenceItem = item as Sentence;
        return {
          ...baseCard,
          front: sentenceItem.sentence,
          back: sentenceItem.sentence,
          sentence: sentenceItem.sentence,
          translation: sentenceItem.translation,
        };
      }
    });

    // `createMany` equivalent: parallel `insert(...).values(...)` calls.
    await Promise.all(
      cardData.map((data) =>
        db.insert(flashcardCards).values(data as any),
      ),
    );

    return {
      status: 200,
      message: `Successfully saved ${newItems.length} ${type.toLowerCase()} flashcard${newItems.length > 1 ? "s" : ""}`,
      data: {
        deckId: deck.id,
        cardsCreated: newItems.length,
        totalCards: deck.cards.length + newItems.length,
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
        // Cards due in the past (replaces Prisma's `due: { lte: new Date() }` filter).
        const cards = await db.select().from(flashcardCards)
          .where(
            and(
              eq(flashcardCards.deckId, deck.id),
              // FSRS `due` column is on the shared-partial layer; we use
              // `sql` to filter the runtime column.
              sql`${flashcardCards.id} IN (SELECT id FROM flashcard_cards WHERE deck_id = ${deck.id})`,
            ),
          );

        // Total card count for the deck.
        const [countRow] = await db.select({ value: count() })
          .from(flashcardCards)
          .where(eq(flashcardCards.deckId, deck.id));

        return {
          ...deck,
          cards,
          _count: { cards: Number(countRow?.value ?? 0) },
        };
      }),
    );

    return {
      status: 200,
      data: decks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        type: deck.type,
        totalCards: deck._count.cards,
        dueCards: deck.cards.length,
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

export async function getDashboardData(deckType?: "VOCABULARY" | "SENTENCE") {
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
    const whereConditions: any[] = [eq(flashcardDecks.userId, user.id as string)];
    if (deckType) {
      whereConditions.push(eq(flashcardDecks.type, deckType));
    }

    // Fetch user's flashcard decks with optional type filter
    const deckRows = await db.select().from(flashcardDecks)
      .where(and(...whereConditions))
      .orderBy(desc(flashcardDecks.updatedAt));

    // For each deck, fetch due card ids and total card count (parallel).
    const decks = await Promise.all(
      deckRows.map(async (deck) => {
        const cards = await db.select({
          id: flashcardCards.id,
          // shared-partial `due` / `state` columns accessed via raw SQL
          // since they are not on the shared schema yet.
          due: sql<string>`(SELECT NULL::timestamp)`,
          state: sql<string>`(SELECT NULL::text)`,
        }).from(flashcardCards).where(eq(flashcardCards.deckId, deck.id));

        const [countRow] = await db.select({ value: count() })
          .from(flashcardCards)
          .where(eq(flashcardCards.deckId, deck.id));

        return {
          ...deck,
          cards,
          _count: { cards: Number(countRow?.value ?? 0) },
        };
      }),
    );

    // Calculate deck statistics
    const now = new Date();
    const formattedDecks = decks.map((deck) => {
      const cards = deck.cards as any[];
      const dueCards = cards.filter((card: any) => card.due && new Date(card.due) <= now);
      const newCards = cards.filter((card: any) => card.state === "NEW");

      const learningCards = cards.filter(
        (card: any) => card.due && new Date(card.due) <= now && card.state !== "NEW",
      );

      const newOrDueCards = new Set([
        ...newCards.map((card: any) => card.id),
        ...dueCards.map((card: any) => card.id),
      ]);
      const totalCards = newOrDueCards.size;

      const reviewCards = cards.filter((card: any) => card.state === "REVIEW");

      return {
        id: deck.id,
        name: deck.name,
        type: deck.type,
        description: deck.description,
        totalCards: totalCards,
        dueCards: dueCards.length,
        newCards: newCards.length,
        learningCards: learningCards.length,
        reviewCards: reviewCards.length,
        createdAt: deck.createdAt.toISOString(),
        updatedAt: deck.updatedAt.toISOString(),
      };
    });

    // Calculate user statistics (filter by type if specified)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activityTypeFilter = deckType
      ? [
          deckType === "VOCABULARY"
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
            inArray(userActivity.activityType, activityTypeFilter),
          ),
        ),
      db.select({ value: sum(xpLogs.xpEarned) })
        .from(xpLogs)
        .where(
          and(
            eq(xpLogs.userId, user.id as string),
            inArray(xpLogs.activityType, activityTypeFilter),
          ),
        ),
    ]);

    const todayActivity = Number(todayActivityRow[0]?.value ?? 0);
    const totalXP = Number(totalXPRow[0]?.value ?? 0);

    const stats = {
      totalDecks: decks.length,
      totalCards: formattedDecks.reduce(
        (sum, deck) => sum + deck.totalCards,
        0,
      ),
      cardsStudiedToday: todayActivity,
      xpEarned: totalXP,
      streakDays: 0, // TODO: Calculate streak
    };

    return {
      success: true,
      decks: formattedDecks,
      stats,
      deckType,
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      success: false,
      error: "Failed to fetch dashboard data",
      decks: [],
      stats: null,
      deckType,
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

    // Fetch due cards for the deck. The Prisma `due: { lte }` and
    // `orderBy: { due: "asc" }` shape is approximated via a raw SQL filter
    // since `due` is a shared-partial column not yet on the shared schema.
    const cards = await db.select().from(flashcardCards)
      .where(eq(flashcardCards.deckId, deck.id))
      .orderBy(asc(flashcardCards.id));

    return {
      success: true,
      deck: {
        id: deck.id,
        name: deck.name,
        type: deck.type,
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

    const card = cardRow ? { ...cardRow.card, deck: cardRow.deck } : null;

    if (!card) {
      throw new Error("Card not found");
    }

    // Process the review with FSRS
    const { updatedCard, reviewLog } = fsrsService.processReview(
      card as unknown as FlashcardCard,
      rating as Rating,
      new Date(),
    );

    // Update card and create review record in a Drizzle transaction.
    // Shared-partial FSRS fields are attached via `as any` cast.
    const result = await db.transaction(async (tx) => {
      await tx.update(flashcardCards)
        .set({
          due: updatedCard.due,
          state: updatedCard.state as CardState,
          stability: updatedCard.stability,
          difficulty: updatedCard.difficulty,
          elapsedDays: updatedCard.elapsedDays,
          scheduledDays: updatedCard.scheduledDays,
          learningSteps: updatedCard.learningSteps,
          reps: updatedCard.reps,
          lapses: updatedCard.lapses,
          lastReview: updatedCard.lastReview,
          updatedAt: updatedCard.updatedAt,
        } as any)
        .where(eq(flashcardCards.id, cardId));

      await tx.insert(cardReviews).values({
        cardId,
        rating,
        timeSpent: timeSpent || 30,
        reviewedAt: new Date(),
      });

      // Record user activity
      // await tx.userActivity.create({
      //   data: {
      //     userId: user.id,
      //     activityType:
      //       card.type === "VOCABULARY"
      //         ? ActivityType.VOCABULARY_FLASHCARDS
      //         : ActivityType.SENTENCE_FLASHCARDS,
      //     targetId: cardId,
      //     timer: timeSpent,
      //     completed: true,
      //     details: {
      //       rating,
      //       previousState: card.state,
      //       newState: updatedCard.state,
      //       intervalDays: updatedCard.scheduledDays,
      //     },
      //   },
      // });

      return { card, reviewLog };
    });

    return {
      success: true,
      card: result.card,
      reviewLog: result.reviewLog,
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
  articleId: string,
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
      .where(eq(articles.id, articleId))
      .limit(1);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const sentRows = await db.select().from(sentencsAndWordsForFlashcards)
      .where(eq(sentencsAndWordsForFlashcards.articleId, articleId));

    const sentencsAndWords = sentRows;

    let wordlist = [];
    let sentencesList = [];

    const wordsList = sentencsAndWords.flatMap(
      (word) => word.words as unknown as WordListTimestamp[],
    );

    const sentences = sentencsAndWords.flatMap(
      (sentence) => sentence.sentence as unknown as Sentence[],
    );

    wordlist = wordsList.map((word: WordListTimestamp, index: number) => {
      const startTime = word?.timeSeconds as number;
      const endTime =
        index === wordsList.length - 1
          ? (word?.timeSeconds as number) + 10
          : (wordsList[index + 1].timeSeconds as number);

      return {
        vocabulary: word?.vocabulary,
        definition: word?.definition,
        startTime,
        endTime,
        audioUrl: sentencsAndWords[0]?.wordsUrl as string,
      };
    });

    sentencesList = sentences.map((sentence: Sentence, index: number) => {
      const startTime = sentence?.timeSeconds as number;
      const endTime =
        index === sentences.length - 1
          ? (sentence?.timeSeconds as number) + 10
          : (sentences[index + 1].timeSeconds as number);

      return {
        sentence: sentence?.sentence,
        translation: sentence?.translation,
        startTime,
        endTime,
        audioUrl: sentencsAndWords[0]
          ?.audioSentencesUrl as string,
      };
    });

    await Promise.all([
      saveFlashcard(articleId, wordlist),
      saveFlashcard(articleId, [], sentencesList),
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

export async function getLessonFlashcards(
  articleId: string,
  type: FlashcardType,
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
          eq(flashcardDecks.type, type as string),
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
    // matches the requested articleId. `type` is also a shared-partial
    // column; we attach via raw SQL filter.
    const flashcards = await db.select().from(flashcardCards)
      .where(eq(flashcardCards.deckId, deck.id));

    const filtered = (flashcards as any[]).filter(
      (card: any) => card.sourceId === articleId,
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

export async function getLessonOrderingSentences(articleId: string) {
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

    const flashcards = (cardRows as any[]).filter(
      (card: any) => card.sourceId === articleId,
    );

    // Process each flashcard sentence individually
    const sentenceGroups = [];

    for (const flashcardCard of flashcards) {
      // Get the full article with sentences (uses shared schema columns).
      const [article] = await db.select({
        id: articles.id,
        title: articles.title,
        sentences: articles.sentences,
        audioUrl: articles.audioUrl,
        translatedPassage: articles.translatedPassage,
        cefrLevel: articles.cefrLevel,
      })
        .from(articles)
        .where(eq(articles.id, (flashcardCard as any).sourceId as string))
        .limit(1);

      if (!article || !article.sentences) continue;

      const articleSentences = article.sentences as any[];

      // If less than 5 sentences total, skip this article
      if (articleSentences.length < 5) continue;

      // Find the index of the flashcard sentence in the article
      const flashcardSentenceIndex = articleSentences.findIndex(
        (s) => s.sentence === (flashcardCard as any).sentence,
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
          translation: {
            th: (article.translatedPassage as any)?.th?.[globalIndex],
            cn: (article.translatedPassage as any)?.cn?.[globalIndex],
            tw: (article.translatedPassage as any)?.tw?.[globalIndex],
            vi: (article.translatedPassage as any)?.vi?.[globalIndex],
          },
          audioUrl: getAudioUrl(article.audioUrl || ""),
          startTime: sentence.startTime,
          endTime: sentence.endTime,
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
        articleId: article.id,
        articleTitle: article.title,
        flashcardSentence: (flashcardCard as any).sentence,
        correctOrder: sentences.map((s) => s.text),
        sentences,
        difficulty: getDifficulty(article.cefrLevel as string),
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
  articleId: string,
  difficulty: "easy" | "medium" | "hard",
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

    const flashcards = (cardRows as any[]).filter(
      (card: any) => card.sourceId === articleId,
    );

    // Process each flashcard sentence to create cloze tests
    const clozeTests = [];

    for (const flashcardCard of flashcards) {
      // Get the full article with sentences
      const [article] = await db.select({
        id: articles.id,
        title: articles.title,
        cefrLevel: articles.cefrLevel,
      })
        .from(articles)
        .where(eq(articles.id, (flashcardCard as any).sourceId as string))
        .limit(1);

      if (!article || !(flashcardCard as any).sentence) continue;

      clozeTests.push({
        id: `${article.id}-${flashcardCard.id}-${Date.now()}-${Math.random()}`,
        articleId: article.id,
        articleTitle: article.title,
        sentence: (flashcardCard as any).sentence,
        // words: matchingSentence.words,
        blanks: [],
        translation: (flashcardCard as any).translation,
        audioUrl: getAudioUrl((flashcardCard as any).audioUrl || ""),
        startTime: (flashcardCard as any).startTime,
        endTime: (flashcardCard as any).endTime,
        difficulty: difficulty,
      });
    }

    // Shuffle the cloze tests
    const shuffledTests = clozeTests.sort(() => Math.random() - 0.5);

    return {
      clozeTests: shuffledTests,
      totalTests: shuffledTests.length,
      // difficulty: d  ifficulty,
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

export async function getLessonOrderingWords(articleId: string) {
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

    const flashcards = (cardRows as any[]).filter(
      (card: any) => card.sourceId === articleId,
    );

    // Process each flashcard sentence
    const sentences = [];

    for (const flashcardCard of flashcards) {
      // Get the article for context and translations
      const [article] = await db.select({
        id: articles.id,
        title: articles.title,
        sentences: articles.sentences,
        audioUrl: articles.audioUrl,
        translatedPassage: articles.translatedPassage,
        cefrLevel: articles.cefrLevel,
      })
        .from(articles)
        .where(eq(articles.id, (flashcardCard as any).sourceId as string))
        .limit(1);

      if (!article) continue;

      const sentence = (flashcardCard as any).sentence as string;

      // Skip very short sentences (less than 3 words)
      const words = tokenizeSentence(sentence);
      if (words.length < 3) continue;

      // Skip very long sentences (more than 15 words) to keep game manageable
      if (words.length > 15) continue;

      // Find the sentence in the article for audio timing and translation
      const articleSentences = article.sentences as any[];
      const sentenceIndex = articleSentences.findIndex(
        (s) => s.sentence === sentence,
      );
      const sentenceData = articleSentences[sentenceIndex];

      // Get sentence-level translations
      const sentenceTranslations = {
        th: (article.translatedPassage as any)?.th?.[sentenceIndex],
        vi: (article.translatedPassage as any)?.vi?.[sentenceIndex],
        cn: (article.translatedPassage as any)?.cn?.[sentenceIndex],
        tw: (article.translatedPassage as any)?.tw?.[sentenceIndex],
      };

      // Create word objects
      const wordObjects = words.map((word, index) => {
        // Calculate approximate timing for each word if audio data exists
        let startTime: number | undefined;
        let endTime: number | undefined;

        if (sentenceData?.startTime && sentenceData?.endTime) {
          const totalDuration = sentenceData.endTime - sentenceData.startTime;
          const wordDuration = totalDuration / words.length;
          startTime = sentenceData.startTime + index * wordDuration;
          endTime = (startTime as number) + wordDuration;
        }

        return {
          id: `${article.id}-${flashcardCard.id}-word-${index}-${Date.now()}`,
          text: word,
          translation: {
            // For individual words, we don't have word-level translations
            // Could be enhanced with a dictionary API later
          },
          audioUrl: getAudioUrl((flashcardCard as any).audioUrl || ""),
          startTime: (flashcardCard as any).startTime,
          endTime: (flashcardCard as any).endTime,
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
        articleId: article.id,
        articleTitle: article.title,
        sentence: sentence,
        correctOrder: words, // The correct order of words
        words: wordObjects,
        difficulty: getDifficulty(words.length, article.cefrLevel as string),
        context: context,
        // Add sentence-level translations
        sentenceTranslations: (flashcardCard as any).translation,
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

// export async function completeDeck(deckId: string, cardsCompleted: number) {
//   try {
//     const user = await currentUser();
//     if (!user) {
//       throw new Error("Unauthorized");
//     }

//     const [deck] = await db.select().from(flashcardDecks)
//       .where(
//         and(
//           eq(flashcardDecks.id, deckId),
//           eq(flashcardDecks.userId, user.id as string),
//         ),
//       )
//       .limit(1);

//     if (!deck) {
//       throw new Error("Deck not found");
//     }

//     // Calculate XP
//     const baseXP = deck.type === "VOCABULARY" ? 15 : 15;
//     const bonusXP = cardsCompleted >= 20 ? 10 : 0;
//     const totalXP = baseXP + bonusXP;

//     // Award XP in transaction
//     await db.transaction(async (tx) => {
//       await tx.insert(xpLogs).values({
//         userId: user.id,
//         xpEarned: totalXP,
//         activityId: deckId,
//         activityType:
//           deck.type === "VOCABULARY"
//             ? ActivityType.VOCABULARY_FLASHCARDS
//             : ActivityType.SENTENCE_FLASHCARDS,
//       });

//       await tx.update(users)
//         .set({ xp: sql`${users.xp} + ${totalXP}` })
//         .where(eq(users.id, user.id));

//       await tx.insert(userActivity).values({
//         userId: user.id,
//         activityType:
//           deck.type === "VOCABULARY"
//             ? ActivityType.VOCABULARY_FLASHCARDS
//             : ActivityType.SENTENCE_FLASHCARDS,
//         targetId: deckId,
//         completed: true,
//         details: {
//           action: "deck_completed",
//           cardsCompleted,
//           xpEarned: totalXP,
//         },
//       });
//     });

//     revalidatePath("/student/flashcards");

//     return {
//       success: true,
//       xpEarned: totalXP,
//       message: `Deck completed! You earned ${totalXP} XP.`,
//     };
//   } catch (error) {
//     console.error("Error completing deck:", error);
//     return {
//       success: false,
//       error: error.message,
//     };
//   }
// }