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

    // Get difficulty from query parameters
    const { searchParams } = new URL(request.url);
    const difficulty =
      (searchParams.get("difficulty") as "easy" | "medium" | "hard") ||
      "medium";

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
            // due: { lte: new Date() },
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
        clozeTests: [],
        message: "No due sentence flashcards found",
      });
    }

    // Process each flashcard sentence to create cloze tests
    const clozeTests = [];

    for (const flashcardCard of deck.cards) {
      // Get the full article with sentences
      const article = await prisma.article.findUnique({
        where: { id: flashcardCard.articleId! },
        select: {
          id: true,
          title: true,
          cefrLevel: true,
        },
      });

      if (!article || !flashcardCard.sentence) continue;

      // const sentence = flashcardCard.sentence;
      // const articleSentences = article.sentences as any[];

      // Find the matching sentence in the article to get word timing data
      // const matchingSentence = articleSentences.find(
      //   (s) => s.sentence === sentence,
      // );

      // if (!matchingSentence || !matchingSentence.words) continue;

      // Create blanks from the sentence using the words array
      // const blanks = createBlanksFromSentence(
      //   sentence,
      //   matchingSentence.words,
      //   articleSentences, // Pass all sentences for generating distractors
      //   difficulty, // Pass user-selected difficulty
      // );

      // if (blanks.length === 0) continue; // Skip if no suitable words for blanking

      // Get translation for the sentence
      // const sentenceIndex = articleSentences.findIndex(
      //   (s) => s.sentence === sentence,
      // );

      // const translation =
      //   sentenceIndex >= 0
      //     ? {
      //         th: (article.translatedPassage as any)?.th?.[sentenceIndex],
      //         cn: (article.translatedPassage as any)?.cn?.[sentenceIndex],
      //         tw: (article.translatedPassage as any)?.tw?.[sentenceIndex],
      //         vi: (article.translatedPassage as any)?.vi?.[sentenceIndex],
      //       }
      //     : undefined;

      clozeTests.push({
        id: `${article.id}-${flashcardCard.id}-${Date.now()}-${Math.random()}`,
        articleId: article.id,
        articleTitle: article.title,
        sentence: flashcardCard.sentence,
        // words: matchingSentence.words,
        blanks: [],
        translation: flashcardCard.translation,
        audioUrl: getAudioUrl(flashcardCard.audioUrl || ""),
        startTime: flashcardCard.startTime,
        endTime: flashcardCard.endTime,
        difficulty: difficulty,
      });
    }

    // Shuffle the cloze tests
    const shuffledTests = clozeTests.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      clozeTests: shuffledTests,
      totalTests: shuffledTests.length,
      // difficulty: difficulty,
    });
  } catch (error) {
    console.error("Error fetching sentences for cloze test:", error);
    return NextResponse.json(
      { error: "Failed to fetch sentences for cloze test" },
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
      activityType: ActivityType.SENTENCE_CLOZE_TEST,
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
      activityType: ActivityType.SENTENCE_CLOZE_TEST,
    },
  });

  await prisma.user.update({
    where: { id: user.id as string },
    data: { xp: { increment: xpEarned } },
  });

  return NextResponse.json({ success: true });
}

