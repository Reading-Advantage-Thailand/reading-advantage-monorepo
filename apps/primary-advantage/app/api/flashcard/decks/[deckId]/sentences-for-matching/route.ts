import { NextRequest, NextResponse } from "next/server";
import { db, eq, and, desc, isNotNull, sql } from '@reading-advantage/db';
import { flashcardDecks, flashcardCards, cardReviews, articles, userActivity, xpLogs, users } from '@reading-advantage/db';
import { currentUser } from "@/lib/session";
import { ActivityType } from "@/types/enum";
import { getAudioUrl } from "@/lib/storage-config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deckId } = await params;

    // Get translation language from query parameters
    const { searchParams } = new URL(request.url);
    const translationLanguage =
      (searchParams.get("language") as "th" | "vi" | "cn" | "tw") || "th";

    // Fetch deck (replaces Prisma `findFirst({ where, include.cards.include.reviews })`).
    const [deck] = await db.select().from(flashcardDecks)
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
    const cardRows = await db.select().from(flashcardCards)
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
      const reviewRows = await db.select().from(cardReviews)
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
    const shuffledGames = matchingGames.sort(() => Math.random() - 0.5);

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> },
) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deckId } = await params;
  const { score, timer } = await request.json();

  const xpEarned = Math.floor(score * 2);

  // Record user activity (replaces Prisma `userActivity.create`).
  const [userActivityRow] = await db.insert(userActivity).values({
    userId: user.id as string,
    activityType: ActivityType.SENTENCE_MATCHING,
    targetId: deckId,
    timer: timer,
    details: {
      timer: timer,
      score: score,
      xp: xpEarned,
    },
    completed: true,
  } as any).returning();

  // Create XP log entry (replaces Prisma `xPLogs.create`).
  await db.insert(xpLogs).values({
    userId: user.id as string,
    xpEarned: xpEarned,
    activityId: userActivityRow.id,
    activityType: ActivityType.SENTENCE_MATCHING,
  });

  // Increment user XP (replaces Prisma `user.update({ data: { xp: { increment } } })`).
  await db.update(users)
    .set({ xp: sql`${users.xp} + ${xpEarned}` })
    .where(eq(users.id, user.id as string));

  return NextResponse.json({ success: true });
}

// Helper function to create vocabulary matching pairs
async function createVocabularyPairs(
  vocabularyCards: any[],
  targetLanguage: string = "th",
) {
  const pairs = [];

  for (const card of vocabularyCards) {
    if (!card.word || !card.definition) continue;

    // Get the article for audio data (replaces Prisma `article.findUnique`).
    if (!card.articleId) continue;
    const [article] = await db.select({
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
async function createTranslationPairs(
  sentenceCards: any[],
  targetLanguage: string = "th",
) {
  const pairs = [];

  for (const card of sentenceCards) {
    if (!card.sentence) continue;

    // Get the article for translation data (replaces Prisma `article.findUnique`).
    if (!card.articleId) continue;
    const [article] = await db.select({
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