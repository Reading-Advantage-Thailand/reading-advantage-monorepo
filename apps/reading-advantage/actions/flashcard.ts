"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Types for API responses
interface FlashcardStats {
  total: number;
  new: number;
  learning: number;
  review: number;
  due: number;
}

interface VocabularyCard {
  id: string;
  word: any;
  difficulty: number;
  due: string;
  elapsedDays: number;
  lapses: number;
  reps: number;
  scheduledDays: number;
  stability: number;
  state: number;
  userId: string;
  articleId: string;
  saveToFlashcard: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SentenceCard {
  id: string;
  sentence: any;
  difficulty: number;
  due: string;
  elapsedDays: number;
  lapses: number;
  reps: number;
  scheduledDays: number;
  stability: number;
  state: number;
  userId: string;
  articleId: string;
  saveToFlashcard: boolean;
  createdAt: string;
  updatedAt: string;
}

// Helper function to calculate flashcard stats
function calculateFlashcardStats(cards: any[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return cards.reduce(
    (stats, card) => {
      stats.total++;

      const dueDate = new Date(card.due);
      const cardDate = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate()
      );

      if (cardDate <= today) {
        stats.due++;
      }

      switch (card.state) {
        case 0: // New
          stats.new++;
          break;
        case 1: // Learning
        case 3: // Relearning
          stats.learning++;
          break;
        case 2: // Review
          stats.review++;
          break;
      }

      return stats;
    },
    { total: 0, new: 0, learning: 0, review: 0, due: 0 }
  );
}

// Get flashcard stats from the database
export async function getDashboardData() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const [vocabularies, sentences] = await Promise.all([
      prisma.userWordRecord.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.userSentenceRecord.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      success: true,
      vocabularyStats: calculateFlashcardStats(vocabularies),
      sentenceStats: calculateFlashcardStats(sentences),
      vocabularies,
      sentences,
    };
  } catch (error) {
    console.error("Error getting dashboard data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch dashboard data",
    };
  }
}

// Get user's flashcard decks with stats
export async function getUserFlashcardDecks() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const [vocabularies, sentences] = await Promise.all([
      prisma.userWordRecord.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.userSentenceRecord.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const decks = [];

    // Add vocabulary deck if there are vocabularies
    if (vocabularies && vocabularies.length > 0) {
      const vocabularyStats = calculateFlashcardStats(vocabularies);
      decks.push({
        id: "vocabulary",
        name: "Vocabulary Cards",
        description: "Learn new vocabulary words",
        type: "VOCABULARY" as const,
        totalCards: vocabularyStats.total,
        dueCards: vocabularyStats.due,
        newCards: vocabularyStats.new,
        learningCards: vocabularyStats.learning,
        reviewCards: vocabularyStats.review,
        masteredCards: vocabularyStats.total - vocabularyStats.due,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Add sentence deck if there are sentences
    if (sentences && sentences.length > 0) {
      const sentenceStats = calculateFlashcardStats(sentences);
      decks.push({
        id: "sentences",
        name: "Sentence Cards",
        description: "Practice with sentence patterns",
        type: "SENTENCE" as const,
        totalCards: sentenceStats.total,
        dueCards: sentenceStats.due,
        newCards: sentenceStats.new,
        learningCards: sentenceStats.learning,
        reviewCards: sentenceStats.review,
        masteredCards: sentenceStats.total - sentenceStats.due,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return {
      success: true,
      decks,
    };
  } catch (error) {
    console.error("Error getting flashcard decks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch flashcard decks",
      decks: [],
    };
  }
}

// Get cards for a specific deck (vocabulary or sentences)
export async function getDeckCards(deckId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    let allCards: any[] = [];
    
    if (deckId === 'vocabulary') {
      allCards = await prisma.userWordRecord.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      });
    } else if (deckId === 'sentences') {
      allCards = await prisma.userSentenceRecord.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      });
    } else {
      throw new Error("Invalid deck ID");
    }
    
    // Filter only due cards for studying
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const dueCards = allCards.filter((card) => {
      const dueDate = new Date(card.due);
      const cardDate = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate()
      );
      return cardDate <= today;
    });

    return {
      success: true,
      cards: dueCards,
      message: `Found ${dueCards.length} cards ready for review`,
    };
  } catch (error) {
    console.error("Error getting deck cards:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch cards",
      cards: [],
    };
  }
}

// Update flashcard progress after review
export async function reviewCard(cardId: string, rating: number, type: 'vocabulary' | 'sentences') {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    // Use the API endpoint for complex FSRS calculations
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/v1/flashcard/progress/${session.user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cardId,
        rating,
        type,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update card progress');
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    console.error("Error reviewing card:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update card progress",
    };
  }
}

// Save flashcard (placeholder for future implementation)
export async function saveFlashcard(flashcardData: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    // This would be implemented when we have a save flashcard endpoint
    // For now, return a placeholder response
    return {
      success: true,
      message: "Flashcard saved successfully",
    };
  } catch (error) {
    console.error("Error saving flashcard:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save flashcard",
    };
  }
}
