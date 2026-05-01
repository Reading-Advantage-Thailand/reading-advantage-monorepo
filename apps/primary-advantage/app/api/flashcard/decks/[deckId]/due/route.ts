// app/api/flashcards/decks/[deckId]/due/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const deck = await prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
      },
      include: {
        cards: {
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

    // Get due cards using FSRS service
    const dueCards = fsrsService.getDueCards(deck.cards as any, limit);
    const stats = fsrsService.getDeckStats(deck.cards as any);

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
