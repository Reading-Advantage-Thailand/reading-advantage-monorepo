import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { flashcardDecks, userActivity, xpLogs } from "@reading-advantage/db/schema";
import { grantGpForXp } from "@reading-advantage/domain/primary-avatar";

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

/** The inputs of one finished deck game. */
export type DeckGameResult = {
  userId: string;
  schoolId: string | null;
  activityType: string;
  deckId: string;
  timer: number;
  xpEarned: number;
};

/**
 * Saves one finished deck game: the activity row, the XP log, and the GP grant. The activity row is
 * unique per user, type, and deck, so a repeat play refreshes it. As in the legacy app (bfea121),
 * each play pays its XP, so each play writes its own XP log and GP source key.
 * @param db A database handle that can write `user_activity`, `xp_logs`, and the GP ledger.
 * @param result The user, the game type, the deck, the timer, and the server-side XP award.
 * @returns Nothing; the caller adds the XP to the user.
 */
export async function recordDeckGame(db: any, result: DeckGameResult): Promise<void> {
  const details = { timer: result.timer, xp: result.xpEarned };
  const [activity] = await db.insert(userActivity).values({
    userId: result.userId,
    activityType: result.activityType,
    targetId: result.deckId,
    timer: result.timer,
    details,
    completed: true,
  }).onConflictDoUpdate({
    target: [userActivity.userId, userActivity.activityType, userActivity.targetId],
    set: { timer: result.timer, details, completed: true, updatedAt: new Date() },
  }).returning();
  const [log] = await db.insert(xpLogs).values({
    userId: result.userId,
    xpEarned: result.xpEarned,
    activityId: activity.id,
    activityType: result.activityType,
  }).returning({ id: xpLogs.id });
  await grantGpForXp({
    tx: db,
    schoolId: result.schoolId,
    userId: result.userId,
    sourceKey: `xp:${activity.id}:${log.id}`,
    activityType: result.activityType,
    xpEarned: result.xpEarned,
  });
}
