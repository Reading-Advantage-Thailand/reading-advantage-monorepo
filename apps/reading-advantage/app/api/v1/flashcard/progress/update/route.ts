import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fsrs, generatorParameters, Rating, State } from "ts-fsrs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        message: "Unauthorized",
        status: 403,
      });
    }

    const { cardId, rating, type } = await request.json();

    if (!cardId || !rating || !type) {
      return NextResponse.json({
        message: "Missing required fields: cardId, rating, type",
        status: 400,
      });
    }

    const isVocabulary = type === "vocabulary";

    // Get current card with proper typing
    let currentCard;
    if (isVocabulary) {
      currentCard = await prisma.userWordRecord.findUnique({
        where: { id: cardId },
      });
    } else {
      currentCard = await prisma.userSentenceRecord.findUnique({
        where: { id: cardId },
      });
    }

    if (!currentCard || currentCard.userId !== session.user.id) {
      return NextResponse.json({
        message: "Card not found or unauthorized",
        status: 404,
      });
    }

    // Calculate next review using FSRS
    const f = fsrs(generatorParameters());
    const now = new Date();

    const cardObj = {
      due: new Date(currentCard.due),
      stability: currentCard.stability,
      difficulty: currentCard.difficulty,
      elapsed_days: currentCard.elapsedDays,
      scheduled_days: currentCard.scheduledDays,
      reps: currentCard.reps,
      lapses: currentCard.lapses,
      state: currentCard.state as State,
      last_review: new Date(),
    };

    const schedulingInfo = f.repeat(cardObj, now);
    
    // Use the rating provided by user
    let selectedSchedule;
    switch(rating) {
      case 1: // Again
        selectedSchedule = schedulingInfo[Rating.Again];
        break;
      case 2: // Hard
        selectedSchedule = schedulingInfo[Rating.Hard];
        break;
      case 3: // Good
        selectedSchedule = schedulingInfo[Rating.Good];
        break;
      case 4: // Easy
        selectedSchedule = schedulingInfo[Rating.Easy];
        break;
      default:
        selectedSchedule = schedulingInfo[Rating.Good];
    }

    // Update card data structure to match Prisma schema
    const updateData = {
      difficulty: selectedSchedule.card.difficulty,
      due: selectedSchedule.card.due,
      elapsedDays: selectedSchedule.card.elapsed_days,
      lapses: selectedSchedule.card.lapses,
      reps: selectedSchedule.card.reps,
      scheduledDays: selectedSchedule.card.scheduled_days,
      stability: selectedSchedule.card.stability,
      state: selectedSchedule.card.state,
    };

    // Update with proper typing
    if (isVocabulary) {
      await prisma.userWordRecord.update({
        where: { id: cardId },
        data: updateData,
      });
    } else {
      await prisma.userSentenceRecord.update({
        where: { id: cardId },
        data: updateData,
      });
    }

    return NextResponse.json({
      message: "Card progress updated",
      status: 200,
    });
  } catch (error) {
    console.error("Error updating flashcard progress:", error);
    return NextResponse.json({
      message: "Internal server error",
      status: 500,
    });
  }
}
