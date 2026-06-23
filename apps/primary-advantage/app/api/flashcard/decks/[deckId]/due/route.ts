// app/api/flashcards/decks/[deckId]/due/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, eq, and, desc } from '@reading-advantage/db';
import { flashcardDecks, flashcardCards, cardReviews } from '@reading-advantage/db';
import { currentUser } from "@/lib/session";
import { fsrsService } from "@/lib/fsrs-service";

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

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;

    // Fetch deck (replaces Prisma `findFirst({ where, userId })`).
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

    // Fetch cards for the deck (replaces Prisma `include.cards`).
    const cards = await db.select().from(flashcardCards)
      .where(eq(flashcardCards.deckId, deck.id));

    // Fetch the most-recent review per card via a join + orderBy desc + limit 1
    // (replaces Prisma `include.cards.include.reviews`).
    const cardIds = cards.map((c) => c.id);
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