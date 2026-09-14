import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, isNotNull, sql } from 'drizzle-orm';
import type { DB } from '@reading-advantage/domain';
import { flashcardDecks, flashcardCards, cardReviews, articles, userActivity, xpLogs, users } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';
import { currentUser } from "@/lib/session";
import { resolveFlashcardGameXpAward } from "@/lib/authorization";
import { ActivityType } from "@/types/enum";
import { getAudioUrl } from "@/lib/storage-config";
import { shuffle } from "@/lib/shuffle";

/**
 * Returns shuffled sentence-matching games from the caller's deck.
 * @param request Request with the translation language query.
 * @param params Route params carrying the deck id.
 * @returns The matching games or a structured error response.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization decision via the central policy. Flashcard study serves
    // any authenticated user; article:read is the matching low-privilege
    // permission (flashcards derive from articles).
    try {
      assertCan(user, "article:read", { schoolId: user.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw error;
    }

    const { deckId } = await params;

    // Get translation language from query parameters
    const { searchParams } = new URL(request.url);
    const translationLanguage =
      (searchParams.get("language") as "th" | "vi" | "cn" | "tw") || "th";

    // Fetch deck (replaces Prisma `findFirst({ where, include.cards.include.reviews })`).
    const tenantDb = getTenantDB({ schoolId: user.schoolId });
    // Flashcard, article, and activity tables are REFERENTIAL (no schoolId);
    // scoping below uses the caller userId and deckId/cardId owner filters.
    // Only the users XP increment uses the tenant-scoped handle.
    const flashDb = getUnscopedDB("flashcardDecks, flashcardCards, cardReviews, articles, userActivity, and xpLogs have no schoolId; scoped via userId, deckId, and cardId owner filters");
    const [deck] = await flashDb.select().from(flashcardDecks)
      .where(
        and(
          eq(flashcardDecks.id, deckId),
          eq(flashcardDecks.userId, user.id),
        ),
      )
      .limit(1);

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    // Fetch cards for the deck (shared-partial `due` filter and `articleId.not` filter
    // applied via raw SQL since they're shared-partial columns).
    const now = new Date();
    const cardRows = await flashDb.select().from(flashcardCards)
      .where(
        and(
          eq(flashcardCards.deckId, deck.id),
          isNotNull(sql`${flashcardCards.sourceId}`),
          sql`${flashcardCards.id} IN (SELECT id FROM flashcard_cards WHERE deck_id = ${deck.id} AND due <= ${now.toISOString()} AND source_id IS NOT NULL)`,
        ),
      );
    const cardsWithDue = (cardRows as any[]).filter(
      (c) => c.due && new Date(c.due) <= now && c.articleId != null,
    );

    // Fetch most-recent review per card.
    const cardIds = cardsWithDue.map((c) => c.id);
    const reviewsByCard = new Map<string, any>();
    if (cardIds.length > 0) {
      const reviewRows = await flashDb.select().from(cardReviews)
        .orderBy(desc(cardReviews.reviewedAt));
      for (const r of reviewRows) {
        if (cardIds.includes(r.cardId) && !reviewsByCard.has(r.cardId)) {
          reviewsByCard.set(r.cardId, r);
        }
      }
    }

    const cards = cardsWithDue.map((c) => ({
      ...c,
      reviews: reviewsByCard.has(c.id) ? [reviewsByCard.get(c.id)] : [],
    }));

    if (cards.length === 0) {
      return NextResponse.json({
        matchingGames: [],
        message: "No due flashcards found",
      });
    }

    // Separate vocabulary and sentence cards
    const vocabularyCards = cards.filter(
      (card: any) => card.type === "VOCABULARY",
    );
    const sentenceCards = cards.filter((card: any) => card.type === "SENTENCE");

    const matchingGames = [];

    // Process sentence cards for sentence-to-translation matching
    if (sentenceCards.length > 0) {
      const translationPairs = await createTranslationPairs(
        flashDb,
        sentenceCards,
        translationLanguage,
      );

      if (translationPairs.length > 0) {
        matchingGames.push({
          id: `translation-${Date.now()}-${Math.random()}`,
          pairs: translationPairs,
          language: translationLanguage,
        });
      }
    }

    // Process vocabulary cards for word-definition matching (fallback)
    if (vocabularyCards.length > 0 && matchingGames.length === 0) {
      const vocabularyPairs = await createVocabularyPairs(
        flashDb,
        vocabularyCards,
        translationLanguage,
      );
      if (vocabularyPairs.length > 0) {
        matchingGames.push({
          id: `vocab-${Date.now()}-${Math.random()}`,
          pairs: vocabularyPairs,
          language: translationLanguage,
        });
      }
    }

    // Shuffle the matching games
    const shuffledGames = shuffle(matchingGames);

    return NextResponse.json({
      matchingGames: shuffledGames,
      totalGames: shuffledGames.length,
    });
  } catch (error) {
    console.error("Error fetching sentences for matching:", error);
    return NextResponse.json(
      { error: "Failed to fetch sentences for matching" },
      { status: 500 },
    );
  }
}

/**
 * Records a completed sentence-matching game and awards server-side XP.
 * @param request Request with the game score and timer body.
 * @param params Route params carrying the deck id.
 * @returns The success flag or an error response.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> },
) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Authorization decision via the central policy. Flashcard study serves
  // any authenticated user; article:read is the matching low-privilege
  // permission (flashcards derive from articles).
  try {
    assertCan(user, "article:read", { schoolId: user.schoolId ?? null });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const { deckId } = await params;
  const { score, timer } = await request.json();

  const tenantDb = getTenantDB({ schoolId: user.schoolId });
  // userActivity and xpLogs are REFERENTIAL; users is FLAT (tenant-scoped).
  const flashDb = getUnscopedDB("userActivity and xpLogs have no schoolId; scoped via caller userId and deck targetId");

  // The score counts correct items; clamp it to the deck size server-side
  // so callers cannot mint XP beyond what the deck contains.
  const cardRows = await flashDb.select({ id: flashcardCards.id })
    .from(flashcardCards)
    .where(eq(flashcardCards.deckId, deckId));
  const xpEarned = resolveFlashcardGameXpAward(score, cardRows.length);

  // Record user activity (replaces Prisma `userActivity.create`).
  const [userActivityRow] = await flashDb.insert(userActivity).values({
    userId: user.id as string,
    activityType: ActivityType.SENTENCE_MATCHING,
    targetId: deckId,
    timer: timer,
    details: {
      timer: timer,
      xp: xpEarned,
    },
    completed: true,
  } as any).returning();

  // Create XP log entry (replaces Prisma `xPLogs.create`).
  await flashDb.insert(xpLogs).values({
    userId: user.id as string,
    xpEarned: xpEarned,
    activityId: userActivityRow.id,
    activityType: ActivityType.SENTENCE_MATCHING,
  });

  // Increment user XP (replaces Prisma `user.update({ data: { xp: { increment } } })`).
  // users is FLAT; TenantDB scopes the increment to the caller's school.
  await tenantDb.update(users)
    .set({ xp: sql`${users.xp} + ${xpEarned}` })
    .where(eq(users.id, user.id as string));

  return NextResponse.json({ success: true });
}

// Helper function to create vocabulary matching pairs
/**
 * Builds word-definition pairs from vocabulary cards and article audio.
 * @param flashDb Unscoped handle for the REFERENTIAL flashcard/article tables.
 * @param vocabularyCards Due vocabulary cards owned by the caller.
 * @param targetLanguage Translation language for the definitions.
 * @returns The vocabulary matching pairs.
 */
