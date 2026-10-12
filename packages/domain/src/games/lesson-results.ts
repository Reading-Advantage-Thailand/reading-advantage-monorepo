import { and, desc, eq, like, sql } from "drizzle-orm";
import { assertCan, AuthError, type Tenant, type UserContext } from "@reading-advantage/auth";
import { gameCompletions } from "@reading-advantage/db/schema";
import { z } from "zod";

import type { TenantDB } from "../db-contract.js";

/** The suffix of the `gameType` of a practice run of a 3D game (`<gameId>-story`). */
const STORY_SUFFIX = "-story";

/** Validated request of the lesson game results: the article of the lesson. */
export const lessonGameResultsRequestSchema = z.object({ articleId: z.string().uuid() }).strict();

/** Request accepted by the lesson game results query. */
export type LessonGameResultsRequest = z.input<typeof lessonGameResultsRequestSchema>;

/** The latest saved run of one game for one article. */
export const lessonGameResultSchema = z.object({
  gameId: z.string().min(1),
  correctAnswers: z.number().int().min(0),
  totalAttempts: z.number().int().min(0),
  xpEarned: z.number().int().min(0),
  playedAt: z.string(),
});

/** The latest run of each game for one article, and the XP of all runs of the article. */
export const lessonGameResultsSchema = z.object({
  latest: z.array(lessonGameResultSchema),
  totalXp: z.number().int().min(0),
});

/** The latest run of one game for one article. */
export type LessonGameResult = z.infer<typeof lessonGameResultSchema>;
/** Output of the lesson game results query. */
export type LessonGameResults = z.infer<typeof lessonGameResultsSchema>;

/**
 * Reads the saved runs of the caller for one article: the latest run of each game, newest first,
 * and the total server XP of all runs. A run belongs to the article when its completion metadata
 * holds `articleId` (the lesson host sets it). The read is scoped to the user and the school.
 * @param args Authenticated tenant context and the article request.
 * @returns The latest run of each game and the total XP; both are empty for an article with no run.
 * @throws {AuthError} FORBIDDEN for a user of another school or a user with no school.
 * @throws When the request is invalid.
 */
export async function getLessonGameResults({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: LessonGameResultsRequest;
}): Promise<LessonGameResults> {
  assertCan(user, "games:read:own", tenant);
  const request = lessonGameResultsRequestSchema.parse(input);
  if (!user.schoolId || user.schoolId !== tenant.schoolId) {
    throw new AuthError("The lesson is not in your school", "FORBIDDEN");
  }
  const rows = await db
    .select({
      gameType: gameCompletions.gameType,
      correctAnswers: gameCompletions.correctAnswers,
      totalAttempts: gameCompletions.totalAttempts,
      xpEarned: gameCompletions.xpEarned,
      createdAt: gameCompletions.createdAt,
    })
    .from(gameCompletions)
    .where(
      and(
        eq(gameCompletions.userId, user.id),
        like(gameCompletions.gameType, `%${STORY_SUFFIX}`),
        sql`${gameCompletions.metadata}->>'articleId' = ${request.articleId}`,
      ),
    )
    .orderBy(desc(gameCompletions.createdAt));

  const latest = new Map<string, LessonGameResult>();
  let totalXp = 0;
  for (const row of rows) {
    if (!row.gameType.endsWith(STORY_SUFFIX)) continue;
    totalXp += row.xpEarned;
    const gameId = row.gameType.slice(0, -STORY_SUFFIX.length);
    if (latest.has(gameId)) continue;
    latest.set(gameId, {
      gameId,
      correctAnswers: row.correctAnswers,
      totalAttempts: row.totalAttempts,
      xpEarned: row.xpEarned,
      playedAt: new Date(row.createdAt).toISOString(),
    });
  }
  return { latest: [...latest.values()], totalXp };
}
