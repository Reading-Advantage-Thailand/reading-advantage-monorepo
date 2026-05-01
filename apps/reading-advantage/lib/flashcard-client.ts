"use client";

// Client-side helper for flashcard actions
export async function reviewCardClient(cardId: string, rating: number, type: 'vocabulary' | 'sentences') {
  try {
    const response = await fetch('/api/v1/flashcard/progress/client', {
      method: 'POST',
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
