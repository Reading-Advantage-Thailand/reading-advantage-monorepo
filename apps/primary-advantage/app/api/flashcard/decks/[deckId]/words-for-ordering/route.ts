import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { ActivityType } from "@/types/enum";
import { getAudioUrl } from "@/lib/storage-config";

// Helper function to tokenize a sentence into words
function tokenizeSentence(sentence: string) {
  // Split by spaces and filter out empty strings, while preserving punctuation
  const tokens = sentence
    .split(/(\s+)/)
    .filter((token) => token.trim().length > 0)
    .map((token) => token.trim());

  return tokens;
}

// Helper function to determine part of speech (simplified)
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
        sentences: [],
        message: "No due sentence flashcards found",
      });
    }

    // Process each flashcard sentence
    const sentences = [];

    for (const flashcardCard of deck.cards) {
      // Get the article for context and translations
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

      if (!article) continue;

      const sentence = flashcardCard.sentence;

      // Skip very short sentences (less than 3 words)
      const words = tokenizeSentence(sentence as string);
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
          audioUrl: getAudioUrl(flashcardCard.audioUrl || ""),
          startTime: flashcardCard.startTime,
          endTime: flashcardCard.endTime,
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
        difficulty: getDifficulty(words.length, article.cefrLevel),
        context: context,
        // Add sentence-level translations
        sentenceTranslations: flashcardCard.translation,
      });
    }

    // Shuffle the sentences
    const shuffledSentences = sentences.sort(() => Math.random() - 0.5);

    // Limit to reasonable number for game session
    const limitedSentences = shuffledSentences.slice(0, 20);

    return NextResponse.json({
      sentences: limitedSentences,
      totalSentences: limitedSentences.length,
    });
  } catch (error) {
    console.error("Error fetching words for ordering:", error);
    return NextResponse.json(
      { error: "Failed to fetch words for ordering" },
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
      activityType: ActivityType.SENTENCE_WORD_ORDERING,
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
      activityType: ActivityType.SENTENCE_WORD_ORDERING,
    },
  });

  await prisma.user.update({
    where: { id: user.id as string },
    data: { xp: { increment: xpEarned } },
  });

  return NextResponse.json({ success: true });
}
