import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, isNotNull, sql } from 'drizzle-orm';
import { flashcardDecks, flashcardCards, cardReviews, articles, userActivity, xpLogs, users } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';
import { currentUser } from "@/lib/session";
import { resolveFlashcardGameXpAward } from "@/lib/authorization";
import { ActivityType, FlashcardType } from "@/types/enum";
import { getAudioUrl } from "@/lib/storage-config";
import { shuffle } from "@/lib/shuffle";

/**
 * Returns shuffled sentence-ordering groups from the caller's deck.
 * @param request Incoming request (no query validated here).
 * @param params Route params carrying the deck id.
 * @returns The sentence groups or a structured error response.
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
          eq(flashcardDecks.type, "SENTENCE"),
        ),
      )
      .limit(1);

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    // Fetch cards for the deck. Shared-partial filters (type, due, articleId)
    // are applied client-side since those columns aren't on the shared schema yet.
    const cardRows = await flashDb.select().from(flashcardCards)
      .where(eq(flashcardCards.deckId, deck.id));
    const now = new Date();
    const sentenceCards = (cardRows as any[]).filter(
      (c) =>
        (c.type === undefined || c.type === "SENTENCE") &&
        c.due &&
        new Date(c.due) <= now &&
        c.articleId != null,
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

    const cards = sentenceCards.map((c) => ({
      ...c,
      reviews: reviewsByCard.has(c.id) ? [reviewsByCard.get(c.id)] : [],
    }));

    if (cards.length === 0) {
      return NextResponse.json({
        sentenceGroups: [],
        message: "No due sentence flashcards found",
      });
    }

    // Process each flashcard sentence individually
    const sentenceGroups = [];

    for (const flashcardCard of cards) {
      // Card rows only carry front/back/sourceId; the sentence text lives
      // in front and the article id in sourceId.
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

      if (!article || !article.sentences) continue;

      const articleSentences = article.sentences as any[];

      // If less than 5 sentences total, skip this article
      if (articleSentences.length < 5) continue;

      // Find the index of the flashcard sentence in the article
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
        flashcardSentence: flashcardCard.front,
        correctOrder: sentences.map((s) => s.text),
        sentences,
        difficulty: getDifficulty(article.cefrLevel as string),
        startIndex,
        flashcardIndex: flashcardSentenceIndex,
      });
    }

    // Shuffle the sentence groups
    const shuffledGroups = shuffle(sentenceGroups);

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

/**
 * Records a completed sentence-ordering game and awards server-side XP.
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
    activityType: ActivityType.SENTENCE_ORDERING,
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
    activityType: ActivityType.SENTENCE_ORDERING,
  });

  // Increment user XP (replaces Prisma `user.update({ data: { xp: { increment } } })`).
  // users is FLAT; TenantDB scopes the increment to the caller's school.
  await tenantDb.update(users)
    .set({ xp: sql`${users.xp} + ${xpEarned}` })
    .where(eq(users.id, user.id as string));

  return NextResponse.json({ success: true });
}