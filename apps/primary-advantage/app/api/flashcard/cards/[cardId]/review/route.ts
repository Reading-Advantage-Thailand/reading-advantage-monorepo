// app/api/flashcards/cards/[cardId]/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    // Get the card
    const card = await prisma.flashcardCard.findFirst({
      where: {
        id: cardId,
        deck: { userId: user.id },
      },
      include: {
        deck: true,
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Process the review with FSRS
    const { updatedCard, reviewLog } = fsrsService.processReview(
      card as any,
      rating as Rating,
      new Date(),
    );

    // Update card and create review record in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the card
      const updated = await tx.flashcardCard.update({
        where: { id: cardId },
        data: {
          due: updatedCard.due,
          stability: updatedCard.stability,
          difficulty: updatedCard.difficulty,
          elapsedDays: updatedCard.elapsedDays,
          scheduledDays: updatedCard.scheduledDays,
          reps: updatedCard.reps,
          lapses: updatedCard.lapses,
          state: updatedCard.state,
          lastReview: updatedCard.lastReview,
        },
      });

      // Create review record
      const review = await tx.cardReview.create({
        data: {
          cardId,
          rating,
          timeSpent,
          reviewedAt: new Date(),
        },
      });

      // Record user activity
      await tx.userActivity.create({
        data: {
          userId: user.id!,
          activityType:
            card.type === "VOCABULARY"
              ? ActivityType.VOCABULARY_FLASHCARDS
              : ActivityType.SENTENCE_FLASHCARDS,
          targetId: cardId,
          timer: timeSpent,
          completed: true,
          details: {
            rating,
            previousState: card.state,
            newState: updatedCard.state,
            intervalDays: updatedCard.scheduledDays,
          },
        },
      });

      // Award XP
      const xpReward = card.type === "VOCABULARY" ? 15 : 15;
      await tx.xPLogs.create({
        data: {
          userId: user.id!,
          xpEarned: xpReward,
          activityId: cardId,
          activityType:
            card.type === "VOCABULARY"
              ? ActivityType.VOCABULARY_FLASHCARDS
              : ActivityType.SENTENCE_FLASHCARDS,
        },
      });

      // Update user XP
      await tx.user.update({
        where: { id: user.id },
        data: { xp: { increment: xpReward } },
      });

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
