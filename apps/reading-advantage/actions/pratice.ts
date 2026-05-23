"use server";

import { getCurrentUser } from "@/lib/session";
import { db, eq } from "@reading-advantage/db";
import { userSentenceRecords } from "@reading-advantage/db/schema";

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
    const user = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Find user's sentence flashcard deck by checking for sentence records
    const [sentences] = await db
      .select()
      .from(userSentenceRecords)
      .where(eq(userSentenceRecords.userId, user.id))
      .limit(1);

    if (!sentences) {
      return {
        success: false,
        error:
          "No sentence flashcard deck found. Create flashcards by reading articles first.",
      };
    }

    // Use the API endpoint we created
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/v1/flashcard/decks/${user.id}/sentences-for-ordering`,
      {
        headers: {
          Cookie: `session_token=${user.id}`,
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
    const user = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Find user's sentence flashcard deck by checking for sentence records
    const [sentences] = await db
      .select()
      .from(userSentenceRecords)
      .where(eq(userSentenceRecords.userId, user.id))
      .limit(1);

    if (!sentences) {
      return {
        success: false,
        error: "No sentence flashcard deck found",
      };
    }

    return {
      success: true,
      deckId: user.id, // Use user ID as deck ID for now
    };
  } catch (error) {
    console.error("Error getting flashcard deck:", error);
    return {
      success: false,
      error: "Failed to get flashcard deck",
    };
  }
}
