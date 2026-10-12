import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { flashcardDecks } from "@reading-advantage/db/schema";

/** The body that the flashcard deck games post at the end of a game. */
export const flashcardGameBodySchema = z.object({
  score: z.number().finite().min(0).max(1000),
  timer: z.number().finite().min(0).max(86_400_000),
});

/** The minimal database handle that the owner check needs. */
type DeckReader = { select: (...args: never[]) => unknown };

/**
 * Reads and validates the body of a deck game result, then checks that the deck belongs to the caller.
 * @param request The request that carries the JSON body.
 * @param db A database handle that can read `flashcard_decks`.
 * @param deckId The deck id from the route.
 * @param userId The id of the signed-in user.
 * @returns The parsed body, or a 400 or 403 response that the route returns as it is.
 */
export async function parseDeckGameSubmit(
  request: Request,
  db: DeckReader,
  deckId: string,
  userId: string,
): Promise<{ score: number; timer: number } | NextResponse> {
  const parsed = flashcardGameBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input data" }, { status: 400 });
  }
  const [deck] = await (db as unknown as {
    select: (f: object) => { from: (t: unknown) => { where: (w: unknown) => { limit: (n: number) => Promise<{ id: string }[]> } } };
  })
    .select({ id: flashcardDecks.id })
    .from(flashcardDecks)
    .where(and(eq(flashcardDecks.id, deckId), eq(flashcardDecks.userId, userId)))
    .limit(1);
  if (!deck) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return parsed.data;
}