async function createVocabularyPairs(
  flashDb: DB,
  vocabularyCards: any[],
  targetLanguage: string = "th",
) {
  const pairs = [];

  for (const card of vocabularyCards) {
    if (!card.word || !card.definition) continue;

    // Get the article for audio data (replaces Prisma `article.findUnique`).
    if (!card.articleId) continue;
    const [article] = await flashDb.select({
      id: articles.id,
      title: articles.title,
      audioUrl: articles.audioUrl,
      words: articles.words,
    })
      .from(articles)
      .where(eq(articles.id, card.articleId))
      .limit(1);

    if (!article) continue;

    // Find the word in the article's words array for audio timing
    const articleWords = article.words as any[];
    const matchingWord = articleWords?.find(
      (w) => w.vocabulary?.toLowerCase() === card.word?.toLowerCase(),
    );

    // Extract definition text in target language
    let definitionText = "";
    if (typeof card.definition === "object" && card.definition !== null) {
      // Try to get definition in target language first, then fallback to English
      definitionText =
        (card.definition as any)[targetLanguage] ||
        (card.definition as any).en ||
        (card.definition as any).th ||
        (card.definition as any).vi ||
        (card.definition as any).cn ||
        (card.definition as any).tw ||
        JSON.stringify(card.definition);
    } else if (typeof card.definition === "string") {
      definitionText = card.definition;
    }

    pairs.push({
      id: `vocab-pair-${card.id}`,
      left: {
        id: `left-${card.id}`,
        content: card.word,
        type: "word",
      },
      right: {
        id: `right-${card.id}`,
        content: definitionText,
        type: "translation",
      },
      articleId: article.id,
      articleTitle: article.title,
      audioUrl: article.audioUrl ? getAudioUrl(article.audioUrl) : undefined,
      startTime: matchingWord?.startTime,
      endTime: matchingWord?.endTime,
    });
  }

  return pairs;
}