// Helper function to create blanks from a sentence using the words array
function createBlanksFromSentence(
  sentence: string,
  words: any[],
  allSentences: any[],
  difficulty: "easy" | "medium" | "hard" = "medium",
) {
  const blanks: any[] = [];

  // Get all words from all sentences for generating distractors
  const allWords = allSentences.flatMap((s) => s.words || []);

  // Filter words that are good candidates for blanking
  // (longer than 2 characters, not common function words)
  const candidateWords = words.filter((wordObj) => {
    const word = wordObj.word.toLowerCase();
    const commonWords = [
      "the",
      "and",
      "for",
      "are",
      "but",
      "not",
      "you",
      "all",
      "can",
      "had",
      "her",
      "was",
      "one",
      "our",
      "out",
      "day",
      "get",
      "has",
      "him",
      "his",
      "how",
      "its",
      "may",
      "new",
      "now",
      "old",
      "see",
      "two",
      "way",
      "who",
      "boy",
      "did",
      "man",
      "end",
      "few",
      "run",
      "own",
      "say",
      "she",
      "too",
      "use",
      "her",
      "many",
      "some",
      "time",
      "very",
      "when",
      "much",
      "know",
      "take",
      "than",
      "only",
      "think",
      "also",
      "back",
      "after",
      "first",
      "well",
      "year",
      "work",
      "such",
      "make",
      "even",
      "most",
      "give",
    ];

    return (
      word.length > 2 && !commonWords.includes(word) && /^[a-zA-Z]+$/.test(word)
    ); // Only alphabetic words
  });

  // Determine number of blanks based on user-selected difficulty
  const getBlankCount = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return 1;
      case "medium":
        return 2;
      case "hard":
        return 3;
      default:
        return 2;
    }
  };

  const blankCount = getBlankCount(difficulty);

  // Select up to 1 words to blank out randomly
  const selectedWords = candidateWords
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(blankCount, candidateWords.length));

  selectedWords.forEach((wordObj, blankIndex) => {
    // Find the position of this word in the sentence
    const wordPosition = sentence.indexOf(wordObj.word);

    if (wordPosition !== -1) {
      // Generate distractor options
      const options = generateOptions(wordObj.word, allWords);

      blanks.push({
        id: `blank-${blankIndex}`,
        position: wordPosition,
        correctAnswer: wordObj.word,
        options: options,
        hint: `Word that sounds like it starts at ${wordObj.start.toFixed(1)}s`, // Simple hint based on timing
      });
    }
  });

  return blanks.sort((a, b) => a.position - b.position);
}

// Helper function to generate multiple choice options
function generateOptions(correctAnswer: string, allWords: any[]) {
  const options = [correctAnswer];

  // Find similar words from all sentences as distractors
  const potentialDistractors = allWords
    .filter(
      (wordObj) =>
        wordObj.word &&
        wordObj.word !== correctAnswer &&
        wordObj.word.length >= correctAnswer.length - 2 && // Similar length
        wordObj.word.length <= correctAnswer.length + 2 &&
        /^[a-zA-Z]+$/.test(wordObj.word), // Only alphabetic words
    )
    .map((wordObj) => wordObj.word)
    .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
    .sort(() => Math.random() - 0.5);

  // Add up to 3 distractors
  for (let i = 0; i < Math.min(3, potentialDistractors.length); i++) {
    if (options.length < 4) {
      options.push(potentialDistractors[i]);
    }
  }

  // If we don't have enough options, add some generic distractors
  if (options.length < 4) {
    const genericDistractors = generateGenericDistractors(correctAnswer);
    for (const distractor of genericDistractors) {
      if (options.length < 4 && !options.includes(distractor)) {
        options.push(distractor);
      }
    }
  }

  // Shuffle the options so correct answer isn't always first
  return options.sort(() => Math.random() - 0.5);
}

// Helper function to generate generic distractors when we don't have enough from word list
function generateGenericDistractors(correctAnswer: string): string[] {
  const distractors = [];

  // Common English words that could serve as distractors
  const commonWords = [
    "important",
    "different",
    "following",
    "complete",
    "usually",
    "without",
    "second",
    "enough",
    "while",
    "should",
    "family",
    "those",
    "might",
    "great",
    "where",
    "right",
    "during",
    "before",
    "place",
    "again",
    "change",
    "small",
    "found",
    "every",
    "large",
    "between",
    "another",
    "being",
    "point",
    "world",
    "help",
    "through",
    "system",
    "each",
    "still",
    "learn",
    "water",
    "part",
    "today",
    "information",
    "nothing",
    "including",
    "though",
    "business",
    "process",
    "service",
    "house",
    "based",
    "around",
    "never",
    "possible",
    "head",
    "money",
    "story",
  ];

  // Filter words that are similar in length and different from correct answer
  const filtered = commonWords.filter(
    (word) =>
      word !== correctAnswer.toLowerCase() &&
      Math.abs(word.length - correctAnswer.length) <= 2,
  );

  return filtered.slice(0, 3);
}
