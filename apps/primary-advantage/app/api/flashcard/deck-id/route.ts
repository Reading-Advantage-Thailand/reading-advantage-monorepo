import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { db, eq, and, lte, sql } from '@reading-advantage/db';
import { flashcardDecks, flashcardCards } from '@reading-advantage/db';

export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    // Find user's sentence flashcard deck
    const [deck] = await db.select().from(flashcardDecks)
      .where(
        and(
          eq(flashcardDecks.userId, user.id),
          eq(flashcardDecks.type, "SENTENCE"),
        ),
      )
      .limit(1);

    if (!deck) {
      return NextResponse.json({
        success: false,
        error:
          "No sentence flashcard deck found. Create flashcards by reading articles first.",
      });
    }

    // Fetch up to 1 due card (replaces Prisma `cards.where.due.lte` filter via
    // a raw SQL filter since `due` is a shared-partial column not in the
    // shared schema yet).
    const now = new Date();
    const dueCards = await db.select({ id: flashcardCards.id })
      .from(flashcardCards)
      .where(
        and(
          eq(flashcardCards.deckId, deck.id),
          sql`${flashcardCards.id} IN (SELECT id FROM flashcard_cards WHERE deck_id = ${deck.id} AND due <= ${now.toISOString()})`,
        ),
      )
      .limit(1);

    if (dueCards.length === 0) {
      return NextResponse.json({
        success: false,
        error:
          "No due sentence flashcards found. Study some flashcards or read more articles.",
      });
    }

    return NextResponse.json({
      success: true,
      deckId: deck.id,
    });
  } catch (error) {
    console.error("Error getting flashcard deck ID:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get flashcard deck information",
      },
      { status: 500 },
    );
  }
}