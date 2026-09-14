import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { eq, and, lte, sql } from 'drizzle-orm';
import { flashcardDecks, flashcardCards } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';

/**
 * Returns the caller's sentence flashcard deck id when a due card exists.
 * @returns The deck id or a structured error response.
 */
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

    // Authorization decision via the central policy. Flashcard study serves
    // any authenticated user; article:read is the matching low-privilege
    // permission (flashcards derive from articles).
    try {
      assertCan(user, "article:read", { schoolId: user.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        );
      }
      throw error;
    }

    const tenantDb = getTenantDB({ schoolId: user.schoolId });
    // flashcardDecks and flashcardCards are REFERENTIAL (no schoolId);
    // scoping below uses the caller userId and deckId owner filters.
    const flashDb = getUnscopedDB("flashcardDecks and flashcardCards have no schoolId; scoped via userId and deckId owner filters");

    // Find user's sentence flashcard deck
    const [deck] = await flashDb.select().from(flashcardDecks)
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
    const dueCards = await flashDb.select({ id: flashcardCards.id })
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