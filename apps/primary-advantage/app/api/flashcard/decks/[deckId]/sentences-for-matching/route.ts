import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    // Get both sentence and vocabulary flashcards that are due
    const deck = await prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
      },
      include: {
        cards: {
          where: {
            due: { lte: new Date() },
            articleId: { not: null },
          },
          include: {
            reviews: {
              orderBy: { reviewedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    if (deck.cards.length === 0) {
      return NextResponse.json({
        matchingGames: [],
        message: "No due flashcards found",
      });
    }

    // Separate vocabulary and sentence cards
    const vocabularyCards = deck.cards.filter(
      (card) => card.type === "VOCABULARY",
    );
    const sentenceCards = deck.cards.filter((card) => card.type === "SENTENCE");

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

  const userActivity = await prisma.userActivity.create({
    data: {
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
    },
  });

  await prisma.xPLogs.create({
    data: {
      userId: user.id as string,
      xpEarned: xpEarned,
      activityId: userActivity.id,
      activityType: ActivityType.SENTENCE_MATCHING,
    },
  });

  await prisma.user.update({
    where: { id: user.id as string },
    data: { xp: { increment: xpEarned } },
  });

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

    // Get the article for audio data
    const article = await prisma.article.findUnique({
      where: { id: card.articleId },
      select: {
        id: true,
        title: true,
        audioUrl: true,
        words: true,
      },
    });

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

    // Get the article for translation data
    const article = await prisma.article.findUnique({
      where: { id: card.articleId },
      select: {
        id: true,
        title: true,
        sentences: true,
        translatedPassage: true,
        audioUrl: true,
      },
    });

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