// Helper function to generate translation-based pairs
/**
 * Builds sentence-translation pairs from sentence cards and articles.
 * @param flashDb Unscoped handle for the REFERENTIAL flashcard/article tables.
 * @param sentenceCards Due sentence cards owned by the caller.
 * @param targetLanguage Translation language for the right-hand content.
 * @returns The translation matching pairs.
 */
async function createTranslationPairs(
  flashDb: DB,
  sentenceCards: any[],
  targetLanguage: string = "th",
) {
  const pairs = [];

  for (const card of sentenceCards) {
    if (!card.sentence) continue;

    // Get the article for translation data (replaces Prisma `article.findUnique`).
    if (!card.articleId) continue;
    const [article] = await flashDb.select({
      id: articles.id,
      title: articles.title,
      sentences: articles.sentences,
      translatedPassage: articles.translatedPassage,
      audioUrl: articles.audioUrl,
    })
      .from(articles)
      .where(eq(articles.id, card.articleId))
      .limit(1);

    if (!article) continue;

    const articleSentences = article.sentences as any[];
    const translatedPassage = article.translatedPassage as any;

    // Find the matching sentence in the article
    const sentenceIndex = articleSentences.findIndex(
      (s) => s.sentence === card.sentence,
    );

    if (sentenceIndex === -1) continue;

    // Get translation for the sentence in target language
    let translationText = "";
    if (translatedPassage && translatedPassage[targetLanguage]) {
      const translations = translatedPassage[targetLanguage];
      if (Array.isArray(translations) && translations[sentenceIndex]) {
        translationText = translations[sentenceIndex];
      }
    }

    // If no translation found, try to get from card translation
    if (!translationText && card.translation) {
      const cardTranslation = (card.translation as any)?.[targetLanguage];
      if (cardTranslation) {
        translationText = cardTranslation;
      }
    }

    // Skip if no translation available
    if (!translationText) continue;

    pairs.push({
      id: `translation-pair-${card.id}`,
      left: {
        id: `left-${card.id}`,
        content: card.sentence,
        type: "sentence",
      },
      right: {
        id: `right-${card.id}`,
        content: translationText,
        type: "translation",
      },
      articleId: article.id,
      articleTitle: article.title,
      audioUrl: article.audioUrl ? getAudioUrl(article.audioUrl) : undefined,
      startTime: card.startTime,
      endTime: card.endTime,
    });
  }

  return pairs;
}