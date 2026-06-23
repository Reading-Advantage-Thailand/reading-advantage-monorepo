// app/api/flashcards/cards/[cardId]/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, eq, and, sql } from '@reading-advantage/db';
import { flashcardCards, flashcardDecks, cardReviews, userActivity, xpLogs, users } from '@reading-advantage/db';
import { currentUser } from "@/lib/session";
import { fsrsService } from "@/lib/fsrs-service";
import { Rating } from "ts-fsrs";
import { ActivityType } from "@/types/enum";
import { FlashcardCard } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rating, timeSpent } = await request.json();
    const { cardId } = await params;

    // Validate rating
    if (![1, 2, 3, 4].includes(rating)) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    // Get the card with deck join (replaces Prisma `findFirst({ where, deck.userId })`
    // and `include.deck`).
    const [cardRow] = await db.select({
      card: flashcardCards,
      deck: flashcardDecks,
    })
      .from(flashcardCards)
      .innerJoin(flashcardDecks, eq(flashcardDecks.id, flashcardCards.deckId))
      .where(
        and(
          eq(flashcardCards.id, cardId),
          eq(flashcardDecks.userId, user.id),
        ),
      )
      .limit(1);

    const card = cardRow ? { ...cardRow.card, deck: cardRow.deck } : null;

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Process the review with FSRS
    const { updatedCard, reviewLog } = fsrsService.processReview(
      card as any,
      rating as Rating,
      new Date(),
    );

    // Update card and create review record in Drizzle transaction.
    // Shared-partial FSRS columns (due/stability/etc.) and content fields
    // (type/articleId/audioUrl/etc.) are attached via `as any` casts since
    // they aren't yet on the shared schema.
    const result = await db.transaction(async (tx) => {
      // Update the card
      const [updated] = await tx.update(flashcardCards)
        .set({
          due: updatedCard.due,
          stability: updatedCard.stability,
          difficulty: updatedCard.difficulty,
          elapsedDays: updatedCard.elapsedDays,
          scheduledDays: updatedCard.scheduledDays,
          reps: updatedCard.reps,
          lapses: updatedCard.lapses,
          state: updatedCard.state,
          lastReview: updatedCard.lastReview,
        } as any)
        .where(eq(flashcardCards.id, cardId))
        .returning();

      // Create review record
      const [review] = await tx.insert(cardReviews).values({
        cardId,
        rating,
        timeSpent,
        reviewedAt: new Date(),
      } as any).returning();

      // Record user activity
      await tx.insert(userActivity).values({
        userId: user.id!,
        activityType:
          (card as any).type === "VOCABULARY"
            ? ActivityType.VOCABULARY_FLASHCARDS
            : ActivityType.SENTENCE_FLASHCARDS,
        targetId: cardId,
        timer: timeSpent,
        completed: true,
        details: {
          rating,
          previousState: (card as any).state,
          newState: updatedCard.state,
          intervalDays: updatedCard.scheduledDays,
        },
      });

      // Award XP
      const xpReward = (card as any).type === "VOCABULARY" ? 15 : 15;
      await tx.insert(xpLogs).values({
        userId: user.id!,
        xpEarned: xpReward,
        activityId: cardId,
        activityType:
          (card as any).type === "VOCABULARY"
            ? ActivityType.VOCABULARY_FLASHCARDS
            : ActivityType.SENTENCE_FLASHCARDS,
      } as any);

      // Update user XP (replaces Prisma `{ increment: xpReward }`)
      await tx.update(users)
        .set({ xp: sql`${users.xp} + ${xpReward}` })
        .where(eq(users.id, user.id!));

      return { card: updated, review, reviewLog };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing card review:", error);
    return NextResponse.json(
      { error: "Failed to process review" },
      { status: 500 },
    );
  }
}