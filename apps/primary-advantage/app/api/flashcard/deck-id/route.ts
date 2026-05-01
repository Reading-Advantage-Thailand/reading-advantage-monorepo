import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

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
    const deck = await prisma.flashcardDeck.findFirst({
      where: {
        userId: user.id,
        type: "SENTENCE",
      },
      include: {
        cards: {
          where: {
            due: { lte: new Date() },
          },
          take: 1, // Just check if there are any due cards
        },
      },
    });

    if (!deck) {
      return NextResponse.json({
        success: false,
        error:
          "No sentence flashcard deck found. Create flashcards by reading articles first.",
      });
    }

    if (deck.cards.length === 0) {
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
