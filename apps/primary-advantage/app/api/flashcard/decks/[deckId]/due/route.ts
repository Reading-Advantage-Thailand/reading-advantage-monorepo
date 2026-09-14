// app/api/flashcards/decks/[deckId]/due/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from 'drizzle-orm';
import { flashcardDecks, flashcardCards, cardReviews } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';
import { currentUser } from "@/lib/session";
import { fsrsService } from "@/lib/fsrs-service";

/**
 * Returns the due FSRS cards and deck stats for the caller's deck.
 * @param request Request with an optional card limit query.
 * @param params Route params carrying the deck id.
 * @returns The deck with due cards and stats, or an error response.
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

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;

    // Fetch deck (replaces Prisma `findFirst({ where, userId })`).
    const tenantDb = getTenantDB({ schoolId: user.schoolId });
    // flashcardDecks, flashcardCards, and cardReviews are REFERENTIAL
    // (no schoolId); scoping below uses the caller userId and deckId/cardId
    // owner filters.
    const flashDb = getUnscopedDB("flashcardDecks, flashcardCards, and cardReviews have no schoolId; scoped via userId, deckId, and cardId owner filters");
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

    // Fetch cards for the deck (replaces Prisma `include.cards`).
    const cards = await flashDb.select().from(flashcardCards)
      .where(eq(flashcardCards.deckId, deck.id));

    // Fetch the most-recent review per card via a join + orderBy desc + limit 1
    // (replaces Prisma `include.cards.include.reviews`).
    const cardIds = cards.map((c) => c.id);
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
    const cardsWithReviews = cards.map((c) => ({
      ...c,
      reviews: reviewsByCard.has(c.id) ? [reviewsByCard.get(c.id)] : [],
    }));

    // Get due cards using FSRS service
    const dueCards = fsrsService.getDueCards(cardsWithReviews as any, limit);
    const stats = fsrsService.getDeckStats(cardsWithReviews as any);

    return NextResponse.json({
      deck: {
        id: deck.id,
        name: deck.name,
        type: deck.type,
      },
      cards: dueCards,
      stats,
    });
  } catch (error) {
    console.error("Error fetching due cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch due cards" },
      { status: 500 },
    );
  }
}