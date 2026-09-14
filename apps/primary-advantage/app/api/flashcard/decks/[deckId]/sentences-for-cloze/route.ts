import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, sql } from 'drizzle-orm';
import { flashcardDecks, flashcardCards, cardReviews, articles, userActivity, xpLogs, users } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';
import { currentUser } from "@/lib/session";
import { resolveFlashcardGameXpAward } from "@/lib/authorization";
import { ActivityType } from "@/types/enum";
import { getAudioUrl } from "@/lib/storage-config";
import { shuffle } from "@/lib/shuffle";
import { toTranslationLanguage } from "@/lib/translation-language";

/**
 * Returns shuffled cloze tests built from the caller's sentence flashcards.
 * @param request Request with difficulty and locale query.
 * @param params Route params carrying the deck id.
 * @returns The cloze tests or a structured error response.
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

    // Get difficulty from query parameters
    const { searchParams } = new URL(request.url);
    const difficulty =
      (searchParams.get("difficulty") as "easy" | "medium" | "hard") ||
      "medium";
    const locale = searchParams.get("locale") ?? "th";

    // Fetch the deck (replaces Prisma `findFirst({ where, include.cards.include.reviews })`).
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
          eq(flashcardDecks.type, "SENTENCE"),
        ),
      )
      .limit(1);

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    // Fetch cards for the deck (shared-partial `type` filter applied client-side).
    const cardRows = await flashDb.select().from(flashcardCards)
      .where(eq(flashcardCards.deckId, deck.id));
    const sentenceCards = (cardRows as any[]).filter(
      (c) => (c.type === undefined || c.type === "SENTENCE"),
    );

    // Fetch most-recent review per card.
    const cardIds = sentenceCards.map((c) => c.id);
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

    const cardsWithReviews = sentenceCards.map((c) => ({
      ...c,
      reviews: reviewsByCard.has(c.id) ? [reviewsByCard.get(c.id)] : [],
    }));

    if (cardsWithReviews.length === 0) {
      return NextResponse.json({
        clozeTests: [],
        message: "No due sentence flashcards found",
      });
    }

    // Process each flashcard sentence to create cloze tests
    const clozeTests = [];

    for (const flashcardCard of cardsWithReviews) {
      // Card rows only carry front/back/sourceId; recover the audio slice
      // and translation from the article snapshot matched by front text.
      const articleId = flashcardCard.sourceId;
      if (!articleId) continue;
      const [article] = await flashDb.select({
        id: articles.id,
        title: articles.title,
        sentences: articles.sentences,
        audioUrl: articles.audioUrl,
        translatedPassage: articles.translatedPassage,
        cefrLevel: articles.cefrLevel,
      })
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);

      if (!article || !flashcardCard.front) continue;

      const articleSentences = article.sentences as Array<{
        sentence: string;
        startTime: number;
        endTime: number;
      }>;
      const sentenceIndex = articleSentences.findIndex(
        (s) => s.sentence === flashcardCard.front,
      );
      const sentenceData =
        sentenceIndex === -1 ? undefined : articleSentences[sentenceIndex];

      clozeTests.push({
        id: `${article.id}-${flashcardCard.id}-${Date.now()}-${Math.random()}`,
        articleId: article.id,
        articleTitle: article.title,
        sentence: flashcardCard.front,
        // words: matchingSentence.words,
        blanks: [],
        translation: (article.translatedPassage as Record<string, string[]> | null)?.[toTranslationLanguage(locale)]?.[sentenceIndex],
        audioUrl: getAudioUrl(article.audioUrl || ""),
        startTime: sentenceData?.startTime ?? 0,
        endTime: sentenceData?.endTime ?? 0,
        difficulty: difficulty,
      });
    }

    // Shuffle the cloze tests
    const shuffledTests = shuffle(clozeTests);

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

/**
 * Records a completed cloze test and awards server-side XP.
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
    activityType: ActivityType.SENTENCE_CLOZE_TEST,
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
    activityType: ActivityType.SENTENCE_CLOZE_TEST,
  });

  // Increment user XP (replaces Prisma `user.update({ data: { xp: { increment } } })`).
  // users is FLAT; TenantDB scopes the increment to the caller's school.
  await tenantDb.update(users)
    .set({ xp: sql`${users.xp} + ${xpEarned}` })
    .where(eq(users.id, user.id as string));

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
  const selectedWords = shuffle(candidateWords)
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
  const potentialDistractors = shuffle(
    allWords
      .filter(
        (wordObj) =>
          wordObj.word &&
          wordObj.word !== correctAnswer &&
          wordObj.word.length >= correctAnswer.length - 2 && // Similar length
          wordObj.word.length <= correctAnswer.length + 2 &&
          /^[a-zA-Z]+$/.test(wordObj.word), // Only alphabetic words
      )
      .map((wordObj) => wordObj.word)
      .filter((word, index, arr) => arr.indexOf(word) === index), // Remove duplicates
  );

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
  return shuffle(options);
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