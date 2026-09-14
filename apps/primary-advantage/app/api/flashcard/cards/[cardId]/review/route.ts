// app/api/flashcards/cards/[cardId]/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from 'drizzle-orm';
import { flashcardCards, flashcardDecks, cardReviews, userActivity, xpLogs, users } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import type { TenantDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';
import { currentUser } from "@/lib/session";
import { resolveXpAward } from "@/lib/authorization";
import { fsrsService } from "@/lib/fsrs-service";
import { Rating } from "ts-fsrs";
import { ActivityType } from "@/types/enum";
import { FlashcardCard } from "@/types";

/**
 * Processes one FSRS card review and awards server-side XP.
 * @param request Request with the rating and time-spent body.
 * @param params Route params carrying the card id.
 * @returns The updated card and review log, or an error response.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization decision via the central policy. Flashcard study serves
    // any authenticated user; article:read is the matching low-privilege
    // permission (flashcards derive from articles).
    try {
      assertCan(user, "article:read", { schoolId: user.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw error;
    }

    const { rating, timeSpent } = await request.json();
    const { cardId } = await params;

    // Validate rating
    if (![1, 2, 3, 4].includes(rating)) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    // Get the card with deck join (replaces Prisma `findFirst({ where, deck.userId })`
    // and `include.deck`).
    // Both tables are REFERENTIAL (no schoolId); the join runs unscoped with
    // the caller userId owner filter. TenantDB cannot join REFERENTIAL tables.
    const tenantDb = getTenantDB({ schoolId: user.schoolId });
    const flashDb = getUnscopedDB("flashcardCards and flashcardDecks have no schoolId; scoped via deck userId owner filter");
    const [cardRow] = await flashDb.select({
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

    // Update card and create review record in a tenant-scoped transaction.
    // Shared-partial FSRS columns (due/stability/etc.) and content fields
    // (type/articleId/audioUrl/etc.) are attached via `as any` casts since
    // they aren't yet on the shared schema. The tx is a TenantDB: REFERENTIAL
    // writes use the unscoped handle, the users XP increment stays scoped.
    const result = await tenantDb.transaction(async (tx) => {
      // The wrapper passes a TenantDB here at runtime; the cast recovers
      // the unscoped handle for REFERENTIAL writes inside the transaction.
      const tenantTx = tx as unknown as TenantDB;
      const txFlashDb = tenantTx.unscoped("flashcard review writes scoped via card owner join and caller userId");
      // Update the card
      const [updated] = await txFlashDb.update(flashcardCards)
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
      const [review] = await txFlashDb.insert(cardReviews).values({
        cardId,
        rating,
        timeSpent,
        reviewedAt: new Date(),
      } as any).returning();

      const activityType =
        (card as any).type === "VOCABULARY"
          ? ActivityType.VOCABULARY_FLASHCARDS
          : ActivityType.SENTENCE_FLASHCARDS;

      // Record user activity
      await txFlashDb.insert(userActivity).values({
        userId: user.id!,
        activityType,
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

      // Award XP from the server table; callers cannot set XP.
      const xpReward = resolveXpAward(activityType);
      await txFlashDb.insert(xpLogs).values({
        userId: user.id!,
        xpEarned: xpReward,
        activityId: cardId,
        activityType,
      } as any);

      // Update user XP (replaces Prisma `{ increment: xpReward }`).
      // users is FLAT; the tenant-scoped tx confines the increment.
      await tenantTx.update(users)
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