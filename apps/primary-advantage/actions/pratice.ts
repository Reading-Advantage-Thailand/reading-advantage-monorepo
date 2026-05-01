"use server";

import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

interface OrderSentenceGameData {
  id: string;
  articleId: string;
  articleTitle: string;
  correctOrder: string[];
  sentences: Array<{
    id: string;
    text: string;
    translation?: {
      th?: string;
      cn?: string;
      tw?: string;
      vi?: string;
    };
    audioUrl?: string;
    startTime?: number;
    endTime?: number;
    isFromFlashcard?: boolean;
  }>;
  difficulty: "easy" | "medium" | "hard";
}

export async function getSentencesForOrderingGame(): Promise<{
  success: boolean;
  data?: OrderSentenceGameData[];
  error?: string;
}> {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Find user's sentence flashcard deck
    const deck = await prisma.flashcardDeck.findFirst({
      where: {
        userId: user.id,
        type: "SENTENCE",
      },
    });

    if (!deck) {
      return {
        success: false,
        error:
          "No sentence flashcard deck found. Create flashcards by reading articles first.",
      };
    }

    // Use the API endpoint we created
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/flashcard/decks/${deck.id}/sentences-for-ordering`,
      {
        headers: {
          Cookie: `next-auth.session-token=${user.id}`, // You might need to adjust this based on your auth setup
        },
      },
    );

    if (!response.ok) {
      return {
        success: false,
        error: "Failed to fetch sentences for ordering game",
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: data.sentenceGroups || [],
    };
  } catch (error) {
    console.error("Error getting sentences for ordering game:", error);
    return {
      success: false,
      error: "Failed to get sentences for ordering game",
    };
  }
}

export async function getFlashcardDeckId(): Promise<{
  success: boolean;
  deckId?: string;
  error?: string;
}> {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Find user's sentence flashcard deck
    const deck = await prisma.flashcardDeck.findFirst({
      where: {
        userId: user.id,
        type: "SENTENCE",
      },
    });

    if (!deck) {
      return {
        success: false,
        error: "No sentence flashcard deck found",
      };
    }

    return {
      success: true,
      deckId: deck.id,
    };
  } catch (error) {
    console.error("Error getting flashcard deck:", error);
    return {
      success: false,
      error: "Failed to get flashcard deck",
    };
  }
}
