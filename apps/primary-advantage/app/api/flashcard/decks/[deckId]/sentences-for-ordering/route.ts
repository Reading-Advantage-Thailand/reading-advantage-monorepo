import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { ActivityType, FlashcardType } from "@/types/enum";
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

    // Get sentence flashcards that are due
    const deck = await prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
        type: "SENTENCE",
      },
      include: {
        cards: {
          where: {
            type: "SENTENCE",
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
        sentenceGroups: [],
        message: "No due sentence flashcards found",
      });
    }

    // Process each flashcard sentence individually
    const sentenceGroups = [];

    for (const flashcardCard of deck.cards) {
      // Get the full article with sentences
      const article = await prisma.article.findUnique({
        where: { id: flashcardCard.articleId! },
        select: {
          id: true,
          title: true,
          sentences: true,
          audioUrl: true,
          translatedPassage: true,
          cefrLevel: true,
        },
      });

      if (!article || !article.sentences) continue;

      const articleSentences = article.sentences as any[];

      // If less than 5 sentences total, skip this article
      if (articleSentences.length < 5) continue;

      // Find the index of the flashcard sentence in the article
      const flashcardSentenceIndex = articleSentences.findIndex(
        (s) => s.sentence === flashcardCard.sentence,
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
        flashcardSentence: flashcardCard.sentence,
        correctOrder: sentences.map((s) => s.text),
        sentences,
        difficulty: getDifficulty(article.cefrLevel),
        startIndex,
        flashcardIndex: flashcardSentenceIndex,
      });
    }

    // Shuffle the sentence groups
    const shuffledGroups = sentenceGroups.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      sentenceGroups: shuffledGroups,
      totalGroups: shuffledGroups.length,
    });
  } catch (error) {
    console.error("Error fetching sentences for ordering:", error);
    return NextResponse.json(
      { error: "Failed to fetch sentences" },
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
      activityType: ActivityType.SENTENCE_ORDERING,
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
      activityType: ActivityType.SENTENCE_ORDERING,
    },
  });

  await prisma.user.update({
    where: { id: user.id as string },
    data: { xp: { increment: xpEarned } },
  });

  return NextResponse.json({ success: true });
}
